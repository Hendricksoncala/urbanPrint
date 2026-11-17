import {put} from '@vercel/blob';
import {randomUUID} from 'node:crypto';

const MAX_UPLOAD_SIZE=10*1024*1024;
const MAX_PAYMENT_PROOF_SIZE=5*1024*1024;
type ImageMime='image/png'|'image/jpeg'|'image/webp'|'image/svg+xml';

function detectImageMime(bytes:Buffer):ImageMime|null{
 if(bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return'image/png';
 if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return'image/jpeg';
 if(bytes.length>=12&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')return'image/webp';
 const head=bytes.subarray(0,4096).toString('utf8').replace(/^\uFEFF/,'').trimStart();
 if(/^(?:<\?xml[^>]*>\s*)?<svg\b/i.test(head))return'image/svg+xml';
 return null;
}
function sanitizeSvg(raw:string){
 if(/<!DOCTYPE|<!ENTITY/i.test(raw))throw new Error('SVG no válido.');
 const svg=raw.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'').replace(/<foreignObject\b[^>]*>[\s\S]*?<\/foreignObject\s*>/gi,'').replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,'').replace(/\s+(?:href|xlink:href)\s*=\s*(?:"(?!#)[^"]*"|'(?!#)[^']*'|(?:https?:|data:)[^\s>]+)/gi,'').replace(/url\(\s*(['"]?)(?:https?:|data:|\/\/)[^)]*\)/gi,'none').replace(/@import[^;]+;?/gi,'');
 if(!/<svg\b/i.test(svg)||!/<\/svg\s*>/i.test(svg))throw new Error('SVG no válido.');
 return svg;
}
function toArrayBuffer(bytes:Buffer):ArrayBuffer{return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer;}
async function upload(pathname:string,bytes:Buffer,mime:string){
 const token=process.env.BLOB_READ_WRITE_TOKEN;
 if(!token)throw new Error('El almacenamiento no está configurado: falta BLOB_READ_WRITE_TOKEN.');
 const blob=await put(pathname,toArrayBuffer(bytes),{access:'public',addRandomSuffix:false,contentType:mime,token});
 return {url:blob.url,mime,size:bytes.length};
}
export async function saveUpload(file:File){
 if(file.size<1||file.size>MAX_UPLOAD_SIZE)throw new Error('El archivo debe pesar entre 1 byte y 10 MB.');
 const bytes=Buffer.from(await file.arrayBuffer());
 const mime=detectImageMime(bytes);
 if(!mime)throw new Error('El contenido no es una imagen PNG, JPG, WebP o SVG válida.');
 const extension={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/svg+xml':'svg'}[mime];
 const safeBytes=mime==='image/svg+xml'?Buffer.from(sanitizeSvg(bytes.toString('utf8'))):bytes;
 return upload(`uploads/${randomUUID()}.${extension}`,safeBytes,mime);
}
export async function savePaymentProof(file:File){
 if(file.size<1||file.size>MAX_PAYMENT_PROOF_SIZE)throw new Error('El comprobante debe pesar máximo 5 MB.');
 const bytes=Buffer.from(await file.arrayBuffer());
 let extension:string;let mime:string;
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){extension='png';mime='image/png';}
 else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255){extension='jpg';mime='image/jpeg';}
 else if(bytes.length>=12&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'){extension='webp';mime='image/webp';}
 else if(bytes.toString('ascii',0,5)==='%PDF-'){extension='pdf';mime='application/pdf';}
 else throw new Error('El comprobante debe ser PNG, JPG, WebP o PDF válido.');
 return upload(`uploads/payment-proofs/${randomUUID()}.${extension}`,bytes,mime);
}
