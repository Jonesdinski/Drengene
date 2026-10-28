import 'server-only';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
export async function authClient(){const store=await cookies();return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{cookies:{getAll:()=>store.getAll(),setAll:(values)=>{try{for(const {name,value,options} of values)store.set(name,value,options);}catch{/* Server Components refresh through proxy.ts. */}}}});}
