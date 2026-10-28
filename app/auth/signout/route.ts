import {authClient} from '../../../lib/supabase/server';
import {origin} from '../../server';
export async function POST(req:Request){try{origin(req);const client=await authClient();const {error}=await client.auth.signOut();if(error)throw error;return Response.redirect(new URL('/',process.env.APP_URL||new URL(req.url).origin),303);}catch{return Response.json({error:'Kunne ikke logge ud. Prøv igen.'},{status:403});}}
