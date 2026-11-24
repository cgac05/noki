# Canales de noki

Las siete rutas comparten un cliente de API. El modo simulado permite recorrer el Flujo A sin PostgreSQL, Redis ni la API del núcleo. Todos los datos de demostración son ficticios. WhatsApp presenta una conversación con historial y formularios protegidos.

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
| `VITE_API` | `mock` por defecto solo en desarrollo y pruebas; `real` selecciona HTTP. Producción exige definir explícitamente `mock` o `real`; sin VITE_API la build falla. Un valor diferente impide iniciar. |
| `VITE_API_URL` | URL base del cliente real; por defecto `http://localhost:4000`. Sin barra final obligatoria. |
| `VITE_DEMO` | Solo el valor `true` habilita la consulta de bandeja en el cliente real; por defecto está deshabilitada. |

Vite incorpora estas variables al compilar. Reinicia el servidor después de cambiarlas y vuelve a compilar para cambiar un bundle de producción. Se pueden configurar también en `apps/web/.env.local` (ignorado por Git); no incluyas secretos en variables `VITE_*`, que son públicas.

## Guion del Flujo A

Usa **una misma pestaña**, con la barra de canales. El guion vive en memoria: cambiar de ruta conserva su estado; recargar la página lo reinicia. **Reiniciar guion** restablece todas las vistas, la cotización web y el historial del número activo. El historial redactado sobrevive a la recarga, pero el índice del guion mock vuelve al inicio: antes de repetir el ensayo, reinícialo. La latencia simulada por defecto es 150 ms.

1. Abre `/callcenter` y pulsa **Llamada entrante**. La ficha muestra a Ana y el contacto enmascarado.
2. Pulsa **Cotizar paquete en Tepic**. El guion muestra Paquete US mamario + Papanicolaou, sede Tepic y $250.00 MXN (25000 centavos, igual que la semilla).
3. Pulsa **Continuar por WhatsApp**. Aparecen **Abrir WhatsApp** y el QR de `/wa?continuar=<código>`, sin avanzar el trámite. Abre ese enlace en la misma pestaña durante el ensayo mock. El QR para otro dispositivo requiere la API real y una dirección pública accesible.
4. Al abrir el enlace, `/wa` envía una vez `CONTINUAR <código>`, retira el parámetro de la URL y guarda solo `CONTINUAR ••••` en el historial. El bot retoma en el horario, sin volver a pedir servicio ni sede. Pulsa **Ver horarios**.
5. Pulsa **Ver opciones** y elige **Jueves 26 · 09:15** en la hoja de la lista. La otra sección demuestra la lista y responde con ayuda; el guion fijo continúa con 09:15. Las fechas de ejemplo son del 26 de noviembre de 2026 y se muestran en `America/Mazatlan`.
6. Pulsa **Revisar cita** y **Abrir formulario**. Completa el Flow con una fecha ficticia y pulsa **Enviar formulario**. La entrada está enmascarada y el historial muestra solo `Fecha de nacimiento ••••`. Puedes cancelar o usar Escape; Tab y Shift+Tab permanecen en el modal. El mock solo comprueba que llegue el requerido, sin verificar identidad.
7. Pulsa **Confirmar cita**. Cambia a **App**: se muestra `CONFIRMADA` y un QR generado a partir del token recibido, sin folio. Los tokens del modo mock son ficticios y no sirven como credenciales reales.
8. Cambia a **Clínica** y pulsa **Registrar llegada**. El estado pasa a `EN_CLINICA`, según la respuesta prefabricada del cliente.
9. Abre **Admin**: aparecen el conteo por estado, los KPIs y la línea de tiempo, incluidos los cambios por Call Center, WhatsApp, App y Clínica. Los eventos se etiquetan en UTC.
10. En **Bandeja** se ven SMS/correo simulados. El código OTP ficticio se muestra solo ahí. Puedes reiniciar el guion desde cualquier ruta.

El simulador no calcula estados, identidad, disponibilidad ni reglas del núcleo. Es una lista fija de respuestas; no constituye una integración funcional con el backend.

En móvil, la barra conserva los siete enlaces en una sola fila: desplázala horizontalmente o recórrela con Tab para llegar a todos los canales. El paso actual permanece visible debajo. La página no necesita desplazamiento horizontal y la cita presenta primero el QR para que quede visible al abrir `/app`.

## Conversación y privacidad

El campo **Número de WhatsApp** comienza con Ana: `5210000000001`. Acepta de 10 a 15 dígitos, sin signos ni espacios. Al cambiarlo se muestra el historial de ese número. El número seleccionado no se guarda como preferencia.

Las burbujas se acumulan por número en `sessionStorage` (llave `noki:wa:<número>`) y se recuperan al cambiar de vista o recargar. Solo se guardan texto, títulos elegidos, mensajes del bot y resúmenes redactados; no solicitudes, códigos de continuación, valores del Flow ni claves de reintento. No se usa localStorage ni IndexedDB. **Nueva conversación** borra el historial activo de la pantalla y de la sesión; no reinicia el trámite. **Reiniciar guion** permite repetir el ensayo. Cerrar la pestaña termina su sesión.

Mientras llega la respuesta aparece **escribiendo…** y los controles se bloquean desde el primer toque. Las opciones de mensajes anteriores quedan deshabilitadas. Si falla un mensaje, **Reintentar** reutiliza su solicitud y su Idempotency-Key, sin duplicar la burbuja.

