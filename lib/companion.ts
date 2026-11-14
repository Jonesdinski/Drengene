import 'server-only';
import {hash} from '../app/server';
import {readChallenges} from './daily-challenges';
import {challengeDay} from './daily-challenge-catalog';

// Data for the in-game Lejrbalet Companion addon.
// WoW addons cannot make network requests, so the desktop sync app fetches this
// and writes it to Interface/AddOns/LejrbaletSync/HubData.lua. WoW loads it on login or /reload.

export const COMPANION_HEADER = '-- Lejrbalet companion data';
const MAX_WANTED = 200;
const MAX_STORY = 240;

type LuaValue = string | number | boolean | null | undefined | LuaValue[] | {[key: string]: LuaValue};

// Strings are shown in WoW font strings, where "|" starts an escape code. Doubling it shows a literal pipe.
// WoW's default fonts cover Latin-1 (æøå, ·) but not typographic dashes, quotes or ellipses.
const fontSafe: Record<string, string> = {'–': '-', '—': '-', '…': '...', '“': '"', '”': '"', '„': '"', '‘': "'", '’': "'", '→': '->', '✦': '*'};

export function luaString(value: string) {
  let out = '"';
  for (const ch of value.replace(/[–—…“”„‘’→✦]/g, c => fontSafe[c]).replace(/\|/g, '||')) {
    const code = ch.codePointAt(0)!;
    if (ch === '\\') out += '\\\\';
    else if (ch === '"') out += '\\"';
    else if (ch === '\n') out += '\\n';
    else if (code < 32 || code === 127) out += '\\' + String(code).padStart(3, '0');
    else if (code > 127) for (const byte of new TextEncoder().encode(ch)) out += '\\' + String(byte).padStart(3, '0');
    else out += ch;
  }
  return out + '"';
}

export function toLua(value: LuaValue): string {
  if (value === null || value === undefined) return 'nil';
  if (typeof value === 'string') return luaString(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw Error('Invalid number for Lua');
    return String(value);
  }
  if (Array.isArray(value)) return '{' + value.map(toLua).join(',') + '}';
  const fields = Object.entries(value)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) throw Error('Invalid Lua key');
      return k + '=' + toLua(v);
    });
  return '{' + fields.join(',') + '}';
}

// WoW stores character names with an uppercase first letter and lowercase rest.
// "gankern-firemaw" -> {name: "Gankern", realm: "Firemaw"}. Names with spaces can never match in-game.
export function wantedName(title: string) {
  const trimmed = title.trim();
  const [rawName, ...rest] = trimmed.split('-');
  const lower = rawName.trim().toLocaleLowerCase('da-DK');
  const chars = [...lower];
  const name = chars.length ? chars[0].toLocaleUpperCase('da-DK') + chars.slice(1).join('') : '';
  const realm = rest.join('-').trim();
  return {name, realm: realm || undefined, matchable: name.length >= 2 && !/\s/.test(name)};
}

// First moment of the next Danish calendar day, as a unix timestamp (handles summer time).
export function nextDanishMidnight(now = new Date()) {
  const day = challengeDay(now);
  const [y, m, d] = day.split('-').map(Number);
  let t = Date.UTC(y, m - 1, d + 1) - 3 * 3600_000;
  while (challengeDay(new Date(t)) === day) t += 15 * 60_000;
  return Math.floor(t / 1000);
}

export async function deviceOwner(tx: any, token: string) {
  const device = (await tx.unsafe(
    'SELECT id,owner FROM lejrbalet.sync_devices WHERE token_hash=$1 AND revoked IS NULL AND expires>now()',
    [await hash(token)],
  ))[0];
  if (!device) throw Error('401');
  await tx.unsafe('UPDATE lejrbalet.sync_devices SET last_seen=now() WHERE id=$1', [device.id]);
  return device.owner as string;
}

export async function companionData(tx: any, owner: string, now = new Date()) {
  const challenges = await readChallenges(tx, owner, now);
  const me = (await tx.unsafe('SELECT name FROM lejrbalet.profiles WHERE id=$1', [owner]))[0];
  const rank = challenges.leaderboard.findIndex((p: any) => p.id === owner);
  const wantedRows = await tx.unsafe(
    "SELECT e.title,e.body,e.data,p.name AS added_by FROM lejrbalet.entries e LEFT JOIN lejrbalet.profiles p ON p.id=e.owner WHERE e.kind='wanted' AND e.deleted=0 AND e.done=0 ORDER BY e.created DESC LIMIT $1",
    [MAX_WANTED],
  );
  const wanted = wantedRows.flatMap((row: any) => {
    const parsed = wantedName(row.title);
    if (!parsed.matchable) return [];
    let data: any = {};
    try { data = JSON.parse(row.data); } catch {}
    const severity = ['red', 'orange', 'yellow'].includes(data.severity) ? data.severity : 'yellow';
    const story = String(row.body || '').replace(/\s+/g, ' ').trim();
    return [{
      name: parsed.name,
      realm: parsed.realm,
      severity,
      server: typeof data.game === 'string' ? data.game.slice(0, 80) : undefined,
      story: story.length > MAX_STORY ? story.slice(0, MAX_STORY - 3) + '...' : story,
      addedBy: row.added_by || undefined,
    }];
  });
  return {
    version: 1,
    generatedAt: Math.floor(now.getTime() / 1000),
    day: challenges.day,
    validUntil: nextDanishMidnight(now),
    player: me?.name || 'Eventyrer',
    points: rank >= 0 ? challenges.leaderboard[rank].points : 0,
    rank: rank >= 0 ? rank + 1 : undefined,
    missions: challenges.mine.map((m: any) => ({
      title: m.title,
      description: m.description,
      points: m.points,
      done: !!m.completed_at,
      zone: m.zone || undefined,
      minLevel: m.minLevel ?? undefined,
      maxLevel: m.maxLevel ?? undefined,
    })),
    leaderboard: challenges.leaderboard.slice(0, 5).map((p: any) => ({name: p.name, points: p.points})),
    wanted,
  };
}

export function companionLua(data: Awaited<ReturnType<typeof companionData>>) {
  return `${COMPANION_HEADER}. Skrevet af Lejrbalet Sync-appen. Rediger ikke.\nLejrbaletHub=${toLua(data as any)}\n`;
}
