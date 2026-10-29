export function classPresentation(name=''){
 const key=name.trim().toLowerCase();
 const classes:Record<string,{icon:string;position:string}>={
  warrior:{icon:'classicon_warrior',position:'15% 55%'},paladin:{icon:'classicon_paladin',position:'65% 45%'},hunter:{icon:'classicon_hunter',position:'8% 45%'},rogue:{icon:'classicon_rogue',position:'25% 55%'},priest:{icon:'classicon_priest',position:'74% 48%'},shaman:{icon:'classicon_shaman',position:'84% 45%'},mage:{icon:'classicon_mage',position:'72% 45%'},warlock:{icon:'classicon_warlock',position:'40% 40%'},druid:{icon:'classicon_druid',position:'10% 40%'}
 };
 return classes[key]||{icon:'inv_misc_questionmark',position:'50% 50%'};
}
