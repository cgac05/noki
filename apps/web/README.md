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
| `VITE_DEMO` | Solo el valor `true` habilita `bandeja` y `contextoDemo` en el cliente real; por defecto están deshabilitadas. Es necesario para obtener el contexto de las consolas y `/app` en una pestaña nueva de la demo real. |

Vite incorpora estas variables al compilar. Reinicia el servidor después de cambiarlas y vuelve a compilar para cambiar un bundle de producción. Se pueden configurar también en `apps/web/.env.local` (ignorado por Git); no incluyas secretos en variables `VITE_*`, que son públicas.

## Guion del Flujo A

Usa **una misma pestaña**, con la barra de canales. El guion vive en memoria: cambiar de ruta conserva su estado; recargar la página lo reinicia. **Reiniciar guion** restablece todas las vistas, la cotización web y el historial del número activo. El historial redactado sobrevive a la recarga, pero el índice del guion mock vuelve al inicio: antes de repetir el ensayo, reinícialo. La latencia simulada por defecto es 150 ms.

1. Abre `/callcenter`. **Número de la llamada (ANI)** comienza con `5210000000001`, de la paciente ficticia. Acepta de 10 a 15 dígitos, sin espacios ni signos; un formato inválido deshabilita **Llamada entrante** y explica cómo corregirlo. Al llamar se envía como `payload.contacto`; la captura desaparece y la ficha solo muestra el contacto enmascarado (o «—» si es nulo).
2. Pulsa **Cotizar Paquete US mamario + Papanicolaou en Tepic · $250.00**. Cada oferta se identifica por servicio, sede y precio; se conserva el orden del catálogo. El guion muestra ese paquete, sede Tepic y $250.00 MXN (25000 centavos, igual que la semilla).
3. Marca **El paciente aceptó continuar por WhatsApp** y pulsa **Continuar por WhatsApp**. Se envía `SolicitarContinuacion` una sola vez, incluso con doble clic. El guion pasa a **Continuación solicitada** (`CONTINUACION_SOLICITADA`), conserva `COTIZADO` y registra `ConsentimientoContactoWA`. Solo entonces la ficha entrega el código y aparecen **Abrir WhatsApp** y el QR de `/wa?continuar=<código>`. El guion tiene quince pasos visibles. Abre ese enlace en la misma pestaña durante el ensayo mock. El QR para otro dispositivo requiere la API real y una dirección pública accesible. Si falla, **Reintentar** conserva la clave de idempotencia.
4. Al abrir el enlace, `/wa` envía una vez `CONTINUAR <código>`, retira el parámetro de la URL y guarda solo `CONTINUAR ••••` en el historial. El bot retoma en el horario, sin volver a pedir servicio ni sede. Pulsa **Ver horarios**.
5. Pulsa **Ver opciones** y elige **Jueves 26 · 09:15** en la hoja de la lista. La otra sección demuestra la lista y responde con ayuda; el guion fijo continúa con 09:15. Las fechas de ejemplo son del 26 de noviembre de 2026 y se muestran en `America/Mazatlan`.
6. Pulsa **Revisar cita**, **Para mí**, abre la lista de pacientes con **Ver opciones** y elige **Soy Ana P.**. Después pulsa **Abrir formulario** y completa la fecha ficticia en el Flow protegido. **Enviar formulario** deja solo `Fecha de nacimiento ••••` en el historial. Puedes cancelar o usar Escape; Tab y Shift+Tab permanecen en el modal. El mock solo comprueba que llegue el requerido, sin verificar identidad. **Para otra persona** y **No soy ninguno** responden con ayuda sin avanzar. La línea de tiempo registra `DestinatarioDeclarado` e `IdentidadComprobada`; el guion no usa `PacienteReconocido`.
7. Pulsa **Confirmar cita**. Cambia a **App**: se muestra `CONFIRMADA` y un QR generado a partir del token recibido, sin folio. Los tokens del modo mock son ficticios y no sirven como credenciales reales.
8. Cambia a **Clínica** y pulsa **Registrar llegada**. El estado pasa a `EN_CLINICA` y aparece **Turno 1**, según la lectura prefabricada del cliente.
9. Pulsa **Cerrar atención**: el guion llega al paso 14 de 14, **Atención cerrada**, la cita sale de las llegadas y queda `ATENDIDA` en App. El paso nuevo es `ATENDIDA`, con `AtencionCerrada` en clínica.
10. Abre **Admin**: aparecen el conteo por estado, los KPIs, **Sin alertas de seguridad** y la línea de tiempo, incluidos los cambios por Call Center, WhatsApp, App y Clínica. Los eventos se etiquetan en UTC; la hora de las alertas se presenta en la zona del navegador.
11. En **Bandeja** se ven SMS/correo simulados. El código OTP ficticio se muestra solo ahí. Puedes reiniciar el guion desde cualquier ruta.

El simulador no calcula estados, identidad, disponibilidad ni reglas del núcleo. Es una lista fija de respuestas; no constituye una integración funcional con el backend.

