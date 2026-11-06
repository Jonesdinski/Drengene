export type ProfessionSkill={name:string;level:number;maxLevel:number};
export type GearItem={slotId:number;itemId:number;itemLink:string};
export type GearSnapshot={updatedAt:number;items:GearItem[]};
export const gearSlots=[
 {id:1,name:'Hoved',icon:'inv_helmet_03'},{id:2,name:'Hals',icon:'inv_jewelry_necklace_01'},
 {id:3,name:'Skuldre',icon:'inv_shoulder_09'},{id:15,name:'Ryg',icon:'inv_misc_cape_01'},
 {id:5,name:'Bryst',icon:'inv_chest_plate04'},{id:4,name:'Skjorte',icon:'inv_shirt_01'},
 {id:19,name:'Tabard',icon:'inv_shirt_guildtabard_01'},{id:9,name:'Håndled',icon:'inv_bracer_07'},
 {id:10,name:'Hænder',icon:'inv_gauntlets_04'},{id:6,name:'Bælte',icon:'inv_belt_03'},
 {id:7,name:'Ben',icon:'inv_pants_04'},{id:8,name:'Fødder',icon:'inv_boots_01'},
 {id:11,name:'Ring 1',icon:'inv_jewelry_ring_01'},{id:12,name:'Ring 2',icon:'inv_jewelry_ring_01'},
 {id:13,name:'Trinket 1',icon:'inv_misc_gem_diamond_02'},{id:14,name:'Trinket 2',icon:'inv_misc_gem_diamond_02'},
 {id:16,name:'Hovedhånd',icon:'inv_sword_04'},{id:17,name:'Offhand',icon:'inv_shield_06'},{id:18,name:'Afstand / relic',icon:'inv_weapon_bow_07'}
];
export function linkName(link:string){return /\|h\[([^\]\r\n]{1,200})\]\|h/.exec(link)?.[1];}
export function linkColor(link:string){const hex=/^\|cff([0-9a-f]{6})/i.exec(link)?.[1];return hex?'#'+hex:'#d3c6b1';}
export function validItemLink(link:unknown,itemId:number):link is string{return typeof link==='string'&&link.length>0&&link.length<=512&&Number(/(?:\|H|^)item:(\d+)/.exec(link)?.[1])===itemId;}
export function readGear(raw:any):GearSnapshot|undefined{
 if(raw==null)return;
 if(raw.updatedAt===0&&raw.items&&typeof raw.items==='object'&&Object.keys(raw.items).length===0)return;
 if(!Number.isSafeInteger(raw.updatedAt)||raw.updatedAt<=0||raw.updatedAt>Date.now()/1000+300||!raw.items||typeof raw.items!=='object')throw Error('Ugyldig gear-scanning. Scan din karakter igen.');
 const items=Object.values<any>(raw.items).map(i=>{if(!i||!Number.isInteger(i.slotId)||i.slotId<1||i.slotId>19||!Number.isInteger(i.itemId)||i.itemId<1||i.itemId>100000000||!validItemLink(i.itemLink,i.itemId))throw Error('Ugyldigt item i gear-scanningen.');return {slotId:i.slotId,itemId:i.itemId,itemLink:i.itemLink};});
 if(items.length>19||new Set(items.map(i=>i.slotId)).size!==items.length)throw Error('Gentagne gear-slots i scanningen.');
 return {updatedAt:raw.updatedAt,items};
}
