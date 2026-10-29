import {expect,test} from 'vitest';
import {activityItems} from '../lib/activity';
test('activity sorts real journal entries newest first and classifies level gains',()=>{
 const items=activityItems([{id:'old',name:'Spiller',message:'tilføjede Et screenshot',created:'2026-10-28T10:00:00Z'},{id:'new',name:'Spiller',message:'Karakter nåede level 20',created:'2026-10-29T10:00:00Z'}],[{title:'Et screenshot',kind:'screenshot',data:{image:'image-id'}}]);
 expect(items.map(i=>i.id)).toEqual(['new','old']);expect(items[0].category).toBe('level');expect(items[1].category).toBe('shared');expect(items[1].image).toBe('image-id');
});
test('ambiguous titles and removed entries do not attach another players screenshot',()=>{
 const journal=[{id:'1',name:'Spiller',message:'tilføjede Turen',created:'2026-10-29T10:00:00Z'}];
 const entries=[{title:'Turen',kind:'screenshot',data:{image:'a'}},{title:'Turen',kind:'screenshot',data:{image:'b'}}];
 expect(activityItems(journal,entries)[0].image).toBeUndefined();expect(activityItems(journal,[])[0].image).toBeUndefined();expect(activityItems([],entries)).toEqual([]);
});