En móvil, la barra conserva los siete enlaces en una sola fila: desplázala horizontalmente o recórrela con Tab para llegar a todos los canales. El paso actual permanece visible debajo. La página no necesita desplazamiento horizontal y la cita presenta primero el QR para que quede visible al abrir `/app`.

## Conversación y privacidad

El campo **Número de WhatsApp** comienza con Ana: `5210000000001`. Acepta de 10 a 15 dígitos, sin signos ni espacios. Al cambiarlo se muestra el historial de ese número. El número seleccionado no se guarda como preferencia.

El ANI del call center y el código de continuación no se guardan en almacenamiento del navegador ni se escriben en consola. La ficha usa únicamente el nombre y el teléfono enmascarado de la lectura.

Las burbujas se acumulan por número en `sessionStorage` (llave `noki:wa:<número>`) y se recuperan al cambiar de vista o recargar. Solo se guardan texto, títulos elegidos, mensajes del bot y resúmenes redactados; no solicitudes, códigos de continuación, valores del Flow ni claves de reintento. No se usa localStorage ni IndexedDB. **Nueva conversación** borra el historial activo de la pantalla y de la sesión; no reinicia el trámite. **Reiniciar guion** permite repetir el ensayo. Cerrar la pestaña termina su sesión.

Mientras llega la respuesta aparece **escribiendo…** y los controles se bloquean desde el primer toque. Las opciones de mensajes anteriores quedan deshabilitadas. Si falla un mensaje, **Reintentar** reutiliza su solicitud y su Idempotency-Key, sin duplicar la burbuja.

El Flow presenta controles según la captura: texto, fecha, datos sensibles enmascarados y PIN numérico enmascarado. Los valores solo viven mientras el modal está abierto y durante el transporte; no se registran en consola ni en mutaciones de TanStack Query. Se descartan al enviar con éxito, cancelar o cerrar con Escape. Si falla el envío, **Reintentar envío** conserva la solicitud y clave anteriores; cancela para capturar valores distintos. Mostrar u ocultar el dato solo dura mientras el modal está abierto.

La insignia **Modo simulado** aparece en todas las vistas cuando las respuestas son del guion. En modo real desaparece. La aplicación declara `no-referrer`; el código de continuación se retira de la URL con reemplazo de historial.

Límite conocido: los mensajes iniciados por la empresa sin una acción del usuario necesitan un evento de contrato futuro. Por ahora, el jurado abre el enlace/QR o envía un mensaje; no se simulan entregas espontáneas.

## Cotización web independiente

Abre `/web`, pulsa **Cotizar en Tepic** y después **Continuar en WhatsApp** para mostrar el código `CONTINUAR …` entregado por el cliente. Este mini guion no avanza ni reinicia el Flujo A. El enlace abre `/wa`; la resolución de continuidad del Flujo B completo corresponde a cambios posteriores.

## Modo real

### Identificación opcional por el asesor

En `/callcenter`, después de una respuesta de comando que pida `paciente` con un paso de identificación, la ficha editable ofrece **Identificar paciente (opcional)**. Las opciones y los campos proceden de esa pista. **Capturar datos** abre el mismo modal protegido de WhatsApp; fecha, CURP y datos básicos van enmascarados, sin guardarse en cachés, almacenamiento, consola ni URL. Solo se comprueba la forma del contrato; las reglas de identidad pertenecen al núcleo. Los errores muestran el código y el mensaje públicos, y **Reiniciar identificación** permite volver a empezar. Un reintento conserva valores y clave; cancelar descarta los valores.

El asesor puede seguir cotizando o solicitar continuación sin completar esta sección. Solo existe mientras hay una respuesta de comando en esta pestaña: recargar o abrir otra no recupera la pregunta, aunque la ficha conserve el nombre de pila devuelto por la lectura. La sección desaparece al pasar a solo lectura. **En modo simulado el call center no identifica**: los nuevos pasos están en WhatsApp. El recorrido real sigue pendiente de integrar `api-comandos`.

```powershell
$env:VITE_API = 'real'
$env:VITE_API_URL = 'http://localhost:4000'
$env:VITE_DEMO = 'true'
pnpm --filter @noki/web build
pnpm --filter @noki/web exec vite preview --host 127.0.0.1 --port 4173
```

Abre `/wa` en la vista previa y envía un mensaje. Si la API no está disponible, la burbuja muestra el error de red con **Reintentar**. También puedes abrir `/admin` para consultar `GET /api/admin/kpis`. Si no hay API escuchando, aparece un mensaje de conexión con **Reintentar**. El cliente resuelve las once consultas compartidas con `RUTAS_CONSULTAS` y valida sus respuestas. Los endpoints GET corresponden al frente A; definir el contrato no significa que ya estén implementados. La cotización `web` sigue siendo una consulta exclusiva de demo. WhatsApp usa únicamente el contrato POST de mensajes, sin una consulta de conversación. El modo real no utiliza fixtures como respaldo silencioso. El servidor real deberá permitir el origen de la web para las peticiones entre puertos.

