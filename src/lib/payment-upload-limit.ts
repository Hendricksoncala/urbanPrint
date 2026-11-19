import {createHmac} from 'node:crypto';
import {db} from '@/lib/db';
function isSerializationConflict(error:unknown){return typeof error==='object'&&error!==null&&'code'in error&&(error as {code?:string}).code==='P2034'}
/** Persistent limits shared across Vercel instances: 10 attempts per IP/15m and 5 per order/24h. */
export async function recordPaymentUploadAttempt(ip:string,orderId:string,now=new Date()){
 const ipHash=createHmac('sha256',process.env.AUTH_SECRET||'urbanprint-rate-limit').update(ip.slice(0,200)).digest('hex');
 for(let retry=0;retry<3;retry++){
  try{return await db.$transaction(async tx=>{
   await tx.paymentUploadAttempt.deleteMany({where:{createdAt:{lt:new Date(now.getTime()-24*60*60*1000)}}});
   const [byIp,byOrder]=await Promise.all([
    tx.paymentUploadAttempt.count({where:{ipHash,createdAt:{gte:new Date(now.getTime()-15*60*1000)}}}),
    tx.paymentUploadAttempt.count({where:{orderId,createdAt:{gte:new Date(now.getTime()-24*60*60*1000)}}}),
   ]);
   if(byIp>=10||byOrder>=5)return false;
   await tx.paymentUploadAttempt.create({data:{ipHash,orderId,createdAt:now}});
   return true;
  },{isolationLevel:'Serializable'})}catch(error){if(!isSerializationConflict(error)||retry===2)throw error;}
 }
 return false;
}
