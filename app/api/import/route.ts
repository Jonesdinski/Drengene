import {z} from 'zod';
import {gearSchema,skillSchema} from '../../../lib/sync-schema';
import {identity,origin,json,failure} from '../../server';
import {connection} from '../../../lib/database';
import {journeyProgress} from '../../../lib/journey-progress';
const name=z.string().trim().min(1).max(120);
export const importSchema=z.object({characters:z.array(z.object({guid:z.string().regex(/^Player-[A-Za-z0-9-]{3,100}$/),realm:name,name,class:z.enum(['Warrior','Paladin','Hunter','Rogue','Priest','Shaman','Mage','Warlock','Druid']),level:z.number().int().min(1).max(60),capturedAt:z.number().int().positive().refine(n=>n<=Date.now()/1000+300),professions:z.array(z.enum(['Alchemy','Blacksmithing','Enchanting','Engineering','Herbalism','Leatherworking','Mining','Skinning','Tailoring'])).max(2).optional(),subProfessions:z.array(z.enum(['Cooking','Fishing','First Aid'])).max(3).optional(),professionSkills:z.array(skillSchema).max(5).refine(v=>new Set(v.map(s=>s.name)).size===v.length).optional(),gear:gearSchema.optional(),target:z.string().uuid().optional(),role:z.enum(['main','alt']).optional(),combatRole:z.enum(['Tank','DPS','Healer']).optional()}).strict()).min(1).max(25)}).strict();
// Source files are user-supplied data, not proof of in-game ownership.
// The verified hub session controls every database owner and target permission.
export async function applyImport(tx:any,owner:string,characters:z.infer<typeof importSchema>['characters']){
 await tx.unsafe('SELECT id FROM lejrbalet.profiles WHERE id=$1 FOR UPDATE',[owner]);
 const entries=await tx.unsafe("SELECT * FROM lejrbalet.entries WHERE owner=$1 AND kind='character' AND deleted=0 FOR UPDATE",[owner]);
 const seen=new Set<string>(),targets=new Set<string>();let created=0,updated=0,unchanged=0;
 for(const c of characters){
  const key=c.realm+'|'+c.guid;if(seen.has(key))throw Error('IMPORT_DUPLICATE');seen.add(key);
  const linked=entries.find((e:any)=>{const d=JSON.parse(e.data);return d.flockSync?.guid===c.guid&&d.flockSync?.realm===c.realm;});
  const entry=c.target?entries.find((e:any)=>e.id===c.target):linked;
  if(c.target&&!entry)throw Error('403');if(linked&&entry?.id!==linked.id)throw Error('IMPORT_LINKED');
  if(entry&&targets.has(entry.id))throw Error('IMPORT_DUPLICATE');if(entry)targets.add(entry.id);
  const old=entry?JSON.parse(entry.data):{};
  if(old.flockSync&&(old.flockSync.guid!==c.guid||old.flockSync.realm!==c.realm))throw Error('IMPORT_LINKED');
  if(entry&&(old.level||1)>c.level)throw Error('IMPORT_OLDER');
  if(old.flockSync?.capturedAt>=c.capturedAt){unchanged++;continue;}
  if(!entry&&(!c.role||!c.combatRole))throw Error('IMPORT_ROLE');
  const now=new Date().toISOString();const d=journeyProgress(old,{...old,class:c.class,level:c.level,...(!entry?{role:c.role,combatRole:c.combatRole}:{}),...(c.professions?.length?{professions:Array.from(new Set(c.professions))}:{}),...(c.subProfessions?.length?{subProfessions:Array.from(new Set(c.subProfessions))}:{}),...(c.professionSkills?.length?{professionSkills:[...(old.professionSkills||[]).filter((s:any)=>!c.professionSkills!.some(n=>n.name===s.name)),...c.professionSkills]}:{}),...(c.gear&&(!old.gear||c.gear.updatedAt>old.gear.updatedAt)?{gear:c.gear}:{}),flockSync:{guid:c.guid,realm:c.realm,capturedAt:c.capturedAt,importedAt:now}},now);
  const id=entry?.id||crypto.randomUUID();
  if(entry){await tx.unsafe('UPDATE lejrbalet.entries SET data=$1 WHERE id=$2 AND owner=$3',[JSON.stringify(d),id,owner]);updated++;}
  else{await tx.unsafe("INSERT INTO lejrbalet.entries(id,kind,owner,title,body,data,created) VALUES($1,'character',$2,$3,'',$4,$5)",[id,owner,c.name,JSON.stringify(d),now]);created++;}
  const message=entry?(c.level>(old.level||1)?`${entry.title} nåede level ${c.level}`:null):`tilføjede ${c.name}`;
  if(message)await tx.unsafe('INSERT INTO lejrbalet.journal(id,actor,message,created) VALUES($1,$2,$3,$4)',[crypto.randomUUID(),owner,message,now]);
 }
 return {created,updated,unchanged};
}
export async function POST(req:Request){try{origin(req);const p=await identity();if(Number(req.headers.get('content-length'))>384000)return json({error:'Importen er for stor.'},413);const raw=await req.text();if(new TextEncoder().encode(raw).length>384000)return json({error:'Importen er for stor.'},413);let body;try{body=JSON.parse(raw);}catch{return json({error:'Ugyldig import.'},400);}const d=importSchema.parse(body);const result=await connection().begin(tx=>applyImport(tx,p.id,d.characters));return json({ok:true,...result});}catch(e:any){const errors:Record<string,string>={IMPORT_DUPLICATE:'Vælg hver karakter og hvert kort højst én gang.',IMPORT_LINKED:'Karakteren er allerede knyttet. Vælg det eksisterende kort.',IMPORT_OLDER:'Importen har et lavere level end dit karakterkort. Lav en frisk scanning; ingen ændringer blev gemt.',IMPORT_ROLE:'Vælg main/alt og rolle for nye karakterer.'};return errors[e.message]?json({error:errors[e.message]},409):failure(e);}}
