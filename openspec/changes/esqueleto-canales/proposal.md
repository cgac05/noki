# Proposal

## Why

El frente de canales no debe esperar a que exista la API del núcleo (`api-comandos` llega en las horas 10–14) para empezar las vistas del demo. Hoy `apps/web` solo muestra una página índice. Este cambio construye las siete rutas de `PLAN.md` §9 sobre un cliente de API intercambiable: primero simulado y validado contra `@noki/contracts`, y después real. Así, en la integración del Flujo A (horas 14–18) basta con cambiar un modo, sin reescribir vistas. Corresponde a "Esqueleto del frontend" de `PLAN.md` §11 (horas 2–10, en paralelo).

## What Changes

- Enrutamiento de `apps/web` con las siete rutas de §9: `/web`, `/wa`, `/app`, `/callcenter`, `/clinica`, `/admin`, `/bandeja`. La página índice actual queda en `/` como portada de la demo.
- Layout móvil primero (el jurado opera desde el celular) y una barra de navegación de demo entre canales que indica el paso del Flujo A en curso.
- Un cliente de API único con dos implementaciones seleccionadas por `VITE_API=mock|real`:
  - **mock**: guion fijo del Flujo A de §12 en memoria; cada respuesta se valida con los esquemas de `@noki/contracts` antes de entregarse a la vista; emite eventos de tiempo real simulados con los nombres y esquemas de `EVENTOS_SOCKET`.
  - **real**: `POST /api/comandos` y `POST /api/canales/wa/mensajes` con `Idempotency-Key`, validación de la respuesta con los esquemas y traducción del cuerpo de error del contrato. Queda preparado, sin probarse contra la API, que todavía no existe.
- Contenido mínimo de cada vista según §9, alimentado solo por el cliente: cotización y "Continuar en WhatsApp" en `/web`; chat con texto, botones y lista en `/wa`; cita y QR en `/app`; "Llamada entrante", ficha y línea de tiempo en `/callcenter`; llegadas y registro de llegada en `/clinica`; trámites por estado, línea de tiempo y KPIs en `/admin`; mensajes simulados en `/bandeja`.
- Pruebas de componentes y del cliente en `apps/web` con Vitest y `jsdom`.
- Ajuste mínimo en dos archivos compartidos para que `pnpm test` ejecute las pruebas de la web: un proyecto `web` en `vitest.config.ts` y su inclusión en el script `test` de `package.json`. **Requiere el visto bueno de ambos responsables.**

Fuera de alcance: el simulador completo de WhatsApp con modal tipo Flow, campos `sensitive`/`passcode` y lista de trámites abiertos (cambio `simulador-wa`); las consolas operativas completas, el escaneo de QR con cámara, el embudo y el panel de huecos (`consolas-internas` y extras); la conexión Socket.IO real; las consultas de lectura reales (`GET /api/...`); cualquier regla de dominio en la web; cambios a `@noki/contracts`.

## Capabilities

### New Capabilities
- `navegacion-canales`: rutas de los canales y roles del demo, layout móvil primero, navegación entre canales y contenido mínimo de cada vista.
- `cliente-api-canales`: interfaz única de acceso a la API para todas las vistas, modos simulado y real, validación contra los contratos, guion simulado del Flujo A y tratamiento de errores.

### Modified Capabilities
_Ninguna._

## Impact

- Código: solo `apps/web` (frente B), más el ajuste compartido de `vitest.config.ts` y del script `test` en `package.json`.
- Dependencias nuevas en `apps/web`: `react-router`, `@tanstack/react-query`, `qrcode` (QR en `/app`); de desarrollo: `vitest` (ya en la raíz), `jsdom`, `@testing-library/react`, `@testing-library/user-event`. Cambia `pnpm-lock.yaml`.
- Dependencia del frente A: ninguna para avanzar. En la integración, la API real debe responder con los contratos actuales.
- Riesgo: las vistas necesitan datos de lectura (nombres de servicio y sede, citas del paciente, línea de tiempo, bandeja) que `@noki/contracts` aún no define. Se usan tipos provisionales locales y aislados en `apps/web`, y se propondrá un cambio compartido `contratos-consultas` para llevarlos a `contracts`.
- Variable nueva `VITE_API` (por defecto `mock`); se documenta en el README de la web, no en `.env.example` de la raíz.
