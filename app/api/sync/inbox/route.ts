import {connection} from '../../../../lib/database';
import {identity,json,failure} from '../../../server';
export async function GET(){try{const p=await identity();const rows=await connection().unsafe('SELECT payload FROM lejrbalet.sync_inbox WHERE owner=$1 ORDER BY captured_at DESC LIMIT 250',[p.id]);return json({characters:rows.map(r=>JSON.parse(r.payload))});}catch(e){return failure(e);}}
