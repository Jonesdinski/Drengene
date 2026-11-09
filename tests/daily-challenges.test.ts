import {test,expect,vi} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {challengeDay} from '../lib/daily-challenge-catalog';
vi.mock('server-only',()=>({}));
test('Danish day boundaries include summer time',()=>{
 expect(challengeDay(new Date('2026-11-09T22:59:59Z'))).toBe('2026-11-09');
 expect(challengeDay(new Date('2026-11-09T23:00:00Z'))).toBe('2026-11-10');
 expect(challengeDay(new Date('2026-07-09T22:00:00Z'))).toBe('2026-07-10');
});
test('private account quests, immutable assignment, one proof per award, gallery publishing and midnight reset',async()=>{
 const pg=new PGlite();try{
 await pg.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
 await pg.exec(await readFile(new URL('../database/001_schema.sql',import.meta.url),'utf8'));
 const filename=(await readdir(new URL('../database/',import.meta.url))).find(x=>x.endsWith('daily_challenges.sql'))!;
 await pg.exec(await readFile(new URL('../database/'+filename,import.meta.url),'utf8'));
 await pg.query("INSERT INTO lejrbalet.profiles(id,auth_id,name,created) VALUES('a','auth-a','A','2026-01-01'),('b','auth-b','B','2026-01-02')");
 const exec=(tx:any):any=>({unsafe:async(q:string,v:any[]=[])=>{const r=await tx.query(q,v);return r.rows;}});
 await pg.exec(await readFile(new URL('../database/'+(await readdir(new URL('../database/',import.meta.url))).find(x=>x.endsWith('challenge_refresh.sql')),import.meta.url),'utf8'));
 const {readChallenges,completeChallenge,refreshChallenge}=await import('../lib/daily-challenges');
 const now=new Date('2026-11-09T18:00:00Z');
 const read=(owner:string,date=now)=>pg.transaction(tx=>readChallenges(exec(tx),owner,date));
 const done=(owner:string,id:string,upload:string,hash:string,date=now,story='')=>pg.transaction(tx=>completeChallenge(exec(tx),owner,id,upload,hash,date,story));
 const a=await read('a'),b=await read('b');
 expect(a.mine).toHaveLength(3);expect(new Set(a.mine.map((x:any)=>x.template)).size).toBe(3);
 expect(a.mine[0]).toMatchObject({template:'snapshot',points:10});
 expect((await read('a')).mine).toEqual(a.mine);
 expect(JSON.stringify(b)).not.toContain(a.mine[0].id);expect(b.completed).toEqual([]);
 const u=crypto.randomUUID(),foreign=crypto.randomUUID();await pg.query('INSERT INTO lejrbalet.uploads(id,owner,mime,created) VALUES($1,$2,$3,$4),($5,$6,$3,$4)',[u,'a','image/png',now.toISOString(),foreign,'b']);
 await expect(done('b',a.mine[0].id,foreign,'proof')).rejects.toThrow('404');
 await expect(done('a',a.mine[0].id,foreign,'proof')).rejects.toThrow('403');
 await done('a',a.mine[0].id,u,'proof',now,'Min historie om sejren!');
 expect(await done('a',a.mine[0].id,u,'proof')).toMatchObject({alreadyCompleted:true});
 const shared=await read('b');expect(shared.completed).toHaveLength(1);expect(shared.completed[0].title).toBe(a.mine[0].title);expect(shared.leaderboard[0]).toMatchObject({id:'a',points:10,completed:1});
 expect(JSON.stringify(shared)).not.toContain(a.mine[1].id);
 const entries=(await pg.query('SELECT * FROM lejrbalet.entries')).rows as any[];expect(entries).toHaveLength(1);expect(entries[0].kind).toBe('screenshot');expect(entries[0].body).toBe('Min historie om sejren!');expect(shared.completed[0].story).toBe('Min historie om sejren!');expect(JSON.parse(entries[0].data).image).toBe(u);
 // Same bytes re-uploaded under a new upload ID still cannot earn more points.
 const duplicate=crypto.randomUUID();await pg.query('INSERT INTO lejrbalet.uploads(id,owner,mime,created) VALUES($1,$2,$3,$4)',[duplicate,'a','image/png',now.toISOString()]);
 await expect(done('a',a.mine[1].id,duplicate,'proof')).rejects.toThrow('CHALLENGE_REUSED');
 expect((await pg.query('SELECT * FROM lejrbalet.journal')).rows).toHaveLength(1);
 const reroll=(owner:string,id:string)=>pg.transaction(tx=>refreshChallenge(exec(tx),owner,id,now));
 await expect(reroll('b',a.mine[2].id)).rejects.toThrow('404');
 await expect(reroll('a',a.mine[0].id)).rejects.toThrow('CHALLENGE_COMPLETED');
 const first=await reroll('a',a.mine[2].id);expect(first.id).not.toBe(a.mine[2].id);
 await expect(done('a',a.mine[2].id,u,'old-dialog')).rejects.toThrow('404');
 const afterFirst=await read('a');expect(afterFirst.mine[2].rerolls).toBe(1);expect(afterFirst.mine[2].template).not.toBe(a.mine[2].template);
 const second=await reroll('a',first.id);const afterSecond=await read('a');expect(afterSecond.mine[2].rerolls).toBe(2);expect(new Set([a.mine[2].template,afterFirst.mine[2].template,afterSecond.mine[2].template]).size).toBe(3);
 await expect(reroll('a',second.id)).rejects.toThrow('CHALLENGE_REFRESH_LIMIT');
 expect((await read('a')).leaderboard[0].points).toBe(10);
 const tomorrow=new Date('2026-11-09T23:01:00Z');
 await expect(done('a',a.mine[1].id,u,'new-proof',tomorrow)).rejects.toThrow('CHALLENGE_EXPIRED');
 const next=await read('a',tomorrow);expect(next.day).toBe('2026-11-10');expect(next.mine.every((q:any)=>!q.completed_at)).toBe(true);expect(next.leaderboard[0].points).toBe(10);
 const acl=await pg.query("SELECT has_table_privilege('authenticated','lejrbalet.daily_challenges','SELECT') AS allowed");expect((acl.rows[0] as any).allowed).toBe(false);
 }finally{await pg.close();}
});
