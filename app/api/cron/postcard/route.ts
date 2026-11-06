import {json,failure} from '../../../server';
import {sendPostcard} from '../../../../lib/postcard';
export async function GET(req:Request){if(!process.env.CRON_SECRET||req.headers.get('authorization')!=='Bearer '+process.env.CRON_SECRET)return json({error:'Ingen adgang.'},401);try{return json(await sendPostcard());}catch(e){return failure(e);}}
