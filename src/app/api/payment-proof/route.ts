import {del} from '@vercel/blob';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {session} from '@/lib/auth';
import {db} from '@/lib/db';
import {recordPaymentUploadAttempt} from '@/lib/payment-upload-limit';
import {savePaymentProof} from '@/lib/uploads';

export const runtime='nodejs';
const formSchema=z.object({
 number:z.string().regex(/^UP-\d{6,12}$/),
 payerName:z.string().trim().min(2).max(120),
 bankReference:z.string().trim().min(4).max(80).transform(v=>v.replace(/\s+/g,'').toUpperCase()),
 paidAtLocal:z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
 timezoneOffset:z.coerce.number().int().min(-840).max(840),
 declaredAmount:z.coerce.number().int().min(1).max(100_000_000),
});
function requestIp(request:Request){return request.headers.get('x-real-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown'}
export async function POST(request:Request){
 const user=await session();
 if(!user)return NextResponse.json({error:'Inicia sesión para enviar el comprobante.'},{status:401});
 const length=Number(request.headers.get('content-length')||0);
 if(length>5*1024*1024+256*1024)return NextResponse.json({error:'El comprobante debe pesar máximo 5 MB.'},{status:413});
 try{
  const data=await request.formData();
  const parsed=formSchema.safeParse(Object.fromEntries([...data.entries()].filter(([key])=>key!=='file')));
  if(!parsed.success)return NextResponse.json({error:'Revisa los datos del comprobante.'},{status:400});
  const file=data.get('file');
  if(!(file instanceof File))return NextResponse.json({error:'Selecciona el comprobante.'},{status:400});
  const order=await db.order.findFirst({where:{number:parsed.data.number,userId:user.id},include:{manualPayment:true}});
  const payment=order?.manualPayment;
  if(!order||!payment||!['PENDING_PROOF','REJECTED'].includes(payment.status))return NextResponse.json({error:'Este pedido no puede recibir comprobantes ahora.'},{status:409});
  const paidAtMs=Date.parse(`${parsed.data.paidAtLocal}:00Z`)+parsed.data.timezoneOffset*60_000;
  const paidAt=new Date(paidAtMs);
  if(!Number.isFinite(paidAtMs)||paidAtMs>Date.now()+5*60_000)return NextResponse.json({error:'La fecha del pago no es válida.'},{status:400});
  if(parsed.data.declaredAmount>payment.expectedAmount*2)return NextResponse.json({error:'El monto declarado no es válido.'},{status:400});
  const usedReference=await db.payment.findUnique({where:{bankReference:parsed.data.bankReference}});
  if(usedReference&&usedReference.id!==payment.id)return NextResponse.json({error:'Esa referencia ya fue registrada en otro pago.'},{status:409});
  if(!await recordPaymentUploadAttempt(requestIp(request),order.id))return NextResponse.json({error:'Alcanzaste el límite de intentos. Intenta más tarde.'},{status:429});
  const saved=await savePaymentProof(file);
  try{
   await db.$transaction(async tx=>{
    const updated=await tx.payment.updateMany({where:{id:payment.id,status:{in:['PENDING_PROOF','REJECTED']}},data:{status:'PENDING_REVIEW',proofUrl:saved.url,payerName:parsed.data.payerName,bankReference:parsed.data.bankReference,paidAt,declaredAmount:parsed.data.declaredAmount,rejectReason:null,reviewedById:null,reviewedAt:null}});
    if(!updated.count)throw new Error('El estado del pago cambió. Recarga el pedido e intenta de nuevo.');
    await tx.order.update({where:{id:order.id},data:{paymentStatus:'PENDING_REVIEW',paymentProofUrl:saved.url,status:'Pago en verificación'}});
    await tx.paymentEvent.create({data:{paymentId:payment.id,type:'PENDING_REVIEW',actorId:user.id,note:`Comprobante recibido: ${saved.url}; pagó ${parsed.data.payerName}; ref. ${parsed.data.bankReference}; declaró ${parsed.data.declaredAmount} COP; fecha declarada ${paidAt.toISOString()}; esperado ${payment.expectedAmount} COP.`}});
   });
  }catch(error){await del(saved.url).catch(()=>undefined);throw error;}
  return NextResponse.json({url:saved.url,status:'PENDING_REVIEW'},{status:201});
 }catch(error){
  if(typeof error==='object'&&error!==null&&'code'in error&&(error as {code?:string}).code==='P2002')return NextResponse.json({error:'Esa referencia ya fue registrada en otro pago.'},{status:409});
  const message=error instanceof Error?error.message:'No se pudo guardar el comprobante.';
  return NextResponse.json({error:message},{status:400});
 }
}
