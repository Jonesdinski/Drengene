import {authClient} from '../../../../lib/supabase/server';
import {origin} from '../../../server';
import {allowed,safePath} from '../../../auth';
import {z} from 'zod';
export async function POST(req:Request){const base=process.env.APP_URL||new URL(req.url).origin;try{origin(req);const form=await req.formData();const email=z.string().trim().email().max(254).parse(form.get('email')).toLowerCase();const next=safePath(String(form.get('next')||'/'));if(allowed(email)){const client=await authClient();const callback=new URL('/auth/callback',base);callback.searchParams.set('next',next);const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:callback.toString(),shouldCreateUser:true}});if(error)return Response.redirect(new URL('/login?error=send',base),303);}return Response.redirect(new URL('/login?sent=1',base),303);}catch{return Response.redirect(new URL('/login?error=send',base),303);}}
