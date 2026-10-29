export const levelMilestones=[10,20,30,40,50,60];
export function journeyProgress(previous:any,next:any,now:string){
 const oldLevel=previous.level||1,level=next.level||1;
 const reached={...(previous.journeyMilestones||{})};
 if(level>oldLevel)for(const milestone of levelMilestones)if(oldLevel<milestone&&level>=milestone&&!reached['level'+milestone])reached['level'+milestone]=now;
 for(const key of ['dungeon','mount']){if(next.achievements?.includes(key)){if(!reached[key])reached[key]=now;}else if(next.achievements)delete reached[key];}
 return {...next,journeyMilestones:reached};
}
