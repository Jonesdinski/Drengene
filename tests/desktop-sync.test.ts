import {test,expect,vi} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
vi.mock('server-only',()=>({}));vi.mock('../app/auth',()=>({getUser:async()=>null}));
test('scoped devices queue new characters and only update approved own links; revoked keys and stale uploads cannot write',async()=>{
 const pg=new PGlite();try{await pg.exec('CREATE ROLE anon; CREATE ROLE authenticated;');for(const f of ['001_schema.sql','004_desktop_sync.sql'])await pg.exec(await readFile(new URL('../database/'+f,import.meta.url),'utf8'));
 await pg.query("INSERT INTO lejrbalet.profiles(id,auth_id,name,created) VALUES('a','auth-a','A','now'),('b','auth-b','B','now')");
 const {hash}=await import('../app/server');const {receiveSync}=await import('../lib/desktop-sync');const {applyImport}=await import('../app/api/import/route');const token='ljbs1_'+'a'.repeat(64);
 await pg.query("INSERT INTO lejrbalet.sync_devices(id,owner,name,token_hash,expires) VALUES('device-a','a','PC',$1,now()+interval '1 year')",[await hash(token)]);
 const exec=(tx:any):any=>({unsafe:async(q:string,v:any[]=[])=>{const r=await tx.query(q,v);return r.rows;}});
 const c={guid:'Player-123-ABC',realm:'Realm',name:'Char',class:'Mage' as const,level:10,capturedAt:1700000000};
 const send=(t:string,chars:any[])=>pg.transaction(tx=>receiveSync(exec(tx),t,{characters:chars}));
 expect(await send(token,[c])).toMatchObject({pending:1,updated:0});expect((await pg.query('SELECT * FROM lejrbalet.entries')).rows).toHaveLength(0);
 await pg.transaction(tx=>applyImport(exec(tx),'a',[{...c,role:'main',combatRole:'DPS'}]));
 const gear={updatedAt:c.capturedAt+1,items:[{slotId:16,itemId:19019,itemLink:'|cffff8000|Hitem:19019:0|h[Thunderfury]|h|r'}]};
 expect(await send(token,[{...c,level:20,capturedAt:c.capturedAt+1,gear,professionSkills:[{name:'Alchemy',level:150,maxLevel:225}]}])).toMatchObject({pending:0,updated:1});
 const entry:any=(await pg.query('SELECT * FROM lejrbalet.entries')).rows[0];expect(entry.owner).toBe('a');expect(JSON.parse(entry.data)).toMatchObject({level:20,role:'main',combatRole:'DPS',gear,professionSkills:[{name:'Alchemy',level:150,maxLevel:225}]});
 // Older clients omit optional armory fields: keep the last known gear and skills.
 await send(token,[{...c,level:20,capturedAt:c.capturedAt+3}]);
 let saved=JSON.parse(((await pg.query('SELECT data FROM lejrbalet.entries')).rows[0] as any).data);expect(saved.gear).toEqual(gear);expect(saved.professionSkills[0].level).toBe(150);
 // A newer character scan cannot replace a newer gear snapshot with an old one.
 await send(token,[{...c,level:20,capturedAt:c.capturedAt+4,gear:{updatedAt:c.capturedAt,items:[]}}]);
 saved=JSON.parse(((await pg.query('SELECT data FROM lejrbalet.entries')).rows[0] as any).data);expect(saved.gear.items).toHaveLength(1);
 // Explicit empty equipment from a newer scan records an unequip.
 await send(token,[{...c,level:20,capturedAt:c.capturedAt+5,gear:{updatedAt:c.capturedAt+5,items:[]}}]);
 saved=JSON.parse(((await pg.query('SELECT data FROM lejrbalet.entries')).rows[0] as any).data);expect(saved.gear.items).toEqual([]);
 expect(await send(token,[{...c,level:5,capturedAt:c.capturedAt+2}])).toMatchObject({skipped:1,updated:0});
 await expect(send(token,[{...c,target:entry.id}])).rejects.toThrow('403');
 await expect(send(token,[c,c])).rejects.toThrow('SYNC_DUPLICATE');
 await expect(send('ljbs1_'+'b'.repeat(64),[c])).rejects.toThrow('401');
 await pg.query("UPDATE lejrbalet.sync_devices SET revoked=now() WHERE id='device-a'");await expect(send(token,[c])).rejects.toThrow('401');
 expect((await pg.query("SELECT * FROM lejrbalet.entries WHERE owner='b'")).rows).toHaveLength(0);expect((await pg.query("SELECT * FROM lejrbalet.journal WHERE message='Char nåede level 20'")).rows).toHaveLength(1);
 }finally{await pg.close();}
});
