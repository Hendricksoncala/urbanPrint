import Link from 'next/link';
import Image from 'next/image';
import {redirect,notFound} from 'next/navigation';
import {session} from '@/lib/auth';
import {db} from '@/lib/db';
import {cop} from '@/lib/config';
import ClearCart from '@/app/seguimiento/clear-cart';
import ProofUpload from './proof-upload';
import CopyValue from './copy-value';

export default async function Success({searchParams}:{searchParams:Promise<{numero?:string}>}){
 const user=await session();if(!user)redirect('/login');
 const {numero}=await searchParams;if(!numero)notFound();
 const order=await db.order.findFirst({where:{number:numero,userId:user.id},include:{manualPayment:true}});if(!order)notFound();
 const payment=order.manualPayment;
 const qr=order.payment==='Nequi (QR)';
 const bank=order.payment==='Transferencia bancaria';
 const canSubmitProof=!!payment&&['PENDING_PROOF','REJECTED'].includes(payment.status);
 return <section className="section auth-page">
  <ClearCart/><p className="eyebrow">PEDIDO RECIBIDO</p><h1>GRACIAS POR <em>EXPRESARTE.</em></h1>
  <div className="account-card"><h2>Pedido {order.number}</h2><p>Estado del pedido: <b>{order.status}</b></p><p>Total: <b>{cop(order.total)}</b></p><p>Método: {order.payment}</p><p>Entrega: {order.address}</p>
   {(qr||bank)&&payment&&<div className="manual-payment">
    <h2>Paga con Bre-B / Nequi</h2>
    <p>Abre Nequi, escanea el QR o usa la llave Bre-B. Confirma el nombre del destinatario antes de enviar.</p>
    <Image className="nequi-qr" src="/qr-nequi.png" alt="QR Bre-B y Nequi de Isabel Sandoval" width={360} height={520} unoptimized/>
    <div className="payment-recipient"><p><small>Titular</small><br/><b>{process.env.NEXT_PUBLIC_PAY_HOLDER||'Titular no configurado'}</b></p><p><small>Llave Bre-B</small><br/><b>{process.env.NEXT_PUBLIC_PAY_KEY||'Llave no configurada'}</b></p></div>
    <div className="payment-amount-panel"><div><small>MONTO EXACTO A PAGAR</small><br/><strong>{cop(payment.expectedAmount)}</strong></div><CopyValue value={String(payment.expectedAmount)} label="Copiar monto"/></div>
    <p><b>Código del pedido para el mensaje:</b> {order.number} <CopyValue value={order.number} label="Copiar código"/></p>
    <ol className="payment-howto"><li>En Nequi, escanea el QR o elige transferir a una llave Bre-B.</li><li>Verifica que el destinatario sea <b>{process.env.NEXT_PUBLIC_PAY_HOLDER||'Isabel Sandoval'}</b>.</li><li>Envía exactamente <b>{cop(payment.expectedAmount)}</b>.</li><li>En el mensaje o concepto escribe <b>{order.number}</b>.</li><li>Conserva la referencia y el comprobante; luego cárgalos en el formulario.</li></ol>
    {payment.rejectReason&&<p className="payment-rejection"><b>El comprobante anterior fue rechazado:</b> {payment.rejectReason} Puedes corregirlo y volver a enviarlo.</p>}
    {payment.status==='PENDING_REVIEW'&&<p className="payment-state" role="status">Pago en verificación. Un administrador confirmará el abono en la app de Nequi.</p>}
    {payment.status==='APPROVED'&&<p className="success">Pago confirmado. Tu pedido continuará a producción.</p>}
    {payment.status==='EXPIRED'&&<p className="error-message">El plazo de pago venció. Contacta a UrbanPrint para coordinar una nueva orden.</p>}
    {canSubmitProof&&<><h2>Sube tu comprobante</h2><ProofUpload number={order.number} amount={payment.expectedAmount} whatsapp={process.env.NEXT_PUBLIC_WHATSAPP_NUMBER||'573046129278'}/></>}
   </div>}
   {bank&&<div className="manual-payment"><h2>Transferencia bancaria</h2><p><b>Banco:</b> {process.env.BANK_NAME||'Configura BANK_NAME'}</p><p><b>Cuenta:</b> {process.env.BANK_ACCOUNT||'Configura BANK_ACCOUNT'}</p><p><b>Titular:</b> {process.env.BANK_HOLDER||process.env.NEXT_PUBLIC_PAY_HOLDER||'Configura BANK_HOLDER'}</p><p><b>Documento:</b> {process.env.BANK_DOCUMENT||'Configura BANK_DOCUMENT'}</p></div>}
   {order.payment==='Contraentrega'&&<p className="muted">Pago contraentrega solicitado. El equipo confirmará la entrega en Bucaramanga y el área metropolitana.</p>}
   {order.payment==='Wompi'&&<p className="muted">El estado de Wompi se confirma consultando la transacción desde el servidor.</p>}
   <a className="text-link" href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER||'573046129278'}?text=${encodeURIComponent(`Hola, consulta del pedido ${order.number}`)}`} target="_blank" rel="noreferrer">Contactar soporte por WhatsApp ↗</a>
  </div><p><Link href="/cuenta">Ver mis pedidos</Link></p>
 </section>
}
