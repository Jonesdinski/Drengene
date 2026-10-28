import {expect,test,vi,afterEach} from 'vitest';
const state=vi.hoisted(()=>({calls:[] as any[],error:null as any}));
vi.mock('server-only',()=>({}));
vi.mock('../lib/supabase/server',()=>({authClient:async()=>({auth:{signInWithOAuth:async(args:any)=>{state.calls.push(args);return {data:{url:'https://discord.com/oauth2/authorize?client_id=test'},error:state.error}}}})}));
import {POST} from '../app/api/auth/discord/route';
afterEach(()=>{state.calls=[];state.error=null;vi.unstubAllEnvs()});
function request(next:string,origin='https://hub.test'){return new Request('https://hub.test/api/auth/discord',{method:'POST',headers:{origin},body:new URLSearchParams({next})});}
test('uses server OAuth with PKCE callback, minimal scopes and safe destination',async()=>{
 vi.stubEnv('APP_URL','https://hub.test');
 const r=await POST(request('/profil'));expect(r.status).toBe(303);expect(r.headers.get('location')).toContain('https://discord.com/oauth2/authorize');
 expect(state.calls[0]).toMatchObject({provider:'discord',options:{redirectTo:'https://hub.test/auth/callback?next=%2Fprofil',scopes:'identify email',skipBrowserRedirect:true}});
 await POST(request('https://evil.test'));expect(state.calls[1].options.redirectTo).toBe('https://hub.test/auth/callback?next=%2F');
});
test('rejects cross-origin starts and shows a safe error if provider is unavailable',async()=>{
 vi.stubEnv('APP_URL','https://hub.test');
 expect((await POST(request('/','https://evil.test'))).headers.get('location')).toBe('https://hub.test/login?error=discord');expect(state.calls).toHaveLength(0);
 state.error={message:'private provider credentials'};const r=await POST(request('/'));expect(r.headers.get('location')).toBe('https://hub.test/login?error=discord');
});
