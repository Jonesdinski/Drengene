import {createHash} from 'node:crypto';
import {z} from 'zod';
import {identity,origin,json,failure,database} from '../../server';
import {connection} from '../../../lib/database';
import {storage} from '../../../lib/supabase/storage';
import {readChallenges,completeChallenge} from '../../../lib/daily-challenges';
export const runtime='nodejs';
export async function GET(){try{const p=await identity();return json(await connection().begin(tx=>readChallenges(tx,p.id)));}catch(e){return failure(e);}}
export async function POST(req:Request){try{
 origin(req);const p=await identity();const raw=await req.text();if(raw.length>2000)return json({error:'For meget indhold.'},413);
 const d=z.object({id:z.string().uuid(),uploadId:z.string().uuid(),confirmed:z.literal(true)}).strict().parse(JSON.parse(raw));
 // Verify ownership before reading storage; clients never choose points, owner or a template.
 const c=await database().prepare('SELECT id FROM lejrbalet.daily_challenges WHERE id=? AND owner=?').bind(d.id,p.id).first();if(!c)throw Error('404');
 const u=await database().prepare('SELECT id FROM uploads WHERE id=? AND owner=?').bind(d.uploadId,p.id).first();if(!u)throw Error('403');
 const {data,error}=await storage().download(d.uploadId);if(error||!data)throw Error('404');
 if(data.size>4*1024*1024)return json({error:'Billedet må højst fylde 4 MB.'},400);
 const digest=createHash('sha256').update(new Uint8Array(await data.arrayBuffer())).digest('hex');
 return json(await connection().begin(tx=>completeChallenge(tx,p.id,d.id,d.uploadId,digest)));
 }catch(e:any){if(e instanceof SyntaxError)return json({error:'Ugyldig forespørgsel.'},400);const messages:Record<string,string>={CHALLENGE_EXPIRED:'Denne udfordring er udløbet. Hent dagens nye opgaver.',CHALLENGE_REUSED:'Du har allerede brugt dette billede som bevis. Tag et nyt screenshot til denne udfordring.'};return messages[e.message]?json({error:messages[e.message]},409):failure(e);}}
