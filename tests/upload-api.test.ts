import {beforeAll,afterAll,test,expect,vi} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {MAX_IMAGE_BYTES} from '../lib/image-limits';
const state=vi.hoisted(()=>({user:null as null|{userId:string;email:string},client:null as any,objects:new Map<string,Blob>(),removed:[] as string[]}));
vi.mock('server-only',()=>({}));vi.mock('../app/auth',()=>({getUser:async()=>state.user}));
vi.mock('../lib/database',async original=>{const actual=await original<any>();return {...actual,db:actual.makeDatabase(()=>state.client)};});
vi.mock('../lib/supabase/storage',()=>({storage:()=>({createSignedUploadUrl:async(id:string)=>({data:{signedUrl:'https://storage.example.test/'+id},error:null}),download:async(id:string)=>({data:state.objects.get(id),error:null}),remove:async(ids:string[])=>{state.removed.push(...ids);for(const id of ids)state.objects.delete(id);return {error:null};}})}));
const pg=new PGlite();const exec=(c:any):any=>({unsafe:async(q:string,v:any[]=[])=>{const r=await c.query(q,v);return Object.assign(r.rows,{count:r.affectedRows});},begin:(fn:any)=>c.transaction((tx:any)=>fn(exec(tx)))});
beforeAll(async()=>{await pg.exec('CREATE ROLE anon; CREATE ROLE authenticated;');for(const f of ['001_schema.sql','003_profile_logins.sql'])await pg.exec(await readFile(new URL('../database/'+f,import.meta.url),'utf8'));state.client=exec(pg);process.env.APP_URL='https://lejrbalet.test';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-upload-signing-key';});
afterAll(()=>pg.close());
async function call(user:string|null,body:any,origin='https://lejrbalet.test'){
 state.user=user?{userId:user,email:user+'@test.invalid'}:null;const {POST}=await import('../app/api/upload/route');const r=await POST(new Request('https://lejrbalet.test/api/upload',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)}));return {status:r.status,data:await r.json()};
}
test('large signed upload is authenticated, owned, size/type verified, idempotent and not registered before finish',async()=>{
 expect((await call(null,{op:'start',size:100,mime:'image/png'})).status).toBe(401);
 expect((await call('a',{op:'start',size:100,mime:'image/png'},'https://evil.test')).status).toBe(403);
 expect((await call('a',{op:'start',size:MAX_IMAGE_BYTES+1,mime:'image/png'})).status).toBe(400);
 expect((await call('a',{op:'start',size:100,mime:'text/html'})).status).toBe(400);
 const size=8*1024*1024;const a=await call('a',{op:'start',size,mime:'image/png'});expect(a.status).toBe(200);
 expect((await pg.query('SELECT * FROM lejrbalet.uploads')).rows).toHaveLength(0);
 const bytes=new Uint8Array(size);bytes.set([137,80,78,71,13,10,26,10]);state.objects.set(a.data.id,new Blob([bytes],{type:'image/png'}));
 expect((await call('b',{op:'finish',ticket:a.data.ticket})).status).toBe(403);
 expect((await call('a',{op:'finish',ticket:a.data.ticket+'tampered'})).status).toBe(403);
 expect((await call('a',{op:'finish',ticket:a.data.ticket})).data.id).toBe(a.data.id);
 expect((await call('a',{op:'finish',ticket:a.data.ticket})).data.id).toBe(a.data.id);expect((await pg.query('SELECT * FROM lejrbalet.uploads')).rows).toHaveLength(1);
 const bad=await call('a',{op:'start',size:12,mime:'image/png'});state.objects.set(bad.data.id,new Blob(['abcdefghijkl'],{type:'image/png'}));expect((await call('a',{op:'finish',ticket:bad.data.ticket})).status).toBe(400);expect(state.removed).toContain(bad.data.id);
 const wrong=await call('a',{op:'start',size:100,mime:'image/png'});state.objects.set(wrong.data.id,new Blob([bytes.slice(0,99)]));expect((await call('a',{op:'finish',ticket:wrong.data.ticket})).status).toBe(400);
 const {createUploadTicket,verifyUploadTicket}=await import('../lib/upload-ticket');const expired=createUploadTicket('a',{id:crypto.randomUUID(),mime:'image/png',size:100},0);expect(()=>verifyUploadTicket('a',expired,31*60*1000)).toThrow('UPLOAD_TICKET');
});
