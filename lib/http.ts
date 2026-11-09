import {MAX_IMAGE_BYTES} from './image-limits';
/** Platforms/proxies can return plain text or HTML before an API route is reached. */
export async function readApiResponse(response:Response){
 let data:any;
 try{data=await response.json();}catch{
  if(response.status===413)throw Error('Billedet er for stort. Vælg et billede på højst 25 MB.');
  if(response.status===401)throw Error('Dit login er udløbet. Log ind igen.');
  throw Error('Serveren kunne ikke behandle forespørgslen. Prøv igen om lidt.');
 }
 if(!response.ok)throw Error(typeof data?.error==='string'?data.error:'Handlingen kunne ikke gennemføres. Prøv igen.');
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Serveren sendte et uventet svar. Prøv igen.');
 return data;
}
export function validateImageSize(size:number){if(size>MAX_IMAGE_BYTES)throw Error('Billedet er for stort. Vælg et billede på højst 25 MB.');}
