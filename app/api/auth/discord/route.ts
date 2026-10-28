import {authClient} from '../../../../lib/supabase/server';
import {origin} from '../../../server';
import {safePath} from '../../../auth';
export async function POST(req:Request){
 const base=process.env.APP_URL||new URL(req.url).origin;
 try{
  origin(req);
  const form=await req.formData(),next=safePath(String(form.get('next')||'/'));
  const callback=new URL('/auth/callback',base);callback.searchParams.set('next',next);
  const client=await authClient();
  const {data,error}=await client.auth.signInWithOAuth({provider:'discord',options:{redirectTo:callback.toString(),scopes:'identify email',skipBrowserRedirect:true}});
  if(error||!data.url)throw Error('oauth');
  return Response.redirect(data.url,303);
 }catch{return Response.redirect(new URL('/login?error=discord',base),303);}
}
