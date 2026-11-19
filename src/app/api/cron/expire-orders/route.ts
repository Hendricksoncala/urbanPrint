import {timingSafeEqual} from 'node:crypto';
import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
export const runtime='nodejs';
function validSecret(request:Request){const secret=process.env.CRON_SECRET;const supplied=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'';if(!secret||secret.length!==supplied.length)return false;return timingSafeEqual(Buffer.from(secret),Buffer.from(supplied))}
async function expire(){
 const now=new Date();
 const expired=await db.payment.findMany({where:{status:'PENDING_PROOF',proofDueAt:{lte:now}},select:{id:true,orderId:true,expectedAmount:true}});
 let count=0;
 for(const candidate of expired){
  await db.$transaction(async tx=>{
   const payment=await tx.payment.findUnique({where:{id:candidate.id},include:{order:true}});
   if(!payment||payment.status!=='PENDING_PROOF'||payment.proofDueAt>now)return;
   const result=await tx.payment.updateMany({where:{id:payment.id,status:'PENDING_PROOF',proofDueAt:{lte:now}},data:{status:'EXPIRED'}});
   if(!result.count)return;
   if(payment.order.stockReserved){
    const items=JSON.parse(payment.order.items) as {slug?:string;color:string;size:string;quantity:number}[];
    for(const item of items){if(!item.slug||item.slug.startsWith('custom-'))continue;const product=await tx.product.findUnique({where:{slug:item.slug},select:{id:true}});if(!product)continue;await tx.inventoryVariant.updateMany({where:{productId:product.id,color:item.color,size:item.size},data:{stock:{increment:item.quantity}}});await tx.product.update({where:{id:product.id},data:{stock:{increment:item.quantity}}});}
    await tx.order.update({where:{id:payment.orderId},data:{stockReserved:false,paymentStatus:'EXPIRED',status:'Pago expirado'}});
   }else await tx.order.update({where:{id:payment.orderId},data:{paymentStatus:'EXPIRED',status:'Pago expirado'}});
   await tx.paymentEvent.create({data:{paymentId:payment.id,type:'EXPIRED',note:`Venció el plazo de 48 horas sin comprobante. ${payment.order.stockReserved?'Se liberó el inventario reservado.':'No había inventario reservado.'}`}});
   count++;
  });
 }
 return count;
}
export async function GET(request:Request){if(!validSecret(request))return NextResponse.json({error:'No autorizado.'},{status:401});try{return NextResponse.json({expired:await expire()})}catch(error){console.error('Payment expiration cron failed',error);return NextResponse.json({error:'No se pudieron vencer los pedidos.'},{status:500})}}
