import {z} from 'zod';
import {validItemLink} from './armory';
export const professionNames=['Alchemy','Blacksmithing','Enchanting','Engineering','Herbalism','Leatherworking','Mining','Skinning','Tailoring','Cooking','Fishing','First Aid'] as const;
const stamp=z.number().int().positive().refine(n=>n<=Date.now()/1000+300);
export const skillSchema=z.object({name:z.enum(professionNames),level:z.number().int().min(0).max(1000),maxLevel:z.number().int().min(1).max(1000)}).strict().refine(v=>v.level<=v.maxLevel);
const itemSchema=z.object({slotId:z.number().int().min(1).max(19),itemId:z.number().int().min(1).max(100000000),itemLink:z.string().min(1).max(512)}).strict().refine(v=>validItemLink(v.itemLink,v.itemId));
export const gearSchema=z.object({updatedAt:stamp,items:z.array(itemSchema).max(19).refine(items=>new Set(items.map(i=>i.slotId)).size===items.length)}).strict();
