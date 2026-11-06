import {z} from 'zod';
import {validItemLink} from './armory';
export const professionNames=['Alchemy','Blacksmithing','Enchanting','Engineering','Herbalism','Leatherworking','Mining','Skinning','Tailoring','Cooking','Fishing','First Aid'] as const;
const stamp=z.number().int().positive().refine(n=>n<=Date.now()/1000+300);
export const skillSchema=z.object({name:z.enum(professionNames),level:z.number().int().min(0).max(1000),maxLevel:z.number().int().min(1).max(1000)}).strict().refine(v=>v.level<=v.maxLevel);
const itemSchema=z.object({slotId:z.number().int().min(1).max(19),itemId:z.number().int().min(1).max(100000000),itemLink:z.string().min(1).max(512)}).strict().refine(v=>validItemLink(v.itemLink,v.itemId));
export const gearSchema=z.object({updatedAt:stamp,items:z.array(itemSchema).max(19).refine(items=>new Set(items.map(i=>i.slotId)).size===items.length)}).strict();

export const locationSchema=z.object({zone:z.string().max(120).optional(),subZone:z.string().max(120).optional(),mapId:z.number().int().min(1).max(10000000).optional(),x:z.number().min(0).max(1).optional(),y:z.number().min(0).max(1).optional(),updatedAt:stamp}).strict().refine(v=>(v.x===undefined)===(v.y===undefined));
export const progressSchema=z.object({goldCopper:z.number().int().min(0).max(9000000000000).optional(),xp:z.number().int().min(0).max(1000000000).optional(),xpMax:z.number().int().min(0).max(1000000000).optional(),location:locationSchema.optional(),source:z.enum(['lejrbalet','flocksync']).optional()}).refine(v=>v.xp===undefined||v.xpMax===undefined||v.xpMax===0||v.xp<=v.xpMax);
