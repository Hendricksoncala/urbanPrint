# UrbanPrint

Tienda de camisetas urbanas y personalizadas de Bucaramanga. Construida con Next.js App Router, TypeScript, Tailwind, Prisma/SQLite, Zustand, JWT en cookie y bcrypt.

## Inicio rápido

Requiere Node.js 20 o superior. Copia `.env.example` a `.env`, instala dependencias y prepara SQLite:

```bash
npm install
npx prisma generate
npm run db:push
npm run db:seed
npm run dev
```

Visita http://localhost:3000. El build de producción se genera con `npm run build`.

## Usuarios demo

- Cliente: `cliente@urbanprint.co` / `Demo1234!`
- Administración: `admin@urbanprint.co` / `Admin1234!`

## Rutas y estructura

- `src/app`: home, catálogo, producto, personalizador, carrito, autenticación, cuenta, checkout, mayoristas, admin y contenido legal.
- `src/components`: carrito global y vista vectorial de prendas.
- `src/lib/config.ts`: envío ($12.000 nacional; gratis desde $150.000), colores, tallas y escalón mayorista (6 unidades, $40.000 c/u).
- `prisma/schema.prisma` y `prisma/seed.ts`: datos y modelos locales.

Los 12 diseños de seed usan composiciones originales generadas con SVG dentro del componente de vista de prenda. Los precios y escalas se modifican en `src/lib/config.ts` y los productos en el seed/BD.

## Pagos e integración

Nequi y transferencia se muestran como instrucciones de demostración; sustituye esos datos por información comercial verificada antes de aceptar pagos. Contraentrega y Wompi requieren conectar una pasarela de pedido antes de producción. Configura `WOMPI_PUBLIC_KEY` y `WOMPI_PRIVATE_KEY` en `.env`; el ejemplo deja el punto de integración documentado, no procesa pagos reales. Usa `AUTH_SECRET` aleatorio en despliegues y no publiques el archivo `.env`.

## Despliegue y siguientes mejoras

Para Vercel, cambia SQLite por PostgreSQL administrado (por ejemplo Neon/Supabase) o Turso mediante un adaptador compatible; configura secretos y persistencia de archivos en almacenamiento de objetos. Mejoras recomendadas: órdenes transaccionales con descuento de inventario, pasarela Wompi, comprobantes protegidos, edición completa por talla/color en admin, recuperación de contraseña por correo, gestión de descuentos y persistencia de los artes personalizados.

## Supuestos

Envío nacional estándar $12.000; envío local gratuito en Bucaramanga y municipios metropolitanos para retiro/entrega local; gratis desde $150.000. Precio por mayor $40.000 desde 6 unidades. La tienda opera en COP, entrega estimada 2–5 días hábiles y usa datos de pago/redes demostrativos. Las políticas legales incluidas son texto inicial informativo y deben revisarse profesionalmente antes del lanzamiento.
