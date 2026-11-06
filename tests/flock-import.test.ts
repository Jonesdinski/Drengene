import {test,expect,vi} from 'vitest';
import {parseFlockFile,readSavedVariables} from '../lib/flock-import';
const guid='Player-123-ABC',other='Player-123-XYZ',stamp=1700000000;
const file=`FlockSyncDB = { ["accountCharacters"] = {["${guid}"]={}}, ["characters"] = {["${guid}"]={guid="${guid}",name="Ægir",realm="Realm",classId=8,level=20,lastSeenAt=${stamp},professions={primary={[1]={name="Alchemy"},[2]={name="Cooking"}}}},["${other}"]={guid="${other}",name="Guildmate",realm="Realm",classId=1,level=30,lastSeenAt=${stamp}}}}`;
test('reads own account characters from Lua, professions and ignores guildmate data',()=>{expect(parseFlockFile(file)).toEqual([{guid,name:'Ægir',realm:'Realm',class:'Mage',level:20,capturedAt:stamp,professions:['Alchemy'],subProfessions:['Cooking']}]);});
test('rejects executable Lua, truncated files, deep tables and invalid levels',()=>{for(const value of [file+'; os.execute("bad")','FlockSyncDB = function() end',file.slice(0,-3),'FlockSyncDB='+('{x='.repeat(50))+'0'+('}'.repeat(50)),file.replace('level=20','level=99')])expect(()=>parseFlockFile(value)).toThrow();expect(()=>readSavedVariables('FlockSyncDB={__proto__={}}')).toThrow();expect(()=>parseFlockFile('FlockSyncDB={}')).toThrow();});
vi.mock('server-only',()=>({}));vi.mock('../app/auth',()=>({getUser:async()=>null}));
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
test('import preserves existing choices, enforces owner and links, is idempotent, rolls back on conflict',async()=>{
 const pg=new PGlite();try{await pg.exec('CREATE ROLE anon; CREATE ROLE authenticated;');await pg.exec(await readFile(new URL('../database/001_schema.sql',import.meta.url),'utf8'));await pg.query("INSERT INTO lejrbalet.profiles(id,auth_id,name,created) VALUES('a','auth-a','A','now'),('b','auth-b','B','now')");const exec=(tx:any):any=>({unsafe:async(q:string,v:any[]=[])=>{const r=await tx.query(q,v);return r.rows;}});
 const {applyImport,importSchema}=await import('../app/api/import/route');
 const c={...parseFlockFile(file)[0],role:'main' as const,combatRole:'DPS' as const};
 const run=(owner:string,chars:any[])=>pg.transaction(tx=>applyImport(exec(tx),owner,importSchema.parse({characters:chars}).characters));
 expect(await run('a',[c])).toMatchObject({created:1});expect(await run('a',[c])).toMatchObject({unchanged:1});
 let e:any=(await pg.query('SELECT * FROM lejrbalet.entries')).rows[0];const id=e.id;const d=JSON.parse(e.data);d.color='#00ffff';d.role='alt';await pg.query('UPDATE lejrbalet.entries SET title=$1,body=$2,data=$3 WHERE id=$4',['Mit alias','Mine noter',JSON.stringify(d),id]);
 await expect(run('b',[{...c,target:id,capturedAt:stamp+1}])).rejects.toThrow('403');
 await run('a',[{...c,target:id,level:21,capturedAt:stamp+1,professions:undefined,subProfessions:undefined}]);e=(await pg.query('SELECT * FROM lejrbalet.entries')).rows[0];expect(e.title).toBe('Mit alias');expect(e.body).toBe('Mine noter');expect(JSON.parse(e.data)).toMatchObject({level:21,color:'#00ffff',role:'alt',professions:['Alchemy']});expect((await pg.query("SELECT * FROM lejrbalet.journal WHERE message='Mit alias nåede level 21'")).rows).toHaveLength(1);
 await expect(run('a',[{...c,target:id,level:22,capturedAt:stamp+2},{...c,guid:other,target:id,level:22,capturedAt:stamp+2}])).rejects.toThrow();expect(JSON.parse(((await pg.query('SELECT data FROM lejrbalet.entries WHERE id=$1',[id])).rows[0] as any).data).level).toBe(21);
 await expect(run('a',[{...c,target:id,capturedAt:stamp+3}])).rejects.toThrow('IMPORT_OLDER');
 }finally{await pg.close();}
});

test('reads real equipped slots and skill ranks while rejecting duplicate slots and forged item links',()=>{
 const armory=file.replace('name="Alchemy"','name="Alchemy",level=150,maxLevel=225').replace('name="Cooking"','name="Cooking",level=70,maxLevel=75').replace('lastSeenAt='+stamp,`lastSeenAt=${stamp},gear={updatedAt=${stamp},items={{slotId=16,itemId=19019,itemLink="|cffff8000|Hitem:19019:0:0:0|h[Thunderfury]|h|r"}}}`);
 const c=parseFlockFile(armory)[0];expect(c.gear).toMatchObject({updatedAt:stamp,items:[{slotId:16,itemId:19019}]});expect(c.professionSkills).toEqual([{name:'Alchemy',level:150,maxLevel:225},{name:'Cooking',level:70,maxLevel:75}]);
 expect(()=>parseFlockFile(armory.replace('slotId=16','slotId=20'))).toThrow();expect(()=>parseFlockFile(armory.replace('itemId=19019','itemId=123'))).toThrow();
 const item='{slotId=16,itemId=19019,itemLink="item:19019"}';expect(()=>parseFlockFile(file.replace('lastSeenAt='+stamp,`lastSeenAt=${stamp},gear={updatedAt=${stamp},items={${item},${item}}}`))).toThrow();
});

test('gear snapshot schema rejects injection and invalid ranks; empty fresh snapshot can remove equipped gear',async()=>{
 const {importSchema}=await import('../app/api/import/route');const base={guid,realm:'Realm',name:'Char',class:'Mage',level:20,capturedAt:stamp};
 const gear={updatedAt:stamp,items:[{slotId:16,itemId:19019,itemLink:'|cffff8000|Hitem:19019:0|h[Thunderfury]|h|r'}]};
 expect(importSchema.parse({characters:[{...base,gear,professionSkills:[{name:'Alchemy',level:150,maxLevel:225}]}]}).characters[0].gear?.items).toHaveLength(1);
 for(const extra of [{gear:{...gear,items:[gear.items[0],gear.items[0]]}},{gear:{...gear,items:[{...gear.items[0],itemLink:'https://evil.test'}]}},{professionSkills:[{name:'Alchemy',level:226,maxLevel:225}]}])expect(()=>importSchema.parse({characters:[{...base,...extra}]})).toThrow();
 expect(importSchema.parse({characters:[{...base,gear:{updatedAt:stamp,items:[]}}]}).characters[0].gear?.items).toEqual([]);
});
