import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {config} from '../src/lib/config';
const db = new PrismaClient();
const products = [
 ['pulso-nocturno','Pulso nocturno','Una energía que no necesita permiso. Algodón peinado 180 g con impresión DTF de alta definición.',45000,'TIPOGRAFÍA'],['frecuencia-urbana','Frecuencia urbana','Sintoniza tu propia señal. Una pieza gráfica original para todos los días.',45000,'GEOMÉTRICO'],['ruido-dorado','Ruido dorado','Textura, ritmo y actitud con un acento dorado.',45000,'ABSTRACTO'],['linea-de-fuga','Línea de fuga','Geometría cinética que rompe la rutina.',45000,'GEOMÉTRICO'],['nunca-quieto','Nunca quieto','Hecha para quienes siempre van hacia algo.',45000,'TIPOGRAFÍA'],['zona-cero','Zona cero','Tu punto de partida, a tu manera.',45000,'ABSTRACTO'],['sur-oriente','Sur oriente','Una coordenada propia para el mapa urbano.',45000,'GEOMÉTRICO'],['rompe-el-molde','Rompe el molde','El uniforme de quienes hacen las cosas distinto.',45000,'TIPOGRAFÍA'],['eco-interior','Eco interior','Una composición tranquila con carácter.',45000,'ABSTRACTO'],['sube-el-volumen','Sube el volumen','Gráfica expresiva, sin bajar la voz.',45000,'TIPOGRAFÍA'],['movimiento-propio','Movimiento propio','Formas que encuentran su propio camino.',45000,'GEOMÉTRICO'],['bajo-la-luna','Bajo la luna','Una edición nocturna para las calles.',45000,'ABSTRACTO']
] as const;
async function main(){
 for(const [i,p] of products.entries()) {const product=await db.product.upsert({where:{slug:p[0]},update:{},create:{slug:p[0],name:p[1],description:p[2],price:p[3],category:p[4],image:`/art/${i+1}.svg`,stock:420}});for(const color of config.colors)for(const size of config.sizes)await db.inventoryVariant.upsert({where:{productId_color_size:{productId:product.id,color:color.name,size}},update:{},create:{productId:product.id,color:color.name,size,stock:10}})}
 const demo=await bcrypt.hash('Demo1234!',10); const admin=await bcrypt.hash('Admin1234!',10);
 await db.user.upsert({where:{email:'cliente@urbanprint.co'},update:{},create:{name:'Cliente UrbanPrint',email:'cliente@urbanprint.co',password:demo}});
 await db.user.upsert({where:{email:'admin@urbanprint.co'},update:{},create:{name:'Equipo UrbanPrint',email:'admin@urbanprint.co',password:admin,role:'ADMIN'}});
}
main().finally(()=>db.$disconnect());
