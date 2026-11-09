import {z} from 'zod';
import {identity,origin,database,json,failure} from '../../server';
import {storage} from '../../../lib/supabase/storage';
import {MAX_IMAGE_BYTES,detectImageMime} from '../../../lib/image-limits';
import {createUploadTicket,verifyUploadTicket} from '../../../lib/upload-ticket';
export const runtime='nodejs';
async function register(id:string,owner:string,mime:string){await database().prepare('INSERT INTO uploads(id,owner,mime,created) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,owner,mime,new Date().toISOString()).run();}
export async function POST(req:Request){try{
 origin(req);const p=await identity();
 if(req.headers.get('content-type')?.includes('application/json')){
  const raw=await req.text();if(raw.length>3000)return json({error:'For meget indhold.'},413);const body=JSON.parse(raw);
  if(body.op==='start'){
   const d=z.object({op:z.literal('start'),size:z.number().int().min(12).max(MAX_IMAGE_BYTES),mime:z.enum(['image/jpeg','image/png','image/webp'])}).strict().safeParse(body);
   if(!d.success)return json({error:'Vælg JPG, PNG eller WebP på højst 25 MB.'},400);
   const id=crypto.randomUUID();const {data,error}=await storage().createSignedUploadUrl(id,{upsert:false});if(error||!data)throw Error('UPLOAD_START');
   return json({id,signedUrl:data.signedUrl,ticket:createUploadTicket(p.id,{id,size:d.data.size,mime:d.data.mime})});
  }
  const d=z.object({op:z.literal('finish'),ticket:z.string().max(1000)}).strict().parse(body);
  const ticket=verifyUploadTicket(p.id,d.ticket);
  const existing=await database().prepare('SELECT owner FROM uploads WHERE id=?').bind(ticket.id).first();
  if(existing){if(existing.owner!==p.id)throw Error('403');return json({id:ticket.id});}
  const bucket=storage();const {data,error}=await bucket.download(ticket.id);if(error||!data)return json({error:'Uploaden er ikke færdig. Prøv igen.'},409);
  if(data.size!==ticket.size||data.size>MAX_IMAGE_BYTES){await bucket.remove([ticket.id]);return json({error:'Billedets størrelse passer ikke. Upload igen (maks. 25 MB).'},400);}
  const mime=detectImageMime(new Uint8Array(await data.slice(0,12).arrayBuffer()));
  if(!mime||mime!==ticket.mime){await bucket.remove([ticket.id]);return json({error:'Brug en gyldig JPG-, PNG- eller WebP-fil.'},400);}
  await register(ticket.id,p.id,mime);return json({id:ticket.id});
 }
 // Compatibility for an already-open older page. New clients always use signed upload.
 if(Number(req.headers.get('content-length'))>4*1024*1024+10000)return json({error:'Genindlæs siden for at uploade billeder op til 25 MB.'},413);
 const form=await req.formData(),file=form.get('file');if(!(file instanceof File)||file.size>4*1024*1024||file.size<12)return json({error:'Genindlæs siden, og vælg et billede på højst 25 MB.'},400);
 const bytes=new Uint8Array(await file.arrayBuffer()),mime=detectImageMime(bytes);if(!mime)return json({error:'Brug JPG, PNG eller WebP.'},400);
 const bucket=storage(),id=crypto.randomUUID();const result=await bucket.upload(id,bytes,{contentType:mime,upsert:false});if(result.error)throw result.error;
 try{await register(id,p.id,mime);}catch(e){await bucket.remove([id]);throw e;}return json({id});
 }catch(e:any){if(e.message==='UPLOAD_TICKET')return json({error:'Uploadforbindelsen er udløbet eller ugyldig. Vælg billedet igen.'},403);if(e instanceof SyntaxError)return json({error:'Ugyldig upload.'},400);return failure(e);}}
