import {identity,json,failure} from '../../server';
import {tooltipText} from '../../../lib/item-display';
export async function GET(req:Request){try{
 await identity();const raw=new URL(req.url).searchParams.get('ids')||'';
 if(!/^\d{1,9}(,\d{1,9}){0,18}$/.test(raw))return json({error:'Ugyldige item-ID’er.'},400);
 const ids=[...new Set(raw.split(',').map(Number))];if(ids.some(id=>id<1||id>100000000))return json({error:'Ugyldigt item-ID.'},400);
 const items:Record<string,unknown>={};
 // Bounded parallelism; a missing/custom Forever item never blocks the gear panel.
 for(let i=0;i<ids.length;i+=4)await Promise.all(ids.slice(i,i+4).map(async id=>{try{
  const r=await fetch(`https://nether.wowhead.com/classic/tooltip/item/${id}`,{next:{revalidate:86400},signal:AbortSignal.timeout(3500)});if(!r.ok)return;const d=await r.json();
  if(typeof d.icon!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(d.icon)||typeof d.name!=='string')return;
  items[id]={name:d.name.slice(0,200),icon:d.icon.toLowerCase(),text:typeof d.tooltip==='string'?tooltipText(d.tooltip):''};
 }catch{}}));
 return json({items});
 }catch(e){return failure(e);}}
