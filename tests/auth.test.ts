import {expect,test,vi,afterEach} from 'vitest';
const state=vi.hoisted(()=>({user:null as any}));
vi.mock('server-only',()=>({}));
vi.mock('../lib/supabase/server',()=>({authClient:async()=>({auth:{getUser:async()=>({data:{user:state.user},error:null})}})}));
import {getUser,safePath,allowed} from '../app/auth';
afterEach(()=>{vi.unstubAllEnvs();state.user=null;});
test('requires a server-confirmed identity and verified email, supports an explicit allowlist',async()=>{vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://test.supabase.co');vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','public');vi.stubEnv('ALLOWED_EMAILS','');expect(await getUser()).toBeNull();state.user={id:'verified-id',email:'a@example.test'};expect(await getUser()).toBeNull();state.user.email_confirmed_at=new Date().toISOString();expect((await getUser())?.userId).toBe('verified-id');vi.stubEnv('ALLOWED_EMAILS','friend@example.test');expect(await getUser()).toBeNull();vi.stubEnv('LEJRBAL_ADMIN_EMAIL','a@example.test');expect((await getUser())?.userId).toBe('verified-id');});
test('prevents cross-origin return paths',()=>{for(const path of ['https://evil.test','//evil.test','/\\evil.test','/\r\nevil'])expect(safePath(path)).toBe('/');expect(safePath('/profil')).toBe('/profil');});
