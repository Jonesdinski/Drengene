import {test,expect,vi} from 'vitest';
vi.mock('server-only',()=>({}));
test('weekly postcard exports a real PNG without gold or coordinates',async()=>{const {postcardImage}=await import('../lib/postcard');const response=postcardImage({week:'2026-11-02',players:3,levels:5,characters:[{name:'Eksempel',level:24}],highlights:['Eksempel nåede level 24']});const data=new Uint8Array(await response.arrayBuffer());expect([...data.slice(0,8)]).toEqual([137,80,78,71,13,10,26,10]);expect(data.length).toBeGreaterThan(5000);},20000);
