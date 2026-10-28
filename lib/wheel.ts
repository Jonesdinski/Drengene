/** Keep rotating forward and place the winning segment's centre beneath the fixed top pointer. */
export function landingRotation(current:number,index:number,count:number){
 const target=(360-(index+.5)*360/count)%360;
 return current+5*360+(target-((current%360)+360)%360+360)%360;
}
