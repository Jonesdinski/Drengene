import config from '../data/route.json';
export type Point={x:number;y:number};
export const route=[...config.waypoints].sort((a,b)=>a.order-b.order);
export function levelPoint(value:number):Point{
 const level=Math.max(1,Math.min(60,Number.isFinite(value)?value:1));
 const index=route.findIndex(p=>p.minLevel>=level);
 if(index<=0)return {x:route[index<0?route.length-1:0].x,y:route[index<0?route.length-1:0].y};
 const a=route[index-1],b=route[index],t=(level-a.minLevel)/(b.minLevel-a.minLevel);
 return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
}
export function smoothPath(points:Point[]){
 if(!points.length)return '';
 const px=(p:Point)=>({x:p.x*10,y:p.y*5.58});const ps=points.map(px);
 let d=`M ${ps[0].x} ${ps[0].y}`;
 for(let i=0;i<ps.length-1;i++){
  const a=ps[Math.max(0,i-1)],b=ps[i],c=ps[i+1],e=ps[Math.min(ps.length-1,i+2)];
  d+=` C ${b.x+(c.x-a.x)/6} ${b.y+(c.y-a.y)/6}, ${c.x-(e.x-b.x)/6} ${c.y-(e.y-b.y)/6}, ${c.x} ${c.y}`;
 }
 return d;
}
export function characterPath(level:number,lane=0){const end=Math.max(1,Math.min(60,level||1));return smoothPath([...route.filter(p=>p.minLevel<end),levelPoint(end)].map(p=>({x:p.x+lane,y:p.y})));}
export function characterColor(id:string){let hash=0;for(const ch of id)hash=(hash*31+ch.charCodeAt(0))>>>0;const h=(hash%360)/60,s=.95,l=.67,c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs(h%2-1)),m=l-c/2;const rgb=h<1?[c,x,0]:h<2?[x,c,0]:h<3?[0,c,x]:h<4?[0,x,c]:h<5?[x,0,c]:[c,0,x];return '#'+rgb.map(v=>Math.round((v+m)*255).toString(16).padStart(2,'0')).join('');}
