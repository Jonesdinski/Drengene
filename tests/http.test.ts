import {expect,test} from 'vitest';
import {readApiResponse,validateImageSize} from '../lib/http';
test('rejects oversized images before sending and accepts the stated boundary',()=>{
 expect(()=>validateImageSize(4*1024*1024)).not.toThrow();
 expect(()=>validateImageSize(4*1024*1024+1)).toThrow('højst 4 MB');
});
test('handles gateway rejection without exposing a JSON parser error',async()=>{
 await expect(readApiResponse(new Response('Request Entity Too Large',{status:413}))).rejects.toThrow('højst 4 MB');
 await expect(readApiResponse(new Response('<html>Bad gateway</html>',{status:502}))).rejects.toThrow('Prøv igen');
 await expect(readApiResponse(Response.json({error:'Brug JPG, PNG eller WebP.'},{status:400}))).rejects.toThrow('Brug JPG');
 expect(await readApiResponse(Response.json({id:'upload-id'}))).toEqual({id:'upload-id'});
});
