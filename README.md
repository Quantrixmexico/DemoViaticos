# Demo Viáticos

Sistema de gestión de viáticos y gastos corporativos: anticipos, reembolsos, comprobación con CFDI, autorización por gerente y administración, liberación de pagos por tesorería y pólizas para contabilidad. Funciona como PWA instalable en el teléfono.

## Stack

- **Next.js 16** (App Router, Turbopack) con React 19 y TypeScript.
- **Supabase** para autenticación, base de datos y almacenamiento de comprobantes.
- **Cloudflare Workers** vía OpenNext (`@opennextjs/cloudflare`) para el despliegue.
- **Firebase Cloud Messaging** para notificaciones push.
- CSS propio con tokens de diseño en `src/app/globals.css`; iconos de `lucide-react`; gráficas con `recharts`.

## Desarrollo

```bash
npm install
npm run dev          # http://localhost:3000
npm run lint
npm run build        # build de Next + OpenNext (genera .open-next/, lo que sube Cloudflare)
npm run build:next   # solo next build, para comprobar que compila
npm run preview      # build y vista previa local del Worker
npm run deploy       # build y despliegue a Cloudflare
```

Variables de entorno necesarias (en `.env.local` para desarrollo y como secretos del Worker en producción):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Secretos solo del servidor (como secretos del Worker en Cloudflare; en desarrollo en `.dev.vars`). Se leen en tiempo de ejecución con `getCloudflareContext()`:

```
SUPABASE_SERVICE_ROLE_KEY=   # alta, baja y contraseñas de usuarios; lectura de tokens push
FIREBASE_SERVICE_ACCOUNT=    # JSON completo de la cuenta de servicio de Firebase, en una sola línea
```

## Notificaciones push

La app envía las push directamente a Firebase Cloud Messaging (API HTTP v1) desde `/api/push/notify`; no hace falta ningún Worker aparte. Para activarlas en un despliegue:

1. Crea un proyecto en [Firebase](https://console.firebase.google.com) y añade una app web.
2. Configuración del proyecto → General → "Tus apps": copia los valores de `firebaseConfig`.
3. Configuración del proyecto → Cloud Messaging → "Certificados push web": genera el par de claves y copia la clave pública (VAPID).
4. Configuración del proyecto → Cuentas de servicio → "Generar nueva clave privada": descarga el JSON.

Variables públicas (se incrustan en el build; en Cloudflare van en Settings → Build → Variables, y también como variables del Worker):

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
```

Secreto del Worker: `FIREBASE_SERVICE_ACCOUNT` con el contenido del JSON del paso 4. Sin estas variables la app funciona igual, pero no ofrece ni envía push.

## Seguridad

- **RLS en Supabase.** La app consulta la base desde el navegador con la clave `anon`, así que la seguridad real la ponen las políticas por fila. `supabase/policies.sql` las define para todas las tablas y el bucket `comprobantes`; ejecútalo en el SQL Editor tras cualquier cambio de esquema y pruébalo con cada rol.
- **Control de rol en el servidor.** Los layouts de `admin/`, `gerente/`, `tesoreria/`, `contador/` y `solicitudes/todas/` comprueban el rol con `requireRol` (`src/lib/auth-server.ts`) y redirigen a `/dashboard` si no corresponde. La lista de roles por área vive en `AREA_ROLES` y debe coincidir con la navegación de `AppShell`.
- **Rol `demo`.** Solo puede dar de alta usuarios con rol `usuario`; no restablece contraseñas ni borra (`src/lib/permisos.ts` y `api/admin/users`).
- **Push.** El navegador llama a `/api/push/notify`, que firma la petición a FCM con la cuenta de servicio; esa credencial nunca sale del servidor. El registro del token siempre se asocia al usuario con sesión.
- **Service worker.** Solo cachea recursos estáticos y `/login`; las páginas con sesión no se guardan en el dispositivo.
- **Archivos.** El bucket `comprobantes` es privado. En `archivo_url` se guarda la ruta dentro del bucket y los enlaces se generan con URLs firmadas (`src/lib/archivos.ts`, `ArchivoLink`). Las filas antiguas con URL pública se resuelven igual.

## Personalizar la marca

Todo el texto de marca sale de `src/lib/brand.ts` (empresa, nombre del producto, nombre corto para el icono, lema, correo de ejemplo del login y colores del sistema). `public/manifest.json` no puede importar TypeScript: mantén `name`, `short_name`, `theme_color` y `background_color` con los mismos valores. El logotipo es `public/logo.png` y los iconos de la PWA están en `public/icon-*.png`.

## Roles

| Rol | Qué ve |
| --- | --- |
| `usuario` | Sus solicitudes: anticipos, reembolsos, comprobaciones. |
| `gerente` | Bandeja de autorización de su equipo, además de lo anterior. |
| `tesoreria` | Liberación de pagos, pagados y deudores. |
| `contador` | Pólizas, trazabilidad, validación y conciliación SAT, catálogo. |
| `admin` | Todo: validación, usuarios, centros, divisiones, límites y ajustes. |
| `demo` | Como `admin`, pero con las acciones destructivas bloqueadas (ver `src/lib/permisos.ts`). |

## Estructura

```
src/app/(auth)        login y restablecer contraseña
src/app/(app)         pantallas autenticadas, agrupadas por rol
src/app/api           rutas: alta de usuarios, registro de push, validación SAT
src/components/ui     componentes compartidos (Dialog, Toast, EmptyState, StatCards, Timeline…)
src/components/layout AppShell: barra lateral, barra de pestañas móvil, tema
src/lib               Supabase, formato, permisos, notificaciones, CFDI, marca, requireRol
supabase/             policies.sql: políticas RLS para Supabase
src/contexts          ThemeContext (modo claro/oscuro y acento)
```

## Notas de despliegue

- La caché persistente de Turbopack está desactivada en `next.config.ts` (`turbopackFileSystemCacheForBuild/Dev: false`): con ella activa, Cloudflare Workers Builds y `next dev` servían un `globals.css` anterior tras editarlo.
- Cloudflare Workers Builds ejecuta `npm run build` y después `npx wrangler versions upload`, que necesita `.open-next/worker.js`. Por eso `npm run build` corre OpenNext y no solo `next build`. Las variables `NEXT_PUBLIC_*` deben estar en Settings → Build → Variables, porque se incrustan al compilar.
