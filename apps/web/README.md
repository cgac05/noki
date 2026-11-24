# Canales de noki

Las siete rutas comparten un cliente de API. El modo simulado permite recorrer el Flujo A sin PostgreSQL, Redis ni la API del núcleo. Todos los datos son ficticios. El cambio conserva los estilos existentes.

## Iniciar

Desde la raíz del repositorio, con Node 20+ y pnpm:

```powershell
pnpm install --frozen-lockfile
$env:VITE_API = 'mock'
pnpm --filter @noki/web dev
```

Abre `http://localhost:5173/`. `pnpm dev` inicia también API y sd-mock y necesita la configuración de la raíz. Si 5173 está ocupado, usa `pnpm --filter @noki/web dev --port 5175` y abre ese puerto. No es necesario detener otros procesos para probar la web.

### Antes de cada ensayo

Detén el servidor de la web con **Ctrl+C** en la terminal donde lo iniciaste y vuelve a arrancarlo. Si cambiaron las dependencias, usa `--force` para regenerar la caché de Vite:

```powershell
$env:VITE_API = 'mock'
pnpm --filter @noki/web dev --force
```

Si no cambiaron dependencias, basta `pnpm --filter @noki/web dev`. Recarga después la pestaña del navegador y comienza el guion desde el inicio. Un servidor que seguía abierto durante la instalación puede mezclar versiones de `.vite/deps` y producir **Invalid hook call**; el reinicio con `--force` evita reutilizar esa caché vieja. Para un puerto alternativo, combina `--force --port 5175`.

| Variable | Valores y comportamiento |
|---|---|
| `VITE_API` | `mock` por defecto; `real` selecciona HTTP. Un valor diferente impide iniciar y muestra los valores válidos. |
| `VITE_API_URL` | URL base del cliente real; por defecto `http://localhost:4000`. Sin barra final obligatoria. |

Vite incorpora estas variables al compilar. Reinicia el servidor después de cambiarlas y vuelve a compilar para cambiar un bundle de producción. Se pueden configurar también en `apps/web/.env.local` (ignorado por Git); no incluyas secretos en variables `VITE_*`, que son públicas.

## Guion del Flujo A

Usa **una misma pestaña**, con la barra de canales. El guion vive en memoria: cambiar de ruta conserva su estado; recargar la página lo reinicia. **Reiniciar guion** restablece todas las vistas y la cotización web. La latencia simulada por defecto es 150 ms.

1. Abre `/callcenter` y pulsa **Llamada entrante**. La ficha muestra a Ana y el contacto enmascarado.
2. Pulsa **Cotizar paquete en Tepic**. El guion muestra Paquete US mamario + Papanicolaou, sede Tepic y $250.00 MXN (25000 centavos, igual que la semilla).
3. Pulsa **Continuar por WhatsApp**. Se presenta un código opaco ficticio. Cambia a **WhatsApp** con la barra.
4. En `/wa`, el bot retoma en el horario. Pulsa **Ver horarios**. También se acepta `Hola` o el código mostrado en Call Center, sin volver a pedir servicio ni sede.
5. Elige **Jueves 26 · 09:15** en la lista. La otra sección demuestra la lista y responde con ayuda; el guion fijo continúa con 09:15. Las fechas de ejemplo son del 26 de noviembre de 2026 y se muestran en `America/Mazatlan`.
6. Pulsa **Revisar cita**. El Flow es un aviso: la captura protegida pertenece al siguiente cambio y aquí no pide datos como texto libre.
7. Pulsa **Confirmar cita**. Cambia a **App**: se muestra `CONFIRMADA` y un QR generado a partir del token recibido, sin folio. Los tokens del modo mock son ficticios y no sirven como credenciales reales.
8. Cambia a **Clínica** y pulsa **Registrar llegada**. El estado pasa a `EN_CLINICA`, según la respuesta prefabricada del cliente.
9. Abre **Admin**: aparecen el conteo por estado, los KPIs y la línea de tiempo, incluidos los cambios por Call Center, WhatsApp, App y Clínica. Los eventos se etiquetan en UTC.
10. En **Bandeja** se ven SMS/correo simulados. El código OTP ficticio se muestra solo ahí. Puedes reiniciar el guion desde cualquier ruta.

El simulador no calcula estados, identidad, disponibilidad ni reglas del núcleo. Es una lista fija de respuestas; no constituye una integración funcional con el backend.

