import Image from 'next/image';
import {redirect} from 'next/navigation';
import Link from 'next/link';
import {session} from '@/lib/auth';
import {db} from '@/lib/db';
import {cop} from '@/lib/config';
import {signOut} from '@/app/actions';
function paymentLabel(status:string|undefined){switch(status){case'PENDING_PROOF':return'Pendiente de comprobante';case'PENDING_REVIEW':return'Pago en verificación';case'APPROVED':return'Pago confirmado';case'REJECTED':return'Comprobante rechazado';case'EXPIRED':return'Pago vencido';default:return status||'Sin pago manual';}}
export default async function Account(){
 const user=await session();if(!user)redirect('/login');
 const orders=await db.order.findMany({where:{userId:user.id},include:{designAssets:true,manualPayment:true},orderBy:{createdAt:'desc'}});
 return <section className="section"><p className="eyebrow">TU ESPACIO URBANPRINT</p><h1>HOLA, <em>{user.email.split('@')[0].toUpperCase()}.</em></h1><form action={signOut}><button className="button secondary">Cerrar sesión</button></form><div className="account-card"><h2>Mis pedidos</h2>{orders.length?orders.map(order=><article className="account-order" key={order.id}><div className="order-line"><b>{order.number}</b><span>{order.status}</span><b>{cop(order.total)}</b><Link href={`/seguimiento?numero=${order.number}`}>Seguimiento</Link></div>{order.manualPayment&&<p>Pago: <b>{paymentLabel(order.manualPayment.status)}</b></p>}{order.manualPayment?.rejectReason&&<p className="payment-rejection">Motivo: {order.manualPayment.rejectReason}</p>}{order.manualPayment&&['PENDING_PROOF','REJECTED'].includes(order.manualPayment.status)&&<Link className="button" href={`/pedido-confirmado?numero=${order.number}`}>Pagar / volver a subir comprobante</Link>}{order.manualPayment?.status==='PENDING_REVIEW'&&<p className="payment-state">Pago en verificación</p>}{order.manualPayment?.status==='APPROVED'&&<p className="success">Pago confirmado</p>}{order.designAssets.map(design=><div className="order-design" key={design.id}><Image src={design.frontRenderUrl||'/art/1.svg'} alt="Render frontal personalizado" width={96} height={100} unoptimized/><Image src={design.backRenderUrl||'/art/1.svg'} alt="Render posterior personalizado" width={96} height={100} unoptimized/><a href={design.originalUrl}>Archivo original</a></div>)}</article>):<p className="muted">Aún no tienes pedidos. <Link href="/catalogo">Descubre la colección ↗</Link></p>}</div></section>
}
