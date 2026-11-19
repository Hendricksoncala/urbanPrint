# UrbanPrint

Tienda de camisetas urbanas y personalizadas de Bucaramanga. Construida con Next.js App Router, TypeScript, Tailwind, Prisma/PostgreSQL, Zustand, JWT en cookie y bcrypt.

## Inicio rápido

Requiere Node.js 20 o superior. Copia `.env.example` a `.env`, instala dependencias y prepara PostgreSQL con la URL `DATABASE_URL` del proveedor:

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
- `prisma/schema.prisma` y `prisma/seed.ts`: datos y seed.

Los 12 diseños de seed usan composiciones originales generadas con SVG dentro del componente de vista de prenda. Los precios y escalas se modifican en `src/lib/config.ts` y los productos en el seed/BD.

## Vercel y configuración de producción

1. Crea una base PostgreSQL administrada (por ejemplo Vercel Postgres/Neon) y configura `DATABASE_URL` como URL PostgreSQL con SSL.
2. Crea un Blob Store público en Vercel, conéctalo al proyecto y configura `BLOB_READ_WRITE_TOKEN` para los entornos que usarás.
3. Configura `AUTH_SECRET` con un valor aleatorio largo, `NEXT_PUBLIC_WHATSAPP_NUMBER="573046129278"`, `NEXT_PUBLIC_PAY_HOLDER="Isabel Sandoval"`, `NEXT_PUBLIC_PAY_KEY="304 612 9278"`, `NEXT_PUBLIC_SITE_URL` y los secretos de Wompi si habilitarás la pasarela. Para transferencia bancaria, configura `BANK_NAME`, `BANK_ACCOUNT`, `BANK_HOLDER` y `BANK_DOCUMENT`.
4. Define `CRON_SECRET` con un secreto aleatorio. La ruta `/api/cron/expire-orders` está programada cada hora por `vercel.json`; vence pagos sin comprobante tras 48 horas y libera el inventario reservado.
5. En el despliegue, `postinstall` genera Prisma Client y el build ejecuta `prisma generate && next build`. Antes de recibir tráfico, aplica el schema y carga el seed desde un entorno con acceso a PostgreSQL: `npm run db:push` y `npm run db:seed`.

Las cargas de diseño (máximo 10 MB) y comprobantes (máximo 5 MB) pasan por validación de contenido MIME en servidor antes de guardarse en Blob. `public/qr-nequi.png` contiene el QR Bre-B/Nequi suministrado para Isabel Sandoval.

## Pagos manuales y Wompi

Bre-B/Nequi funciona sin confirmación automática: el cliente paga el monto exacto, escribe el código del pedido en el mensaje de transferencia y carga la imagen/PDF del comprobante. El formulario registra nombre del pagador, referencia única, fecha/hora declarada y monto. El servidor valida MIME real, limita tamaño e intentos, guarda el archivo con UUID en Vercel Blob y registra cada transición en `PaymentEvent`. El pago queda en **Pago en verificación** hasta que un administrador revise Nequi. Aprobar exige confirmar la verificación en la app; rechazar exige motivo, devuelve el pago a **PENDING_PROOF** y permite volver a cargar. El historial conserva quién y cuándo hizo cada transición. La cuenta del cliente y seguimiento muestran el estado. El botón alterno de WhatsApp prepara el mensaje con pedido y monto.

El panel `/admin` muestra contador y cola de pagos pendientes, pedido/cliente, monto esperado y declarado (marca diferencias), referencia, hora declarada y comprobante ampliable. Contraentrega solo permite Bucaramanga, Floridablanca, Girón y Piedecuesta. Ningún pago se confirma automáticamente ni por el navegador.

Variables del pago manual: `NEXT_PUBLIC_PAY_HOLDER="Isabel Sandoval"`, `NEXT_PUBLIC_PAY_KEY="304 612 9278"` y `NEXT_PUBLIC_WHATSAPP_NUMBER="573046129278"`. El QR de esta cuenta está en `public/qr-nequi.png`.

Wompi usa Web Checkout con firma SHA-256 y deja la opción deshabilitada mientras falta cualquiera de `WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`. Selecciona `WOMPI_ENV="sandbox"` para pruebas. Obtén las llaves públicas y los secretos separados de integridad/eventos en el Dashboard de Wompi, menú **Desarrolladores**; conserva esos valores solo en el servidor. En el dashboard registra `https://TU_DOMINIO/api/wompi/webhook` como URL de eventos para el ambiente correspondiente. `NEXT_PUBLIC_SITE_URL` debe ser la URL pública HTTPS del sitio para la redirección de retorno.

El retorno consulta `GET /v1/transactions/{id}` directamente desde el servidor y coteja referencia, moneda e importe con el pedido. El webhook verifica `signature.properties`, `timestamp` y el secreto de eventos, guarda cada evento en `PaymentEvent`, ignora duplicados y aplica actualizaciones solo a la referencia/importe esperados.

En sandbox, las tarjetas de prueba documentadas por Wompi son `4242 4242 4242 4242` para aprobación y `4111 1111 1111 1111` para declinación; usa fecha futura y CVC de tres dígitos. Para Nequi sandbox, `3991111111` aprueba y `3992222222` declina. El Web Checkout ofrece además PSE y Botón Bancolombia; estos flujos pueden presentar su selector de resultado de prueba. La información de sandbox y las transacciones son independientes de producción.

En producción cambia `WOMPI_ENV="production"`, coloca llaves con prefijo `pub_prod_` y secretos de producción, configura el webhook de producción y una URL de retorno HTTPS real. Nunca publiques `.env`. Referencias oficiales: [Web Checkout e integridad](https://docs.wompi.co/docs/colombia/widget-checkout-web/), [Eventos y checksum](https://docs.wompi.co/docs/colombia/eventos/), [Ambientes y llaves](https://docs.wompi.co/docs/colombia/ambientes-y-llaves/) y [datos de prueba](https://docs.wompi.co/docs/colombia/datos-de-prueba-en-sandbox/).

## Despliegue y siguientes mejoras

Configura PostgreSQL administrado y Vercel Blob usando las variables indicadas arriba. Mejoras recomendadas: órdenes transaccionales con descuento de inventario, comprobantes privados, edición completa por talla/color en admin, recuperación de contraseña por correo y gestión de descuentos.

## Supuestos

Envío nacional estándar $12.000; envío local gratuito en Bucaramanga y municipios metropolitanos para retiro/entrega local; gratis desde $150.000. Precio por mayor $40.000 desde 6 unidades. La tienda opera en COP, entrega estimada 2–5 días hábiles y usa datos de pago/redes demostrativos. Las políticas legales incluidas son texto inicial informativo y deben revisarse profesionalmente antes del lanzamiento.