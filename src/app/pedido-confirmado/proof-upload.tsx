'use client';
import {FormEvent,useState} from 'react';
import {useRouter} from 'next/navigation';
export default function ProofUpload({number,amount,whatsapp}:{number:string;amount:number;whatsapp:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
 const [paidAt,setPaidAt]=useState(()=>{const local=new Date();local.setMinutes(local.getMinutes()-local.getTimezoneOffset());return local.toISOString().slice(0,16)});
 const router=useRouter();
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const form=event.currentTarget;const file=(new FormData(form).get('file')) as File|null;if(!file)return;
  setBusy(true);setError('');
  try{
   const body=new FormData(form);body.set('number',number);body.set('timezoneOffset',String(new Date().getTimezoneOffset()));
   const response=await fetch('/api/payment-proof',{method:'POST',body});
   const result=await response.json() as {status?:string;error?:string};
   if(!response.ok||result.status!=='PENDING_REVIEW')throw new Error(result.error||'No se pudo enviar el comprobante.');
   setDone(true);router.refresh();
  }catch(err){setError(err instanceof Error?err.message:'No se pudo enviar el comprobante.');setBusy(false)}
 }
 return <div>
  {done?<p className="success" role="status">Pago en verificación. El equipo revisará el abono en Nequi.</p>:<form className="form payment-proof-form" onSubmit={submit}>
   <label>Comprobante (imagen o PDF · máximo 5 MB)<input className="field" name="file" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" required/></label>
   <label>Nombre de quien pagó<input className="field" name="payerName" autoComplete="name" minLength={2} maxLength={120} required/></label>
   <label>Referencia del comprobante<input className="field" name="bankReference" minLength={4} maxLength={80} required placeholder="Número de aprobación o referencia"/></label>
   <label>Fecha y hora del pago<input className="field" name="paidAtLocal" type="datetime-local" value={paidAt} onChange={event=>setPaidAt(event.target.value)} required/></label>
   <label>Monto pagado (COP)<input className="field" name="declaredAmount" type="number" min={1} step={1} defaultValue={amount} required/></label>
   {error&&<p className="error-message" role="alert">{error}</p>}
   <button className="button" disabled={busy}>{busy?'ENVIANDO…':'Enviar comprobante'}</button>
  </form>}
  <a className="button secondary whatsapp-proof" href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hola, envío el comprobante del pedido ${number}. Monto: $${amount.toLocaleString('es-CO')} COP.`)}`} target="_blank" rel="noreferrer">Enviar comprobante por WhatsApp</a>
 </div>
}
