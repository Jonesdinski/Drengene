import 'server-only';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {MAX_IMAGE_BYTES} from './image-limits';
const schema=z.object({id:z.string().uuid(),size:z.number().int().min(12).max(MAX_IMAGE_BYTES),mime:z.enum(['image/png','image/jpeg','image/webp']),expires:z.number().int()}).strict();
type Ticket=z.infer<typeof schema>;
function signature(payload:string,owner:string){const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!secret)throw Error('Upload signing is not configured');return createHmac('sha256',secret).update('lejrbalet-upload-v1\n'+owner+'\n'+payload).digest();}
export function createUploadTicket(owner:string,input:Omit<Ticket,'expires'>,now=Date.now()){
 const payload=Buffer.from(JSON.stringify(schema.parse({...input,expires:now+30*60*1000}))).toString('base64url');
 return payload+'.'+signature(payload,owner).toString('base64url');
}
export function verifyUploadTicket(owner:string,ticket:string,now=Date.now()):Ticket{
 try{
 const parts=ticket.split('.');if(parts.length!==2||ticket.length>1000)throw Error();
 const [payload,mac]=parts,supplied=Buffer.from(mac,'base64url'),expected=signature(payload,owner);
 if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))throw Error();
 const value=schema.parse(JSON.parse(Buffer.from(payload,'base64url').toString('utf8')));
 if(value.expires<now||value.expires>now+30*60*1000)throw Error();return value;
 }catch{throw Error('UPLOAD_TICKET');}
}
