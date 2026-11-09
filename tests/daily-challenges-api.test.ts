import {beforeAll,afterAll,test,expect,vi} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
const state=vi.hoisted(()=>({user:null as null|{userId:string;email:string},client:null as any}));
vi.mock('server-only',()=>({}));
vi.mock('../app/auth',()=>({getUser:async()=>state.user}));
vi.mock('../lib/database',async original=>{const actual=await original<any>();return {...actual,db:actual.makeDatabase(()=>state.client),connection:()=>state.client};});
vi.mock('../lib/supabase/storage',()=>({storage:()=>({download:async()=>({data:new Blob(['test evidence bytes'],{type:'image/png'}),error:null})})}));
const pg=new PGlite();const executor=(c:any):any=>({async unsafe(sql:string,args:any[]=[]){const r=await c.query(sql,args);return Object.assign(r.rows,{count:r.affectedRows});},begin:(fn:any)=>c.transaction((tx:any)=>fn(executor(tx)))});
beforeAll(async()=>{await pg.exec('CREATE ROLE anon; CREATE ROLE authenticated;');for(const f of ['001_schema.sql','003_profile_logins.sql','20261109093300_daily_challenges.sql'])await pg.exec(await readFile(new URL('../database/'+f,import.meta.url),'utf8'));await pg.exec(await readFile(new URL('../database/'+(await readdir(new URL('../database/',import.meta.url))).find(x=>x.endsWith('challenge_refresh.sql')),import.meta.url),'utf8'));state.client=executor(pg);process.env.APP_URL='https://lejrbalet.test';});
afterAll(()=>pg.close());
async function call(user:string|null,body?:any,origin='https://lejrbalet.test'){
 state.user=user?{userId:user,email:user+'@test.invalid'}:null;const api=await import('../app/api/challenges/route');const r=body?await api.POST(new Request('https://lejrbalet.test/api/challenges',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)})):await api.GET();return {status:r.status,data:await r.json()};
}
test('HTTP auth, CSRF, strict server-owned scores and proofs, private tasks and atomic gallery reward',async()=>{
 expect((await call(null)).status).toBe(401);
 const a=(await call('a')).data,b=(await call('b')).data;const owners=await pg.query('SELECT id,auth_id FROM lejrbalet.profiles');const owner=(auth:string)=>(owners.rows as any[]).find(x=>x.auth_id===auth).id;
 const uploadId=crypto.randomUUID(),foreign=crypto.randomUUID();await pg.query('INSERT INTO lejrbalet.uploads(id,owner,mime,created) VALUES($1,$2,$3,$4),($5,$6,$3,$4)',[uploadId,owner('a'),'image/png',new Date().toISOString(),foreign,owner('b')]);
 const proof={id:a.mine[0].id,uploadId,confirmed:true,story:'Jeg vandt endelig!'};
 expect((await call('a',proof,'https://evil.test')).status).toBe(403);
 expect((await call('a',{...proof,points:9999})).status).toBe(400);
 expect((await call('a',{...proof,confirmed:false})).status).toBe(400);
 expect((await call('b',{...proof,uploadId:foreign})).status).toBe(404);
 expect((await call('a',{...proof,uploadId:foreign})).status).toBe(403);
 expect((await call('a',proof)).data).toMatchObject({ok:true,points:10});
 expect((await call('a',{op:'refresh',id:a.mine[0].id})).status).toBe(409);
 expect((await call('a',proof)).data.alreadyCompleted).toBe(true);
 const after=(await call('b')).data;expect(after.mine.map((q:any)=>q.id)).toEqual(b.mine.map((q:any)=>q.id));expect(after.completed).toHaveLength(1);expect(after.completed[0].story).toBe('Jeg vandt endelig!');expect(JSON.stringify(after)).not.toContain(a.mine[1].id);
 expect(after.leaderboard.find((p:any)=>p.id===owner('a')).points).toBe(10);
 expect((await pg.query('SELECT * FROM lejrbalet.entries')).rows).toHaveLength(1);expect((await pg.query('SELECT * FROM lejrbalet.journal')).rows).toHaveLength(1);
});