El Flow presenta controles según la captura: texto, fecha, datos sensibles enmascarados y PIN numérico enmascarado. Los valores solo viven mientras el modal está abierto y durante el transporte; no se registran en consola ni en mutaciones de TanStack Query. Se descartan al enviar con éxito, cancelar o cerrar con Escape. Si falla el envío, **Reintentar envío** conserva la solicitud y clave anteriores; cancela para capturar valores distintos. Mostrar u ocultar el dato solo dura mientras el modal está abierto.

La insignia **Modo simulado** aparece en todas las vistas cuando las respuestas son del guion. En modo real desaparece. La aplicación declara `no-referrer`; el código de continuación se retira de la URL con reemplazo de historial.

Límite conocido: los mensajes iniciados por la empresa sin una acción del usuario necesitan un evento de contrato futuro. Por ahora, el jurado abre el enlace/QR o envía un mensaje; no se simulan entregas espontáneas.

## Cotización web independiente

Abre `/web`, pulsa **Cotizar en Tepic** y después **Continuar en WhatsApp** para mostrar el código `CONTINUAR …` entregado por el cliente. Este mini guion no avanza ni reinicia el Flujo A. El enlace abre `/wa`; la resolución de continuidad del Flujo B completo corresponde a cambios posteriores.

## Modo real

```powershell
$env:VITE_API = 'real'
$env:VITE_API_URL = 'http://localhost:4000'
pnpm --filter @noki/web build
pnpm --filter @noki/web exec vite preview --host 127.0.0.1 --port 4173
```

Abre `/wa` en la vista previa y envía un mensaje. Si la API no está disponible, la burbuja muestra el error de red con **Reintentar**. También puedes abrir `/admin` para consultar `GET /api/admin/kpis`. Si no hay API escuchando, aparece un mensaje de conexión con **Reintentar**. El cliente resuelve las nueve consultas compartidas con `RUTAS_CONSULTAS` y valida sus respuestas. Los endpoints GET corresponden al frente A; definir el contrato no significa que ya estén implementados. La cotización `web` sigue siendo una consulta exclusiva de demo. WhatsApp usa únicamente el contrato POST de mensajes, sin una consulta de conversación. El modo real no utiliza fixtures como respaldo silencioso. El servidor real deberá permitir el origen de la web para las peticiones entre puertos.

El cliente está preparado para `POST /api/comandos` y `POST /api/canales/wa/mensajes`, con validación antes de enviar y después de recibir. Genera una clave de idempotencia por intento lógico y la conserva durante un único reintento automático de red. Los comandos y los mensajes de WhatsApp conservan su clave al pulsar **Reintentar**. El endpoint real debe respetar Idempotency-Key por mensaje. Un error HTTP válido conserva su código y mensaje públicos; los errores de contrato no muestran los detalles Zod.

Las lecturas compartidas usan los esquemas de `@noki/contracts` y las rutas de [contratos](../../docs/contratos.md). Las vistas toman los IDs de la última respuesta de comando o, en mock, de `cliente.demo.ids`. Sin contexto real muestran un aviso y no inventan IDs; la sesión de paciente real está pendiente del cambio de seguridad. La bandeja real requiere `VITE_DEMO=true`. La conexión Socket.IO real está pendiente de `api-comandos`; `suscribir` devuelve por ahora una función de cancelación sin abrir conexiones. Las lecturas y la experiencia completa contra API no se declaran integradas en este cambio.

Para regresar al modo simulado:

```powershell
$env:VITE_API = 'mock'
Remove-Item Env:VITE_API_URL -ErrorAction SilentlyContinue
pnpm --filter @noki/web build
```

## Lecturas compartidas y tipos de demo

Oferta de catálogo, cita, ficha del hilo, llegada, bandeja y métricas se importan de `@noki/contracts`. Sus lecturas contienen solo datos: Call Center y Web copian los IDs de la oferta a los comandos de servicio y sede; Clínica copia el token de la cita a `RegistrarLlegada`. El cliente valida cada comando. El reintento conserva la clave del comando pendiente y no repite los comandos ya completados de la secuencia.

`src/cliente/demo.ts` conserva únicamente los tipos exclusivos de demo:

| Tipo | Contenido |
|---|---|
| `PasoGuion` | Posición y título del paso visible del guion. |
| `WebVista` | Oferta del contrato y cotización/código de continuación, sin acciones. |
| `PasoWeb` | Vista y respuesta prefabricada de la cotización web. |

`src/cliente/consultas.ts` deriva los nombres, parámetros y respuestas de la tabla compartida y agrega únicamente la cotización `web` de demo. No duplica los modelos compartidos. Los comandos esperados del guion son internos al mock y nunca se devuelven como lecturas.

No se declaran fecha de nacimiento, correo del paciente, RFC, PIN ni CURP en estas lecturas. Las consultas todavía no tienen autenticación y exponen nombre de pila, teléfono enmascarado, citas con token y llegadas; se limitan a la demo hasta el cambio de seguridad.

## Validar

```powershell
$env:VITE_API = 'mock'
pnpm lint
pnpm lint:deps
pnpm test
pnpm --filter @noki/web build
```

`pnpm test` conserva las comprobaciones TypeScript y ejecuta los proyectos `unitarios` y `web`. Para correr solo las pruebas de la web: `pnpm exec vitest run --project web`. También está disponible la configuración local con `pnpm exec vitest run --root apps/web`.

La revisión visual debe recorrer el guion a 375 × 812 y 1280 × 900, comprobar navegación con Tab, recarga directa en `/wa`, errores de consola y ausencia de desplazamiento horizontal. El estado real de estas comprobaciones y la revisión probada quedan en `openspec/changes/simulador-wa/implementacion.md` y su carpeta `evidencias/`.
