import {Swords,ShieldPlus,Sparkles,Crosshair,Leaf,Flame,Eye,HeartPulse,Hexagon} from 'lucide-react';
export function classPresentation(name=''){
 const key=name.trim().toLowerCase();
 const classes:Record<string,{Icon:typeof Swords;position:string}>={
  warrior:{Icon:Swords,position:'15% 55%'},paladin:{Icon:ShieldPlus,position:'65% 45%'},hunter:{Icon:Crosshair,position:'8% 45%'},rogue:{Icon:Eye,position:'25% 55%'},priest:{Icon:HeartPulse,position:'74% 48%'},shaman:{Icon:Hexagon,position:'84% 45%'},mage:{Icon:Sparkles,position:'72% 45%'},warlock:{Icon:Flame,position:'40% 40%'},druid:{Icon:Leaf,position:'10% 40%'}
 };
 return classes[key]||{Icon:Swords,position:'50% 50%'};
}
