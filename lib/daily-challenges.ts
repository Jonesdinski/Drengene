import 'server-only';
import {accountCharacters,availableTasks,weightedTask,recentTasks} from './challenge-rotation';
import {dailyChallengeCatalog,challengeDay,eligibleTask,matchingCharacters} from './daily-challenge-catalog';
export {challengeDay};
export async function ensureChallenges(tx:any,owner:string,now=new Date()){
 await tx.unsafe('SELECT id FROM lejrbalet.profiles WHERE id=$1 FOR UPDATE',[owner]);
 const day=challengeDay(now);
 const characters=await accountCharacters(tx,owner),recent=await recentTasks(tx,owner,day);
 const existing=await tx.unsafe('SELECT * FROM lejrbalet.daily_challenges WHERE owner=$1 AND day=$2 ORDER BY slot',[owner,day]);
 if(existing.length){
  for(const c of existing){
   if(c.completed_at)continue;
   let template=dailyChallengeCatalog.find(t=>t.key===c.template);
   if(!template||!eligibleTask(template,characters)){
    const excluded=new Set<string>([...existing.map((q:any)=>q.template),...(c.seen_templates||[])]);
    const pool=availableTasks(characters,excluded);
    template=weightedTask(pool.length?pool:availableTasks(characters,new Set<string>(existing.filter((q:any)=>q.id!==c.id).map((q:any)=>q.template))),recent);
    const newId=crypto.randomUUID();
    await tx.unsafe('UPDATE lejrbalet.daily_challenges SET id=$1,seen_templates=array_append(seen_templates,template),template=$2,title=$3,description=$4,points=$5 WHERE id=$6',[newId,template.key,template.title,template.description,template.points,c.id]);
    c.id=newId;c.template=template.key;
   }else if(c.title!==template.title||c.description!==template.description||c.points!==template.points){
    await tx.unsafe('UPDATE lejrbalet.daily_challenges SET title=$1,description=$2,points=$3 WHERE id=$4',[template.title,template.description,template.points,c.id]);
   }
  }
  return day;
 }
 const selected=[dailyChallengeCatalog[0]];
 for(let slot=1;slot<3;slot++)selected.push(weightedTask(availableTasks(characters,new Set(selected.map(t=>t.key))),recent));
 for(const [slot,c] of selected.entries())await tx.unsafe('INSERT INTO lejrbalet.daily_challenges(id,owner,day,slot,template,title,description,points) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[crypto.randomUUID(),owner,day,slot,c.key,c.title,c.description,c.points]);
 return day;
}
export async function readChallenges(tx:any,owner:string,now=new Date()){
 const day=await ensureChallenges(tx,owner,now);
 const mine=await tx.unsafe('SELECT id,day::text,slot,template,title,description,points,rerolls,completed_at,upload_id,gallery_id FROM lejrbalet.daily_challenges WHERE owner=$1 AND day=$2 ORDER BY slot',[owner,day]);
 const leaderboard=await tx.unsafe('SELECT p.id,p.name,COALESCE(sum(c.points),0)::int AS points,count(c.id)::int AS completed FROM lejrbalet.profiles p LEFT JOIN lejrbalet.daily_challenges c ON c.owner=p.id AND c.completed_at IS NOT NULL GROUP BY p.id,p.name ORDER BY points DESC,completed DESC,p.created ASC,p.id');
 const completed=await tx.unsafe('SELECT c.id,c.title,c.points,c.completed_at,c.upload_id,c.gallery_id,e.body AS story,p.id AS owner,p.name FROM lejrbalet.daily_challenges c JOIN lejrbalet.profiles p ON p.id=c.owner JOIN lejrbalet.entries e ON e.id=c.gallery_id WHERE c.completed_at IS NOT NULL ORDER BY c.completed_at DESC LIMIT 12');
 const characters=await accountCharacters(tx,owner);
 const tasks=mine.map((q:any)=>{const t=dailyChallengeCatalog.find(c=>c.key===q.template);return {...q,rarity:t?.rarity||'common',minLevel:t?.minLevel,maxLevel:t?.maxLevel,zone:t?.zone,eligibleCharacters:t?matchingCharacters(t,characters).map(c=>({name:c.name,level:c.level})):[]};});
 return {day,mine:tasks,leaderboard,completed};
}
export async function completeChallenge(tx:any,owner:string,id:string,uploadId:string,evidenceHash:string,now=new Date(),story=''){
 await tx.unsafe('SELECT id FROM lejrbalet.profiles WHERE id=$1 FOR UPDATE',[owner]);
 const c=(await tx.unsafe('SELECT *,day::text AS day_key FROM lejrbalet.daily_challenges WHERE id=$1 AND owner=$2 FOR UPDATE',[id,owner]))[0];
 if(!c)throw Error('404');
 if(c.completed_at)return {ok:true,alreadyCompleted:true,points:c.points};
 if(c.day_key!==challengeDay(now))throw Error('CHALLENGE_EXPIRED');
 const template=dailyChallengeCatalog.find(t=>t.key===c.template);
 if(!template||!eligibleTask(template,await accountCharacters(tx,owner)))throw Error('CHALLENGE_NO_MATCH');
 const upload=(await tx.unsafe('SELECT id FROM lejrbalet.uploads WHERE id=$1 AND owner=$2',[uploadId,owner]))[0];
 if(!upload)throw Error('403');
 if((await tx.unsafe('SELECT id FROM lejrbalet.daily_challenges WHERE owner=$1 AND evidence_hash=$2',[owner,evidenceHash])).length)throw Error('CHALLENGE_REUSED');
 const galleryId=crypto.randomUUID(),stamp=now.toISOString();
 await tx.unsafe("INSERT INTO lejrbalet.entries(id,kind,owner,title,body,data,created) VALUES($1,'screenshot',$2,$3,$4,$5,$6)",[galleryId,owner,c.title,story.trim()||'Dagsudfordring gennemført · '+c.points+' point',JSON.stringify({image:uploadId,challenge:{id:c.id,points:c.points,day:c.day_key}}),stamp]);
 await tx.unsafe('UPDATE lejrbalet.daily_challenges SET completed_at=$1,upload_id=$2,evidence_hash=$3,gallery_id=$4 WHERE id=$5',[stamp,uploadId,evidenceHash,galleryId,c.id]);
 await tx.unsafe('INSERT INTO lejrbalet.journal(id,actor,message,created) VALUES($1,$2,$3,$4)',[crypto.randomUUID(),owner,`gennemførte dagsudfordringen “${c.title}” (+${c.points} point)`,stamp]);
 return {ok:true,points:c.points,galleryId};
}

export async function refreshChallenge(tx:any,owner:string,id:string,now=new Date()){
 await tx.unsafe('SELECT id FROM lejrbalet.profiles WHERE id=$1 FOR UPDATE',[owner]);
 const c=(await tx.unsafe('SELECT *,day::text AS day_key FROM lejrbalet.daily_challenges WHERE id=$1 AND owner=$2 FOR UPDATE',[id,owner]))[0];
 if(!c)throw Error('404');
 if(c.completed_at)throw Error('CHALLENGE_COMPLETED');
 if(c.day_key!==challengeDay(now))throw Error('CHALLENGE_EXPIRED');
 if(c.rerolls>=2)throw Error('CHALLENGE_REFRESH_LIMIT');
 const others=await tx.unsafe('SELECT template FROM lejrbalet.daily_challenges WHERE owner=$1 AND day=$2',[owner,c.day_key]);
 const excluded=new Set([...others.map((q:any)=>q.template),...(c.seen_templates||[])]);
 const characters=await accountCharacters(tx,owner);
 const choices=availableTasks(characters,excluded);
 if(!choices.length)throw Error('CHALLENGE_REFRESH_LIMIT');
 const next=weightedTask(choices,await recentTasks(tx,owner,c.day_key)),newId=crypto.randomUUID();
 // Rotate the ID so an already-open proof dialog cannot complete a replacement task.
 await tx.unsafe('UPDATE lejrbalet.daily_challenges SET id=$1,seen_templates=array_append(seen_templates,template),template=$2,title=$3,description=$4,points=$5,rerolls=rerolls+1 WHERE id=$6',[newId,next.key,next.title,next.description,next.points,c.id]);
 return {ok:true,id:newId};
}
