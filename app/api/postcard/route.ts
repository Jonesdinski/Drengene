import {identity,failure} from '../../server';
import {postcardData,postcardImage} from '../../../lib/postcard';
export async function GET(req:Request){try{await identity();const card=await postcardData(),response=postcardImage(card);response.headers.set('Cache-Control','private, no-store');if(new URL(req.url).searchParams.has('download'))response.headers.set('Content-Disposition',`attachment; filename="Lejrbalet-${card.week}.png"`);return response;}catch(e){return failure(e);}}
