import 'server-only';
import {randomInt} from 'node:crypto';
import {dailyChallengeCatalog,eligibleTask,type ChallengeCharacter,type ChallengeTemplate} from './daily-challenge-catalog';
const categoryWeights:Record<ChallengeTemplate['category'],number>={explore:35,pvp:32,dungeon:14,social:10,profession:5,class:4};
export function weightedTask(tasks:ChallengeTemplate[],recent=new Set<string>(),random:(max:number)=>number=randomInt){
 if(!tasks.length)throw Error('CHALLENGE_NO_MATCH');
 const categories=[...new Set(tasks.map(t=>t.category))];
 function pick<T>(items:T[],weight:(x:T)=>number):T{const total=items.reduce((s,t)=>s+weight(t),0);let draw=random(total);for(const item of items){draw-=weight(item);if(draw<0)return item;}return items[items.length-1];}
 const category=pick(categories,c=>categoryWeights[c]);
 return pick(tasks.filter(t=>t.category===category),t=>Math.max(1,Math.floor(t.weight*(recent.has(t.key) && t.key !== 'alliance' ? 0.25 : 1))));
}
export function availableTasks(characters:ChallengeCharacter[],excluded=new Set<string>()){
 return dailyChallengeCatalog.filter(t=>!excluded.has(t.key)&&eligibleTask(t,characters));
}
export async function accountCharacters(tx:any,owner:string):Promise<ChallengeCharacter[]>{
 const entries=await tx.unsafe("SELECT id,title,data FROM lejrbalet.entries WHERE owner=$1 AND kind='character' AND deleted=0",[owner]);
 return entries.flatMap((e:any)=>{let d:any;try{d=JSON.parse(e.data)}catch{return [];}if(!Number.isInteger(d.level)||d.level<1||d.level>60)return [];
 const names=[...(Array.isArray(d.professions)?d.professions:[]),...(Array.isArray(d.subProfessions)?d.subProfessions:[]),...(Array.isArray(d.professionSkills)?d.professionSkills.map((s:any)=>s.name):[])].filter(n=>typeof n==='string');
 return [{id:e.id,name:e.title,level:d.level,class:typeof d.class==='string'?d.class:'',faction:d.faction==='Alliance'?'Alliance':'Horde',professions:names}];});
}
export async function recentTasks(tx:any,owner:string,day:string){return new Set<string>((await tx.unsafe('SELECT DISTINCT template FROM lejrbalet.daily_challenges WHERE owner=$1 AND day<$2::date AND day>=$2::date-3',[owner,day])).map((r:any)=>r.template));}
