import {connection} from '../../../../lib/database';
import {receiveSync} from '../../../../lib/desktop-sync';
import {json,failure} from '../../../server';
export async function POST(req:Request){try{
 // This endpoint accepts only scoped bearer credentials, never browser cookies.
 const auth=req.headers.get('authorization')||'';if(!/^Bearer ljbs1_[a-f0-9]{64}$/.test(auth))throw Error('401');
 if(Number(req.headers.get('content-length'))>64000)return json({error:'For meget indhold.'},413);
 const raw=await req.text();if(new TextEncoder().encode(raw).length>64000)return json({error:'For meget indhold.'},413);
 let data;try{data=JSON.parse(raw);}catch{return json({error:'Ugyldigt JSON.'},400);}
 const result=await connection().begin(tx=>receiveSync(tx,auth.slice(7),data));return json(result);
 }catch(e:any){if(e.message==='SYNC_LIMIT'||e.message==='SYNC_DUPLICATE')return json({error:'For mange eller gentagne karakterer.'},400);return failure(e);}}
