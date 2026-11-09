export const MAX_IMAGE_BYTES=25*1024*1024;
export const IMAGE_LIMIT_LABEL='25 MB';
export const IMAGE_MIME_TYPES=['image/jpeg','image/png','image/webp'] as const;
export type ImageMime=typeof IMAGE_MIME_TYPES[number];
export function detectImageMime(bytes:Uint8Array):ImageMime|null{
 if(bytes.length<12)return null;
 if([137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n))return 'image/png';
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 if(String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return 'image/webp';
 return null;
}
