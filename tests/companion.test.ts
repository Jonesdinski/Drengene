import {test, expect, vi} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFile, readdir, writeFile, mkdtemp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
vi.mock('server-only', () => ({}));
vi.mock('../app/auth', () => ({getUser: async () => null}));

const lua = (() => { try { execFileSync('lua5.1', ['-v'], {stdio: 'ignore'}); return 'lua5.1'; } catch { return null; } })();

test('Lua serializer escapes quotes, control characters, UI pipes and non-ASCII', async () => {
  const {toLua, luaString} = await import('../lib/companion');
  expect(luaString('a"b\\c')).toBe('"a\\"b\\\\c"');
  expect(luaString('|cffff0000')).toBe('"||cffff0000"');
  expect(luaString('x\ny\u0001')).toBe('"x\\ny\\001"');
  expect(luaString('17–24 “Ragefire”…')).toBe('"17-24 \\"Ragefire\\"..."');
  expect(luaString('æ')).toBe('"\\195\\166"');
  expect(toLua({a: 1, b: [true, 'x'], c: undefined})).toBe('{a=1,b={true,"x"}}');
  expect(() => toLua({'bad key': 1} as any)).toThrow();
  expect(() => toLua({n: NaN})).toThrow();
});

test('WANTED names are normalised like WoW character names', async () => {
  const {wantedName} = await import('../lib/companion');
  expect(wantedName('gankern')).toEqual({name: 'Gankern', realm: undefined, matchable: true});
  expect(wantedName(' ÆGIR-Firemaw ')).toEqual({name: 'Ægir', realm: 'Firemaw', matchable: true});
  expect(wantedName('Ham fra Stranglethorn').matchable).toBe(false);
});

test('missions expire at the next Danish midnight, also in summer time', async () => {
  const {nextDanishMidnight} = await import('../lib/companion');
  expect(nextDanishMidnight(new Date('2026-11-14T12:00:00Z'))).toBe(Date.parse('2026-11-14T23:00:00Z') / 1000);
  expect(nextDanishMidnight(new Date('2026-07-10T10:00:00Z'))).toBe(Date.parse('2026-07-10T22:00:00Z') / 1000);
  expect(nextDanishMidnight(new Date('2026-11-14T23:30:00Z'))).toBe(Date.parse('2026-11-15T23:00:00Z') / 1000);
});

test('device key returns own missions and active WANTED list; revoked keys are refused', async () => {
  const pg = new PGlite();
  try {
    await pg.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
    const files = await readdir(new URL('../database/', import.meta.url));
    const order = ['001_schema.sql', '004_desktop_sync.sql', ...['daily_challenges.sql', 'challenge_refresh.sql', 'challenge_rotation.sql'].map(s => files.find(f => f.endsWith(s))!)];
    for (const f of order) await pg.exec(await readFile(new URL('../database/' + f, import.meta.url), 'utf8'));
    await pg.query("INSERT INTO lejrbalet.profiles(id,auth_id,name,created) VALUES('a','auth-a','Jonas','2026-01-01'),('b','auth-b','Ven','2026-01-02')");
    const {hash} = await import('../app/server');
    const {deviceOwner, companionData, companionLua, COMPANION_HEADER} = await import('../lib/companion');
    const token = 'ljbs1_' + 'b'.repeat(64), revoked = 'ljbs1_' + 'c'.repeat(64);
    await pg.query("INSERT INTO lejrbalet.sync_devices(id,owner,name,token_hash,expires) VALUES('d1','a','PC',$1,now()+interval '1 year'),('d2','a','Old',$2,now()+interval '1 year')", [await hash(token), await hash(revoked)]);
    await pg.query("UPDATE lejrbalet.sync_devices SET revoked=now() WHERE id='d2'");
    const entry = (id: string, owner: string, title: string, body: string, data: any, done = 0, deleted = 0) =>
      pg.query("INSERT INTO lejrbalet.entries(id,kind,owner,title,body,data,done,deleted,created) VALUES($1,'wanted',$2,$3,$4,$5,$6,$7,'2026-11-01')", [id, owner, title, body, JSON.stringify(data), done, deleted]);
    await entry('w1', 'b', 'gankern-Firemaw', 'Corpse-campede os "3 gange" |cff', {severity: 'red', game: 'WoW Forever · Firemaw'});
    await entry('w2', 'a', 'Hævnet', '', {severity: 'orange'}, 1);
    await entry('w3', 'a', 'Slettet', '', {}, 0, 1);
    await entry('w4', 'a', 'Ham med hatten', '', {});
    const exec = (tx: any): any => ({unsafe: async (q: string, v: any[] = []) => (await tx.query(q, v)).rows});
    const now = new Date('2026-11-14T12:00:00Z');
    const data: any = await pg.transaction(async tx => companionData(exec(tx), await deviceOwner(exec(tx), token), now));
    expect(data).toMatchObject({day: '2026-11-14', player: 'Jonas', points: 0, rank: 1});
    expect(data.missions).toHaveLength(3);
    expect(data.missions[0]).toMatchObject({points: 10, done: false});
    expect(data.wanted).toEqual([{name: 'Gankern', realm: 'Firemaw', severity: 'red', server: 'WoW Forever · Firemaw', story: 'Corpse-campede os "3 gange" |cff', addedBy: 'Ven'}]);
    await expect(pg.transaction(tx => deviceOwner(exec(tx), revoked))).rejects.toThrow('401');
    await expect(pg.transaction(tx => deviceOwner(exec(tx), 'ljbs1_' + 'd'.repeat(64)))).rejects.toThrow('401');
    const file = companionLua(data);
    expect(file.startsWith(COMPANION_HEADER)).toBe(true);
    if (lua) {
      // The generated file must be valid Lua 5.1 (WoW's dialect) and round-trip the values.
      const dir = await mkdtemp(join(tmpdir(), 'companion-'));
      await writeFile(join(dir, 'HubData.lua'), file);
      const out = execFileSync(lua, ['-e', `dofile([[${join(dir, 'HubData.lua')}]]) local w=LejrbaletHub.wanted[1] io.write(#LejrbaletHub.missions,'|',w.name,'|',w.story,'|',LejrbaletHub.validUntil)`]).toString();
      expect(out).toBe(`3|Gankern|Corpse-campede os "3 gange" ||cff|${Date.parse('2026-11-14T23:00:00Z') / 1000}`);
    }
  } finally {
    await pg.close();
  }
});