En móvil, la barra conserva los siete enlaces en una sola fila: desplázala horizontalmente o recórrela con Tab para llegar a todos los canales. El paso actual permanece visible debajo. La página no necesita desplazamiento horizontal y la cita presenta primero el QR para que quede visible al abrir `/app`.

## Cotización web independiente

Abre `/web`, pulsa **Cotizar en Tepic** y después **Continuar en WhatsApp** para mostrar el código `CONTINUAR …` entregado por el cliente. Este mini guion no avanza ni reinicia el Flujo A. El enlace abre `/wa`; la resolución de continuidad del Flujo B completo corresponde a cambios posteriores.

## Modo real

```powershell
$env:VITE_API = 'real'
$env:VITE_API_URL = 'http://localhost:4000'
pnpm --filter @noki/web build
pnpm --filter @noki/web exec vite preview --host 127.0.0.1 --port 4173
```

Abre `/admin` en la vista previa para intentar `GET /api/admin/kpis`. Si no hay API escuchando, aparece un mensaje de conexión con **Reintentar**. Las demás lecturas sin ruta implementada muestran un aviso de consulta aún no disponible. El modo real no utiliza fixtures como respaldo silencioso. El servidor real deberá permitir el origen de la web para las peticiones entre puertos.

El cliente está preparado para `POST /api/comandos` y `POST /api/canales/wa/mensajes`, con validación antes de enviar y después de recibir. Genera una clave de idempotencia por intento lógico y la conserva durante un único reintento automático de red. Las acciones de comando también conservan la clave al pulsar **Reintentar**. Un error HTTP válido conserva su código y mensaje públicos; los errores de contrato no muestran los detalles Zod.

Las consultas de línea de tiempo (`GET /api/hilos/:id/linea-tiempo`) y KPIs tienen rutas preparadas y esquemas provisionales. La conexión Socket.IO real está pendiente de `api-comandos`; `suscribir` devuelve por ahora una función de cancelación sin abrir conexiones. Las lecturas y la experiencia completa contra API no se declaran integradas en este cambio.

Para regresar al modo simulado:

```powershell
$env:VITE_API = 'mock'
Remove-Item Env:VITE_API_URL -ErrorAction SilentlyContinue
pnpm --filter @noki/web build
```

## Tipos pendientes de contratos-consultas

Todos se concentran en `src/cliente/provisional.ts`, con esquemas Zod locales:

| Tipo | Contenido público |
|---|---|
| `CatalogoVista` | Servicio, sede, IDs y precio en centavos. |
| `CitaVista` | Trámite del contrato, servicio, sede, inicio UTC, zona IANA y token del QR. |
| `FichaHilo` | Nombre de pila ficticio, teléfono enmascarado, trámites, línea de tiempo, resumen de cotización y acciones de presentación. |
| `LlegadaVista` | Cita, indicación de llegada registrada y comando recibido para registrarla. |
| `MensajeBandeja` | Canal SMS/correo, asunto y cuerpo ficticios; solo se presenta en la bandeja de demo. |
| `MetricasVista` | Conteos por estado y KPIs numéricos. |
| `ConversacionVista` | Mensajes del bot y siguiente pregunta tomados de contratos. |
| `WebVista`, `PasoWeb` | Catálogo, cotización/código de continuación, acciones y respuesta prefabricada de la cotización web. |
| `AccionVista`, `PasoGuion` | Acciones de presentación y posición del guion de demo. |
| `ConsultasProvisionales`, `ParametrosConsulta` | Mapa tipado de consultas y sus parámetros. |

No incluyen fecha de nacimiento, correo del paciente, RFC, PIN ni CURP. No modifiques `@noki/contracts` desde el frente de canales; la migración de estas lecturas requiere el cambio compartido.

## Validar

```powershell
pnpm lint
pnpm lint:deps
pnpm test
pnpm --filter @noki/web build
```

`pnpm test` conserva las comprobaciones TypeScript y ejecuta los proyectos `unitarios` y `web`. Para correr solo las pruebas de la web: `pnpm exec vitest run --project web`. También está disponible la configuración local con `pnpm exec vitest run --root apps/web`.

La revisión visual debe recorrer el guion a 375 × 812 y 1280 × 900, comprobar navegación con Tab, recarga directa en `/wa`, errores de consola y ausencia de desplazamiento horizontal. El estado real de estas comprobaciones y la revisión probada quedan en `openspec/changes/esqueleto-canales/implementacion.md` y su carpeta `evidencias/`.
