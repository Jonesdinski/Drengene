import {expect,test,vi} from 'vitest';
import {uploadImage} from '../lib/image-upload';
import {MAX_IMAGE_BYTES} from '../lib/image-limits';
test('25 MB image is uploaded to signed Storage directly; Vercel receives small JSON only',async()=>{
 const calls:{url:string;body:any;method:string}[]=[];
 vi.stubGlobal('fetch',vi.fn(async(url:string,options:any)=>{calls.push({url,body:options.body,method:options.method});if(url==='/api/upload'){const b=JSON.parse(options.body);return b.op==='start'?Response.json({signedUrl:'https://storage.example.test/signed',ticket:'receipt'}):Response.json({id:'saved-id'});}return Response.json({ok:true});}));
 try{
 const file=new File([new Uint8Array(MAX_IMAGE_BYTES)],'screenshot.png',{type:'image/png'});expect(await uploadImage(file)).toBe('saved-id');
 expect(calls.map(c=>c.method)).toEqual(['POST','PUT','POST']);expect(calls[1].body).toBeInstanceOf(FormData);expect((calls[1].body.get('') as File).size).toBe(MAX_IMAGE_BYTES);
 expect(calls.filter(c=>c.url==='/api/upload').every(c=>typeof c.body==='string'&&c.body.length<1500)).toBe(true);
 expect(JSON.parse(calls[0].body)).toMatchObject({size:MAX_IMAGE_BYTES,mime:'image/png'});
 await expect(uploadImage(new File([new Uint8Array(MAX_IMAGE_BYTES+1)],'big.png',{type:'image/png'}))).rejects.toThrow('25 MB');expect(calls).toHaveLength(3);
 }finally{vi.unstubAllGlobals();}
});
