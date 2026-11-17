import ClearCart from '@/app/seguimiento/clear-cart';
import Link from 'next/link';
import {db} from '@/lib/db';
import {wompiApiBase,wompiStatus} from '@/lib/payments';

type Transaction={id:string;status:string;reference:string;amount_in_cents:number;currency:string};
export const dynamic='force-dynamic';
export default async function PaymentResult({searchParams}:{searchParams:Promise<{id?:string}>}){
 const {id}=await searchParams;
 let message='No encontramos una transacción verificable para este pago.';
 let valid=false;let orderNumber='';let currentStatus='';
 if(id&&/^[A-Za-z0-9_-]{1,120}$/.test(id)){
  try{
   const response=await fetch(`${wompiApiBase()}/transactions/${encodeURIComponent(id)}`,{cache:'no-store'});
   if(!response.ok)throw new Error(`Wompi devolvió HTTP ${response.status}`);
   const body=await response.json() as {data?:Transaction};
   const transaction=body.data;
   if(!transaction||transaction.id!==id||transaction.currency!=='COP')throw new Error('La respuesta de la transacción no coincide.');
   const order=await db.order.findUnique({where:{paymentReference:transaction.reference}});
   if(!order||order.payment!=='Wompi'||order.paymentAmountInCents!==transaction.amount_in_cents)throw new Error('La referencia o el valor no corresponden a un pedido.');
   const mapped=wompiStatus(transaction.status);
   await db.order.update({where:{id:order.id},data:{paymentTransactionId:transaction.id,paymentStatus:mapped.paymentStatus,status:mapped.orderStatus}});
   orderNumber=order.number;currentStatus=mapped.orderStatus;valid=true;
   message=transaction.status==='APPROVED'?'El pago fue confirmado por Wompi.':['DECLINED','ERROR','VOIDED'].includes(transaction.status)?'Wompi reportó que el pago no fue aprobado.':`El pago sigue en estado ${transaction.status}.`;
  }catch(error){console.error('Wompi transaction verification failed',error);}
 }
 return <section className="section auth-page">{valid&&<ClearCart/>}<p className="eyebrow">URBANPRINT · RESULTADO DE PAGO</p><h1>{valid?'PAGO':'ESTADO DEL'} <em>{valid?'CONSULTADO.':'NO VERIFICADO.'}</em></h1><div className="account-card"><p>{message}</p>{valid&&<><p>Pedido: <b>{orderNumber}</b></p><p>Estado: <b>{currentStatus}</b></p><p className="muted">Este resultado se obtuvo consultando la transacción desde el servidor de UrbanPrint.</p></>}</div><Link className="button" href="/cuenta">Ir a mi cuenta</Link></section>
}
