import type {CSSProperties} from 'react';
import manifest from '../data/wow-icons.json';
export const menuIcons:Record<string,string>={'Overblik':'inv_misc_rune_01','Vores party':'inv_bannerpvp_01','LAN & spilaftener':'inv_misc_note_01','WANTED':'ability_rogue_ambush','Kroen':'inv_drink_03','Mere':'inv_misc_bag_10'};
export const kindIcons:Record<string,string>={event:'inv_misc_note_01',character:'inv_bannerpvp_01',alt:'inv_misc_rune_01',wanted:'ability_rogue_ambush',goal:'inv_misc_map_01',poll:'inv_misc_note_01',message:'inv_drink_03',screenshot:'inv_misc_spyglass_03',loot:'inv_misc_gem_diamond_02',wheel:'inv_misc_dice_01',profile:'inv_bannerpvp_01'};
export const professionIcons:Record<string,string>={alchemy:'trade_alchemy',blacksmithing:'trade_blacksmithing',enchanting:'trade_engraving',engineering:'trade_engineering',herbalism:'trade_herbalism',leatherworking:'trade_leatherworking',mining:'trade_mining',skinning:'inv_misc_pelt_wolf_01',tailoring:'trade_tailoring',cooking:'inv_misc_food_15',fishing:'trade_fishing','first aid':'spell_holy_sealofsacrifice',archaeology:'trade_archaeology'};
export const roleIcons:Record<string,string>={Tank:'inv_shield_06',DPS:'ability_dualwield',Healer:'spell_holy_prayerofhealing'};
export default function WowIcon({name='inv_misc_questionmark',size=30,className=''}:{name?:string;size?:number;className?:string}){
 const index=manifest.names.indexOf(name),safe=index<0?manifest.names.indexOf('inv_misc_questionmark'):index;
 return <span aria-hidden="true" className={'wow-icon '+className} style={{width:size,height:size,'--wow-x':`${(safe%manifest.columns)/(manifest.columns-1)*100}%`,'--wow-y':`${Math.floor(safe/manifest.columns)/(manifest.rows-1)*100}%`,'--wow-columns':manifest.columns,'--wow-rows':manifest.rows} as CSSProperties}/>;
}
export function ProfessionList({names=[]}:{names?:string[]}){return <span className="profession-pills">{names.map(name=><span className="profession-pill" key={name}><WowIcon name={professionIcons[name.toLowerCase()]||'inv_misc_book_09'} size={22}/>{name}</span>)}</span>}
