import Image from 'next/image';
import {redirect} from 'next/navigation';
import {session} from '@/lib/auth';
import {db} from '@/lib/db';
import {cop} from '@/lib/config';
import {reviewManualPayment} from '@/app/actions';

export default async function Admin(){
 const user=await session();if(!user||user.role!=='ADMIN')redirect('/login');
 const [pendingPayments,orders,quotes,products]=await Promise.all([
  db.payment.findMany({where:{status:'PENDING_REVIEW'},include:{order:{include:{user:true}},events:{include:{actor:true},orderBy:{createdAt:'asc'}}},orderBy:{createdAt:'asc'}}),
  db.order.findMany({include:{user:true,designAssets:true,paymentProofs:true},orderBy:{createdAt:'desc'}}),
  db.quote.findMany({orderBy:{createdAt:'desc'}}),
  db.product.findMany(),
 ]);
 return <section className="section">
  <p className="eyebrow">PANEL DE CONTROL</p><h1>ADMIN <em>URBANPRINT.</em></h1>
  <nav className="admin-payment-nav"><a href="#pending-payments">Pagos por verificar <b>{pendingPayments.length}</b></a><a href="#all-orders">Pedidos</a><a href="#quotes">Cotizaciones</a><a href="#inventory">Inventario</a></nav>
  <div id="pending-payments" className="admin-payment-queue">
   <h2>Pagos por verificar <span className="payment-count">{pendingPayments.length}</span></h2>
   {pendingPayments.length===0?<p className="muted">No hay comprobantes pendientes de revisión.</p>:pendingPayments.map(payment=>{
    const mismatch=payment.declaredAmount!==payment.expectedAmount;
    return <article className="admin-payment-card" key={payment.id}>
     <div className="admin-payment-heading"><div><p className="eyebrow">{payment.method} · {payment.order.number}</p><h3>{payment.order.user.name} <span>({payment.order.user.email})</span></h3></div><b>{payment.status}</b></div>
     <div className="admin-payment-facts">
      <p><span>Esperado</span><strong>{cop(payment.expectedAmount)}</strong></p>
      <p className={mismatch?'amount-mismatch':''}><span>Declarado</span><strong>{payment.declaredAmount==null?'—':cop(payment.declaredAmount)}</strong></p>
      <p><span>Pagó</span><strong>{payment.payerName||'—'}</strong></p>
      <p><span>Referencia</span><strong>{payment.bankReference||'—'}</strong></p>
      <p><span>Fecha declarada</span><strong>{payment.paidAt?new Intl.DateTimeFormat('es-CO',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Bogota'}).format(payment.paidAt):'—'}</strong></p>
     </div>
     {payment.proofUrl&&<a className="admin-proof-preview" href={payment.proofUrl} target="_blank" rel="noreferrer">{payment.proofUrl.toLowerCase().includes('.pdf')?<span>Abrir comprobante PDF ↗</span>:<Image src={payment.proofUrl} alt={`Comprobante de ${payment.order.number}`} width={520} height={650} unoptimized/>}<span>Ampliar / descargar comprobante ↗</span></a>}
     <div className="admin-review-actions">
      <form action={reviewManualPayment} className="admin-approve-form"><input type="hidden" name="paymentId" value={payment.id}/><input type="hidden" name="decision" value="approve"/><label className="check"><input type="checkbox" name="verified" value="on" required/> Verifiqué en la app que el dinero llegó</label><button className="button">Aprobar pago</button></form>
      <form action={reviewManualPayment} className="admin-reject-form"><input type="hidden" name="paymentId" value={payment.id}/><input type="hidden" name="decision" value="reject"/><label>Motivo obligatorio<input className="field" name="rejectReason" required minLength={4} maxLength={500} placeholder="Explica qué debe corregir el cliente"/></label><button className="button secondary">Rechazar y pedir nueva carga</button></form>
     </div>
     <details className="payment-audit"><summary>Historial de auditoría ({payment.events.length})</summary>{payment.events.map(event=><p key={event.id}><b>{event.type}</b> · {event.actor?.name||'Sistema'} · {new Intl.DateTimeFormat('es-CO',{dateStyle:'short',timeStyle:'short',timeZone:'America/Bogota'}).format(event.createdAt)}<br/><span>{event.note}</span></p>)}</details>
    </article>
   })}
  </div>
  <div id="all-orders"><h2>Pedidos</h2>{orders.map(order=><article className="account-order" key={order.id}><div className="order-line"><b>{order.number} · {order.user.email}</b><span>{order.status}</span><b>{cop(order.total)}</b><span>Pago: {order.paymentStatus}</span><span>{order.payment}</span></div>{order.paymentProofs.map(proof=><div className="order-design" key={proof.id}>{proof.mime==='application/pdf'?<a href={proof.url} target="_blank" rel="noreferrer">Abrir comprobante PDF ↗</a>:<Image src={proof.url} alt={`Comprobante de pago ${order.number}`} width={220} height={180} unoptimized/>}<a href={proof.url} download>Descargar comprobante ↓</a></div>)}{order.designAssets.map(design=><div className="order-design" key={design.id}><Image src={design.frontRenderUrl||'/art/1.svg'} alt="Render frontal personalizado" width={96} height={100} unoptimized/><Image src={design.backRenderUrl||'/art/1.svg'} alt="Render posterior personalizado" width={96} height={100} unoptimized/><a href={design.originalUrl} download>Descargar original ↓</a></div>)}</article>)}</div>
  <div id="quotes"><h2>Cotizaciones</h2>{quotes.map(quote=><article className="order-line" key={quote.id}><b>{quote.company} · {quote.name}</b><span>{quote.quantity} unidades · {quote.city}</span><span>{quote.email}</span></article>)}</div>
  <div id="inventory"><h2>Inventario · {products.length} diseños</h2>{products.map(product=><article className="order-line" key={product.id}><b>{product.name}</b><span>Existencias totales: {product.stock}</span><b>{cop(product.price)}</b></article>)}</div>
 </section>
}
