'use server';
import {z} from 'zod';
import bcrypt from 'bcryptjs';
import {db} from '@/lib/db';
import {setSession,session} from '@/lib/auth';
import {redirect} from 'next/navigation';
import {config} from '@/lib/config';
import {cookies} from 'next/headers';

export async function register(form:FormData){
 const v=z.object({name:z.string().trim().min(2),email:z.string().trim().email(),password:z.string().min(8)}).safeParse(Object.fromEntries(form));
 if(!v.success)throw new Error('Revisa tus datos e intenta de nuevo.');
 const email=v.data.email.toLowerCase();
 if(await db.user.findUnique({where:{email}}))throw new Error('Este correo ya está registrado.');
 const u=await db.user.create({data:{...v.data,email,password:await bcrypt.hash(v.data.password,12)}});
 await setSession({id:u.id,email:u.email,role:u.role});redirect('/cuenta');
}
export async function login(form:FormData){
 const v=z.object({email:z.string().trim().email(),password:z.string().min(1)}).safeParse(Object.fromEntries(form));
 if(!v.success)throw new Error('Correo o contraseña incorrectos.');
 const u=await db.user.findUnique({where:{email:v.data.email.toLowerCase()}});
 if(!u||!await bcrypt.compare(v.data.password,u.password))throw new Error('Correo o contraseña incorrectos.');
 await setSession({id:u.id,email:u.email,role:u.role});redirect(u.role==='ADMIN'?'/admin':'/cuenta');
}
export async function quote(form:FormData){
 const v=z.object({name:z.string().trim().min(2),company:z.string().trim().min(2),city:z.string().trim().min(2),quantity:z.coerce.number().int().min(6),email:z.string().trim().email(),message:z.string().max(1000)}).safeParse(Object.fromEntries(form));
 if(!v.success)throw new Error('Completa todos los campos obligatorios.');
 await db.quote.create({data:{...v.data,email:v.data.email.toLowerCase()}});redirect('/mayoristas?enviado=1');
}
export async function signOut(){(await cookies()).delete('up_session');redirect('/')}

const designConfig=z.object({x:z.number().min(0).max(100),y:z.number().min(0).max(100),scale:z.number().min(.1).max(5),rotation:z.number().min(-360).max(360),text:z.string().max(100),font:z.string().max(40),textColor:z.string().regex(/^#[0-9a-f]{6}$/i),side:z.enum(['front','back'])});
const uploadUrl=z.string().regex(/^\/uploads\/[0-9a-f-]{36}\.(?:png|jpg|webp|svg)$/i);
const orderLine=z.object({id:z.string().min(1).max(300),slug:z.string().min(1).max(150),quantity:z.number().int().min(1).max(99),size:z.enum(['XS','S','M','L','XL','XXL']),color:z.string().min(1).max(40),originalUrl:uploadUrl.optional(),frontRenderUrl:uploadUrl.optional(),backRenderUrl:uploadUrl.optional(),frontConfig:designConfig.optional(),backConfig:designConfig.optional()});
export async function submitOrder(form:FormData){
 const user=await session();if(!user)redirect('/login?next=/checkout');
 const parsed=z.object({name:z.string().trim().min(2).max(100),address:z.string().trim().min(5).max(300),city:z.string().trim().min(2).max(100),department:z.string().trim().min(2).max(100),payment:z.enum(['Transferencia bancaria','Nequi','Contraentrega']),items:z.string().min(2).max(100_000)}).safeParse(Object.fromEntries(form));
 if(!parsed.success)throw new Error('Revisa los datos de entrega y pago.');
 let raw:unknown;try{raw=JSON.parse(parsed.data.items)}catch{throw new Error('El carrito está vacío o no es válido.')}
 const lines=z.array(orderLine).min(1).max(50).safeParse(raw);if(!lines.success)throw new Error('El carrito está vacío o no es válido.');
 const city=parsed.data.city.toLocaleLowerCase('es-CO');
 if(parsed.data.payment==='Contraentrega'&&!['bucaramanga','floridablanca','girón','piedecuesta'].includes(city))throw new Error('El pago contraentrega solo está disponible en el área metropolitana de Bucaramanga.');
 let subtotal=0;
 const orderItems:{id:string;name:string;quantity:number;size:string;color:string;unitPrice:number;designId?:string}[]=[];
 for(const line of lines.data){
  if(!config.colors.some(c=>c.name===line.color))throw new Error('Color no disponible.');
  if(line.slug.startsWith('custom-')){
   if(!line.originalUrl||!line.frontRenderUrl||!line.backRenderUrl||!line.frontConfig||!line.backConfig)throw new Error('Faltan los archivos o la configuración del diseño personalizado.');
   const price=line.quantity>=config.wholesaleFrom?config.wholesalePrice:55000;subtotal+=price*line.quantity;
   orderItems.push({id:line.id,name:'Camisa personalizada',quantity:line.quantity,size:line.size,color:line.color,unitPrice:price,designId:line.slug.slice(7)});continue;
  }
  const product=await db.product.findUnique({where:{slug:line.slug}});if(!product)throw new Error('Un producto del carrito ya no está disponible.');
  const price=line.quantity>=config.wholesaleFrom?config.wholesalePrice:product.price;subtotal+=price*line.quantity;
  orderItems.push({id:line.id,name:product.name,quantity:line.quantity,size:line.size,color:line.color,unitPrice:price});
 }
 const local=['bucaramanga','floridablanca','girón','piedecuesta'].includes(city);const shipping=local||subtotal>=config.freeShipping?0:config.shipping;let number='';
 await db.$transaction(async tx=>{
  const count=await tx.order.count();number=`UP-${String(count+1).padStart(6,'0')}`;
  for(const line of lines.data){if(line.slug.startsWith('custom-'))continue;const product=await tx.product.findUnique({where:{slug:line.slug},select:{id:true}});if(!product)throw new Error('Producto no disponible.');
   const variant=await tx.inventoryVariant.updateMany({where:{productId:product.id,color:line.color,size:line.size,stock:{gte:line.quantity}},data:{stock:{decrement:line.quantity}}});
   const stock=await tx.product.updateMany({where:{id:product.id,stock:{gte:line.quantity}},data:{stock:{decrement:line.quantity}}});
   if(!variant.count||!stock.count)throw new Error('El inventario cambió. Actualiza tu carrito e intenta de nuevo.');
  }
  const order=await tx.order.create({data:{number,userId:user.id,email:user.email,total:subtotal+shipping,address:`${parsed.data.name} · ${parsed.data.address}, ${parsed.data.city}, ${parsed.data.department}`,payment:parsed.data.payment,items:JSON.stringify(orderItems)}});
  for(const line of lines.data){if(!line.slug.startsWith('custom-'))continue;await tx.designAsset.create({data:{orderId:order.id,cartItemId:line.id,originalUrl:line.originalUrl!,frontRenderUrl:line.frontRenderUrl!,backRenderUrl:line.backRenderUrl!,configuration:JSON.stringify({front:line.frontConfig,back:line.backConfig})}})}
 });
 redirect(`/pedido-confirmado?numero=${number}`);
}
