# Gallardo Performance — Gestión de Taller Mecánico

Aplicación web interna para el taller mecánico **Gallardo Performance**, desplegable de forma **100% gratuita en Cloudflare Workers + Cloudflare D1**, pensada para cargar vehículos, consultar el historial completo de reparaciones y enviar alertas automáticas de mantenimiento por WhatsApp en un clic.

## Funcionalidades principales

- **Alertas y Resumen (`/`)**: KPIs en tiempo real (autos registrados, alertas vencidas, próximas a 30 días y mensajes enviados este mes) y panel filtrable de mantenimientos pendientes con botón **"Enviar WhatsApp"**.
- **Recordatorio por WhatsApp**: Modal con mensaje prearmado y editable que abre `https://wa.me/...` con el texto listo y registra automáticamente la fecha del aviso en la base de datos.
- **Directorio de Vehículos (`/vehiculos`)**: Búsqueda instantánea por patente, marca, modelo, dueño o teléfono, con acceso rápido al historial o a cargar una nueva reparación.
- **Ficha del Auto (`/vehiculos/[id]`)**: Datos del auto y del dueño, actualización rápida de kilometraje, banner de próxima alerta programada y línea de tiempo cronológica con edición y eliminación de reparaciones.
- **Historial de Trabajos (`/historial`)**: Registro general de todas las reparaciones del taller con búsqueda y filtro por tipo de servicio.
- **Carga rápida (`+ Cargar Auto / Reparación`)**: Permite registrar un vehículo nuevo con su primera reparación o agregar un trabajo a un auto existente, con accesos rápidos de recordatorio (*En 1 año — Cambio de aceite*, *En 6 meses*, *En 3 meses*, *Fecha personalizada* o *Sin recordatorio*).

## Stack técnico

- **Next.js 16 (App Router)** + **React 19** + **TypeScript** + **Tailwind CSS 4**
- **Cloudflare Workers** mediante `@opennextjs/cloudflare`
- **Cloudflare D1 (SQLite en la nube)** con **Drizzle ORM** (creación automática de tablas y datos iniciales de ejemplo en la primera carga)

## Despliegue en Cloudflare Workers (Plan Gratuito)

1. En **Cloudflare Dashboard → Workers & Pages → gallardoperformance → Settings → Build**:
   - **Build command:** `npm run build:cf`
   - **Deploy command:** `npx wrangler deploy`
2. Para guardar datos permanentemente en **Cloudflare D1 (gratis)**:
   - Creá una base D1 en **Storage & Databases → D1 SQL Database → Create** (ej. `gallardoperformance-db`).
   - Copiá el **Database ID**, descomentá el bloque `d1_databases` en `wrangler.jsonc` y pegá tu ID.
   - Al hacer push a `main`, la app crea automáticamente las tablas `vehicles` y `repairs` y carga los vehículos iniciales si la base está vacía.

## Scripts disponibles

- `npm run dev` — Servidor de desarrollo local
- `npm run build` — Compilación Next.js estándar
- `npm run build:cf` — Compilación adaptada para Cloudflare Workers (`opennextjs-cloudflare build`)
- `npm run preview:cf` — Vista previa local en Wrangler
- `npm run deploy:cf` — Build + deploy directo con Wrangler
- `npm run lint` — Verificación ESLint
