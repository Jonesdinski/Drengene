export type ActivityCategory='level'|'shared'|'other';
export type ActivityItem={id:string;name:string;message:string;created:string;category:ActivityCategory;kind?:string;image?:string};
export function activityItems(journal:any[],entries:any[]):ActivityItem[]{
 return journal.map(j=>{
  const createdTitle=j.message.startsWith('tilføjede ')?j.message.slice('tilføjede '.length):null;
  const entry=createdTitle&&j.actor?entries.find(e=>e.title===createdTitle&&e.owner===j.actor):undefined;
  // Older API responses only expose the public actor name; use an exact title
  // match only when it is unambiguous, never a substring or guessed identity.
  const matches=createdTitle?entries.filter(e=>e.title===createdTitle):[];
  const source=entry||(matches.length===1?matches[0]:undefined);
  const category:ActivityCategory=/ nåede level \d+$/.test(j.message)?'level':createdTitle?'shared':'other';
  return {id:j.id,name:j.name,message:j.message,created:j.created,category,kind:source?.kind,image:source?.kind==='screenshot'?source.data?.image:undefined};
 }).sort((a,b)=>Date.parse(b.created)-Date.parse(a.created)||a.id.localeCompare(b.id));
}
