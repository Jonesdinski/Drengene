import postgres from 'postgres';
import {readFile} from 'node:fs/promises';
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL mangler i .env.local');
const sql=postgres(process.env.DATABASE_URL,{ssl:'require',prepare:false,max:1});
try{for(const name of ['001_schema.sql','002_storage.sql','003_profile_logins.sql']){const migration=await readFile(new URL('../database/'+name,import.meta.url),'utf8');await sql.begin(async tx=>{await tx.unsafe(migration);});console.log('Anvendt:',name);}}finally{await sql.end();}