El cliente está preparado para `POST /api/comandos` y `POST /api/canales/wa/mensajes`, con validación antes de enviar y después de recibir. Genera una clave de idempotencia por intento lógico y la conserva durante un único reintento automático de red. Los comandos y los mensajes de WhatsApp conservan su clave al pulsar **Reintentar**. El endpoint real debe respetar Idempotency-Key por mensaje. Un error HTTP válido conserva su código y mensaje públicos; los errores de contrato no muestran los detalles Zod.

Las lecturas compartidas usan los esquemas de `@noki/contracts` y las rutas de [contratos](../../docs/contratos.md). El proveedor resuelve cada ID con prioridad: guion simulado, última respuesta de comando de la pestaña y `contextoDemo` (solo real). La respuesta de comando no expone `pacienteId`: `/app` lo recibe de `contextoDemo`. Se comparte la consulta entre consumidores montados a la vez y se vuelve a pedir al abrir una vista que necesita contexto. Cada respuesta exitosa de WhatsApp refresca las lecturas, sin pasar contenido de mensajes ni capturas al callback. Así, al volver de `/wa` a `/app` se muestran las citas recién confirmadas sin pulsar **Actualizar**. El botón **Actualizar** y la invalidación por eventos siguen disponibles. Si no está habilitada la demo o devuelve nulos, clínica, app y el hilo de administración explican que falta contexto; los fallos de red o contrato se muestran con **Reintentar**. El call center real nuevo espera una llamada propia y no abre el hilo de otra atención indicado por `contextoDemo`. La sesión de paciente real está pendiente del cambio de seguridad; el servidor necesita `DEMO_MODE=true` para `GET /api/demo/contexto`.

El cliente real usa `socket.io-client` **4.8.1 exacta**, con conexión perezosa a `VITE_API_URL` y transporte WebSocket. Valida salas y eventos con el contrato, cuenta referencias para no repetir uniones/salidas y vuelve a unirse a las salas activas tras reconectar. Al llegar un evento válido el proveedor actualiza las lecturas sin recargar; los inválidos se descartan. Las vistas usan `useSala`, sin acceso directo al socket.

| Vista | Salas durante su uso |
|---|---|
| Call center | `hilo:<hiloId>` de la llamada activa |
| Clínica | `sede:<sedeId>` |
| Administración | `admin` y `hilo:<hiloId>` cuando hay hilo |
| App | `paciente:<pacienteId>` |

Cambiar el identificador o salir de la vista libera la sala anterior; en modo simulado la unión no tiene efectos y los eventos siguen saliendo del guion. Antes de integrar con `api-comandos`, confirmar con el frente A que `socket.io` sea **4.x**; una major distinta bloquea la integración. El servidor y el recorrido real de punta a punta siguen pendientes de ese cambio.

Clínica registra desde la lista de llegadas con el QR firmado recibido y muestra la fecha en la zona de la sede. Cada llegada registrada ofrece **Cerrar atención** (envía `CerrarAtencion` con payload vacío). Cada tarjeta conserva su envío y su error; **Reintentar** reutiliza la clave de idempotencia y el doble clic envía una sola vez. Los turnos **Turno N** proceden de `posicion`, sin calcularlos, ordenarlos ni completar los ausentes. Cerrar atención espera la lectura nueva para retirar la cita y mostrar los turnos actualizados. El núcleo decide qué cita puede cerrarse.

Administración muestra los conteos y KPI recibidos, con etiquetas españolas para las siete claves documentadas y la clave original para cualquier otra; no calcula métricas. **Alertas de seguridad** consulta `GET /api/admin/alertas` de forma independiente: muestra canal, hora local del navegador, intentos y **Bloqueado**, en el orden recibido y sin IDs ni datos personales. Ofrece carga, vacío y error con **Reintentar**; un fallo no oculta los conteos, KPI ni la línea de tiempo. La sala `admin` refresca las alertas y la sala de la sede refresca las llegadas sin recargar. Una ficha de solo lectura deshabilita las operaciones del asesor.

En modo real, cerrar atención, recalcular posiciones y consultar alertas usan el núcleo y la API del frente A, disponibles desde `main` `71f01f5`. La web requiere `VITE_API=real` y `VITE_DEMO=true`; la API, `DEMO_MODE=true`, Postgres y Redis locales. La web presenta los errores con **Reintentar**. En clínica basta el QR firmado; no se solicita una comprobación adicional de identidad.

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

La revisión visual debe recorrer el guion a 375 × 812 y 1280 × 900, comprobar navegación con Tab, recarga directa en `/wa`, errores de consola y ausencia de desplazamiento horizontal. El estado real de clínica y alertas y la revisión probada quedan en `openspec/changes/pantallas-clinica-alertas/implementacion.md` y su carpeta `evidencias/`.
