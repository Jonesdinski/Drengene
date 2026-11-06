import {identity,origin,json,failure} from '../../server';
import {sendPostcard} from '../../../lib/postcard';
export async function POST(req:Request){try{origin(req);const p=await identity();if(!p.admin)throw Error('403');return json(await sendPostcard());}catch(e){return failure(e);}}
