import 'server-only';
import {db as postgresDb} from '../lib/database';
import {getUser} from './auth';
export const database=()=>postgresDb;
export async function identity(){const u=await getUser();if(!u)throw new Error('401');const db=database();const linked:any=await db.prepare('SELECT profile_id,is_admin FROM profile_logins WHERE auth_id=?').bind(u.userId).first();let p:any;
if(linked){p=await db.prepare('SELECT id,name,bio,avatar,created FROM profiles WHERE id=?').bind(linked.profile_id).first();if(!p)throw new Error('401');}
else{await db.prepare('INSERT INTO profiles (id,auth_id,name,bio,created) VALUES (?,?,?,\'\',?) ON CONFLICT(auth_id) DO NOTHING').bind(crypto.randomUUID(),u.userId,'Eventyrer',new Date().toISOString()).run();p=await db.prepare('SELECT id,name,bio,avatar,created FROM profiles WHERE auth_id=?').bind(u.userId).first();}
return {...p,admin:linked?.is_admin===true||!!process.env.LEJRBAL_ADMIN_EMAIL&&u.email.toLowerCase()===process.env.LEJRBAL_ADMIN_EMAIL.toLowerCase()};}

export function origin(req:Request){if(req.headers.get('origin')!==(process.env.APP_URL?new URL(process.env.APP_URL).origin:new URL(req.url).origin))throw new Error('403');}
export const json=(data:any,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export function failure(e:any){if(['401','403','404'].includes(e.message))return json({error:e.message==='401'?'Log ind for at deltage.':e.message==='403'?'Du har ikke adgang til denne handling.':'Indholdet blev ikke fundet.'},Number(e.message));if(e.name==='ZodError')return json({error:'Kontrollér felterne. Navn, tekst eller dato er ugyldig.'},400);console.error('Lejrbalet API error', {code: typeof e?.code==='string' && /^[A-Z0-9_]{1,40}$/.test(e.code) ? e.code : 'INTERNAL_ERROR'});return json({error:'Handlingen kunne ikke gemmes. Prøv igen.'},500);}
export const log=(p:any,message:string)=>database().prepare('INSERT INTO journal (id,actor,message,created) VALUES (?,?,?,?)').bind(crypto.randomUUID(),p.id,message,new Date().toISOString());
export async function hash(s:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
