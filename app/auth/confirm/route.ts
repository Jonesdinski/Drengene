import {authClient} from '../../../lib/supabase/server';
import {safePath} from '../../auth';
export async function GET(req:Request){const url=new URL(req.url),token_hash=url.searchParams.get('token_hash'),base=process.env.APP_URL||url.origin;if(token_hash&&url.searchParams.get('type')==='email'){const client=await authClient();const {error}=await client.auth.verifyOtp({type:'email',token_hash});if(!error)return Response.redirect(new URL(safePath(url.searchParams.get('next')||'/'),base),303);}return Response.redirect(new URL('/login?error=confirmation',base),303);}
