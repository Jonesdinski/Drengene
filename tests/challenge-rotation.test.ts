import {test,expect,vi} from 'vitest';
import {dailyChallengeCatalog,eligibleTask,matchingCharacters,type ChallengeCharacter} from '../lib/daily-challenge-catalog';
vi.mock('server-only',()=>({}));
import {availableTasks,weightedTask} from '../lib/challenge-rotation';
const char=(level:number,overrides:Partial<ChallengeCharacter>={}):ChallengeCharacter=>({id:'a',name:'Kenneth',level,class:'Mage',faction:'Horde',professions:[],...overrides});
const task=(key:string)=>dailyChallengeCatalog.find(t=>t.key===key)!;
test('all 109 unique tasks have complete constraints and no old combat phrasing',()=>{
 expect(dailyChallengeCatalog).toHaveLength(109);expect(new Set(dailyChallengeCatalog.map(t=>t.key)).size).toBe(109);
 for(const t of dailyChallengeCatalog){expect(t.minLevel).toBeGreaterThanOrEqual(1);expect(t.maxLevel).toBeLessThanOrEqual(60);expect(t.minLevel).toBeLessThanOrEqual(t.maxLevel);expect(t.weight).toBeGreaterThan(0);expect(t.points).toBeLessThanOrEqual(200);expect(t.title+' '+t.description).not.toMatch(/besejr|besejre|nedlagt/i);}
});
test.each([[1,false],[16,false],[17,true],[24,true],[25,false],[60,false]])('Wailing Caverns at level %s is eligible=%s',(level,eligible)=>{
 expect(eligibleTask(task('dungeon-wc'),[char(level)])).toBe(eligible);
});
test('account uses real mains AND alts, not just the highest or lowest level',()=>{
 expect(eligibleTask(task('dungeon-wc'),[char(60),char(5)])).toBe(false);
 expect(eligibleTask(task('dungeon-wc'),[char(60),char(19,{id:'alt'})])).toBe(true);
 expect(availableTasks([char(19)]).some(t=>t.key==='dungeon-scholo')).toBe(false);
});
test('every requirement must match the SAME character',()=>{
 const lowPriest=char(10,{class:'Priest'}),highMage=char(50);
 expect(eligibleTask(task('class-priest'),[lowPriest,highMage])).toBe(false);
 expect(matchingCharacters(task('class-priest'),[lowPriest,highMage,char(35,{class:'Priest',id:'right'})]).map(c=>c.id)).toEqual(['right']);
});
test('zones follow faction and both ends of the recommended band',()=>{
 expect(eligibleTask(task('view-barrens-mountain'),[char(19)])).toBe(true);
 expect(eligibleTask(task('view-barrens-mountain'),[char(5)])).toBe(false);
 expect(eligibleTask(task('view-barrens-mountain'),[char(60)])).toBe(false);
 expect(eligibleTask(task('view-barrens-mountain'),[char(19,{faction:'Alliance'})])).toBe(false);
 expect(eligibleTask(task('view-westfall'),[char(15,{faction:'Alliance'})])).toBe(true);
 expect(eligibleTask(task('view-westfall'),[char(15)])).toBe(false);
});
test('professions and class tasks require a matching character; missing metadata does not invent skills',()=>{
 expect(eligibleTask(task('craft-fishing'),[char(19)])).toBe(false);
 expect(eligibleTask(task('craft-fishing'),[char(19,{professions:['Fishing']})])).toBe(true);
 expect(eligibleTask(task('class-mage'),[char(20,{class:'Warrior'})])).toBe(false);
 expect(availableTasks([]).every(t=>t.requiresCharacter===false)).toBe(true);
 expect(availableTasks([]).length).toBeGreaterThanOrEqual(5);
});
test('common Alliance targets dominate special-class and healer draws within PvP',()=>{
 let seed=7;const random=(max:number)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/4294967296*max);};
 const pvp=availableTasks([char(30)]).filter(t=>t.category==='pvp');const count:Record<string,number>={};
 for(let i=0;i<12000;i++){const t=weightedTask(pvp,new Set(),random);count[t.key]=(count[t.key]||0)+1;}
 expect(count.alliance).toBeGreaterThan(7500);expect(count['healer-hunt']).toBeLessThan(200);expect(count['pvp-mage']).toBeLessThan(350);
 expect(task('healer-hunt').points).toBe(150);expect(task('pvp-mage').points).toBe(100);expect(task('alliance').points).toBe(35);
});

test('a stale dungeon task is replaced free, uses current levels and a new Danish day creates a fresh set',async()=>{
 const {PGlite}=await import('@electric-sql/pglite');const {readFile,readdir}=await import('node:fs/promises');const {readChallenges,completeChallenge}=await import('../lib/daily-challenges');const pg=new PGlite();
 try{
 await pg.exec('CREATE ROLE anon; CREATE ROLE authenticated;');for(const f of (await readdir(new URL('../database/',import.meta.url))).filter(f=>f==='001_schema.sql'||/daily_challenges.sql$|challenge_refresh.sql$|challenge_rotation.sql$/.test(f)).sort())await pg.exec(await readFile(new URL('../database/'+f,import.meta.url),'utf8'));
 await pg.query("INSERT INTO lejrbalet.profiles(id,auth_id,name,created) VALUES('owner','auth','Kenneth','2026-01-01')");
 const charId=crypto.randomUUID();await pg.query("INSERT INTO lejrbalet.entries(id,kind,owner,title,body,data,created) VALUES($1,'character','owner','Main','',$2,'2026-01-01')",[charId,JSON.stringify({level:19,class:'Mage',faction:'Horde'})]);
 const exec=(c:any):any=>({unsafe:async(q:string,v:any[]=[])=>{const r=await c.query(q,v);return r.rows;}});
 const read=(date:Date)=>pg.transaction(tx=>readChallenges(exec(tx),'owner',date));const now=new Date('2026-11-09T20:00:00Z');const first=await read(now);
 const q=first.mine[1];await pg.query("UPDATE lejrbalet.daily_challenges SET template='dungeon-wc',title='WC',description='WC',points=45,rerolls=1 WHERE id=$1",[q.id]);
 expect((await read(now)).mine[1].template).toBe('dungeon-wc');
 await pg.query('UPDATE lejrbalet.entries SET data=$1 WHERE id=$2',[JSON.stringify({level:40,class:'Mage',faction:'Horde'}),charId]);
 // Even before refresh, an old proof cannot complete an ineligible task.
 await expect(pg.transaction(tx=>completeChallenge(exec(tx),'owner',q.id,crypto.randomUUID(),'hash',now))).rejects.toThrow('CHALLENGE_NO_MATCH');
 const repaired=await read(now);expect(repaired.mine[1].id).not.toBe(q.id);expect(repaired.mine[1].rerolls).toBe(1);expect(repaired.mine[1].template).not.toBe('dungeon-wc');
 for(const item of repaired.mine)expect(eligibleTask(task(item.template),[char(40)])).toBe(true);
 const tomorrow=await read(new Date('2026-11-09T23:00:01Z'));expect(tomorrow.day).toBe('2026-11-10');expect(tomorrow.mine.every((t:any)=>t.rerolls===0&&!t.completed_at)).toBe(true);expect(tomorrow.mine.some((t:any)=>first.mine.some((old:any)=>old.id===t.id))).toBe(false);
 }finally{await pg.close();}
});
