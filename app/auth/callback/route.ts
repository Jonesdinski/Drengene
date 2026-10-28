import {authClient} from '../../../lib/supabase/server';
import {safePath} from '../../auth';
export async function GET(req:Request){const url=new URL(req.url),code=url.searchParams.get('code'),base=process.env.APP_URL||url.origin;if(code){const client=await authClient();const {error}=await client.auth.exchangeCodeForSession(code);if(!error)return Response.redirect(new URL(safePath(url.searchParams.get('next')||'/'),base),303);}return Response.redirect(new URL('/login?error=callback',base),303);}
