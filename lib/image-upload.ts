import {readApiResponse,validateImageSize} from './http';
import {IMAGE_MIME_TYPES} from './image-limits';
/** The original image goes directly to private Storage, never through a Vercel function body. */
export async function uploadImage(file:File):Promise<string>{
 validateImageSize(file.size);
 const mime=file.type||({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'} as Record<string,string>)[file.name.split('.').pop()?.toLowerCase()||''];
 if(!IMAGE_MIME_TYPES.includes(mime as any))throw Error('Brug JPG, PNG eller WebP.');
 const start=await readApiResponse(await fetch('/api/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'start',size:file.size,mime})}));
 const form=new FormData();form.set('cacheControl','3600');form.set('',file.type===mime?file:new File([file],file.name,{type:mime}));
 const sent=await fetch(start.signedUrl,{method:'PUT',headers:{'x-upsert':'false'},body:form});
 if(!sent.ok)throw Error(sent.status===413?'Billedet er for stort. Vælg et billede på højst 25 MB.':'Billedet kunne ikke uploades. Prøv igen.');
 const done=await readApiResponse(await fetch('/api/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'finish',ticket:start.ticket})}));
 return done.id;
}
