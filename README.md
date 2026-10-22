# MecánicOS

Sistema de gestión para talleres mecánicos, pensado para competir contra el cuaderno, el Excel y el WhatsApp suelto. El mecánico no se sienta frente a una pantalla: manda un audio por WhatsApp y el sistema ejecuta la acción.

> Proyecto de portfolio, construido de punta a punta para practicar un producto con varias integraciones. No es un servicio en producción.

## Qué hace

- **Órdenes de trabajo digitales**: presupuestos en PDF con aprobación del cliente, historial de cada vehículo, inventario con alertas de stock, control de cobros y reportes.
- **WhatsApp como interfaz principal**: el mecánico actualiza órdenes por voz o texto; el audio se transcribe, se interpreta con IA y dispara la acción. Cada taller conecta su propia instancia (Evolution API).
- **Avisos automáticos al cliente** cuando el vehículo está listo, con recordatorios que respetan un tiempo de espera para no repetirse.
- **Asistente técnico con IA**: búsqueda semántica sobre los manuales cargados (pgvector); responde citando la fuente en vez de inventar procedimientos.
- **Multiusuario con permisos por rol**, panel de superadmin y link público de seguimiento.

## Cómo está hecho

```
apps/
  api/        NestJS 11 + Prisma (PostgreSQL + pgvector)
  web/        Next.js 16 + React 19
packages/
  shared/     tipos y contratos compartidos entre API y web
```

Decisiones que vale la pena mirar:

- **Monorepo con Turborepo y pnpm**, con un paquete compartido de tipos para que el contrato entre front y back no se desincronice.
- **Proveedores externos detrás de interfaces** (por ejemplo, WhatsApp): cambiar de proveedor toca un solo módulo.
- **Aislamiento de WhatsApp entre talleres** cubierto por tests: cada taller tiene su propia instancia y sus propios webhooks.
- **Webhooks firmados con HMAC**, comparación en tiempo constante, validación por esquema y rate limiting.
- **Credenciales de Mercado Pago cifradas en reposo**; claves y secretos siempre por variables de entorno, nunca en el repo.
- **Funciones por plan** (feature gating) a nivel de API.

## Correrlo en local

Requisitos: Node 20+, pnpm y una base PostgreSQL con la extensión `vector`.

```bash
pnpm install

# variables de entorno: copiar los ejemplos y completar con valores propios
cp apps/api/.env.example apps/api/.env
# (la web tiene su propio .env.local)

pnpm db:generate
pnpm db:migrate
pnpm dev       # API y web en paralelo
```

La autenticación usa Clerk, la IA usa Gemini y el almacenamiento de fotos usa Cloudflare R2: sin esas cuentas la app corre igual, pero esas funciones quedan desactivadas. Ninguna credencial está versionada.

## Estado

Proyecto de portfolio sin mantenimiento activo. Es código para leer y para aprender; no hay soporte ni garantías.
