import {identity,failure,database} from '../../../server';
import {storage} from '../../../../lib/supabase/storage';
export const runtime='nodejs';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){try{await identity();const {id}=await params;if(!/^[a-f0-9-]{36}$/.test(id))throw new Error('404');const upload=await database().prepare('SELECT mime FROM uploads WHERE id=?').bind(id).first();if(!upload)throw new Error('404');const {data,error}=await storage().createSignedUrl(id,60);if(error||!data)throw new Error('404');return new Response(null,{status:302,headers:{Location:data.signedUrl,'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});}catch(e){return failure(e);}}
