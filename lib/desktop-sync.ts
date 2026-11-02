import 'server-only';
import {hash} from '../app/server';
import {applyImport,importSchema} from '../app/api/import/route';
export async function receiveSync(tx:any,token:string,raw:any){
 // Lock the owner before the device everywhere (same order as revoke/create).
 const initial=(await tx.unsafe('SELECT owner FROM lejrbalet.sync_devices WHERE token_hash=$1',[await hash(token)]))[0];if(!initial)throw Error('401');
 await tx.unsafe('SELECT id FROM lejrbalet.profiles WHERE id=$1 FOR UPDATE',[initial.owner]);
 const device=(await tx.unsafe('SELECT * FROM lejrbalet.sync_devices WHERE token_hash=$1 AND revoked IS NULL AND expires>now() FOR UPDATE',[await hash(token)]))[0];if(!device)throw Error('401');
 const characters=importSchema.parse(raw).characters;
 if(characters.some(c=>c.target||c.role||c.combatRole))throw Error('403');
 const keys=new Set<string>();for(const c of characters){const k=c.guid+'|'+c.realm;if(keys.has(k))throw Error('SYNC_DUPLICATE');keys.add(k);}
 const entries=await tx.unsafe("SELECT * FROM lejrbalet.entries WHERE owner=$1 AND kind='character' AND deleted=0 FOR UPDATE",[device.owner]);
 const count=Number((await tx.unsafe('SELECT count(*) AS n FROM lejrbalet.sync_inbox WHERE owner=$1',[device.owner]))[0].n);
 const existing=await tx.unsafe('SELECT guid,realm FROM lejrbalet.sync_inbox WHERE owner=$1',[device.owner]);
 if(count+characters.filter(c=>!existing.some((e:any)=>e.guid===c.guid&&e.realm===c.realm)).length>250)throw Error('SYNC_LIMIT');
 const linked=[];let pending=0,skipped=0;
 for(const c of characters){
  await tx.unsafe('INSERT INTO lejrbalet.sync_inbox(owner,guid,realm,payload,captured_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(owner,guid,realm) DO UPDATE SET payload=excluded.payload,captured_at=excluded.captured_at,received_at=now() WHERE excluded.captured_at>lejrbalet.sync_inbox.captured_at',[device.owner,c.guid,c.realm,JSON.stringify(c),c.capturedAt]);
  const entry=entries.find((e:any)=>{const d=JSON.parse(e.data);return d.flockSync?.guid===c.guid&&d.flockSync?.realm===c.realm;});
  if(!entry){pending++;continue;}
  const old=JSON.parse(entry.data);if(c.level<(old.level||1)||c.capturedAt<=old.flockSync.capturedAt){skipped++;continue;}linked.push({...c,target:entry.id});
 }
 const result=linked.length?await applyImport(tx,device.owner,linked):{created:0,updated:0,unchanged:0};
 await tx.unsafe('UPDATE lejrbalet.sync_devices SET last_seen=now() WHERE id=$1',[device.id]);
 return {ok:true,updated:result.updated,pending,skipped};
}
