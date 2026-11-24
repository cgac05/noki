# Design

## Context

Ver `proposal.md` (Why). Estado actual en `apps/web`:

- Las vistas `CallCenter.tsx`, `Clinica.tsx` y `Admin.tsx` ya leen `fichaHilo`, `llegadasSede` y `metricas` mediante `useConsulta`, y envían comandos con `useAccion` (clave de idempotencia reutilizada en el reintento).
- `useContextoConsulta` (`cliente/ProveedorCliente.tsx`) toma el contexto del guion en modo simulado o de la última `RespuestaComando`. En modo real no da `pacienteId`, y tampoco `sedeId` en una pestaña nueva.
- `ClienteReal.suscribir` no hace nada (comentario "corresponde a api-comandos"). `ProveedorCliente` ya invalida todas las consultas al recibir cualquier evento.
- `ClienteReal.consultar` rechaza las consultas `soloDemo` (`bandeja`, `contextoDemo`) si `VITE_DEMO` no es `true`.
- `CallCenter` muestra el enlace con el `codigoContinuacion` de la ficha, que en el guion aparece desde el paso de cotización. No envía `SolicitarContinuacion` ni `contacto`.
- El guion simulado (`cliente/mock/guionFlujoA.ts`) compara cada comando con el esperado mediante JSON exacto. Si no coincide, responde `NO_DISPONIBLE` con la ayuda del paso.

Restricciones: solo `apps/web/**` (más `pnpm-lock.yaml` por la dependencia), sin cambios en `@noki/contracts`, sin lógica de negocio en las vistas (`AGENTS.md`, `PLAN.md` §4) y sin acceso a red fuera del cliente (spec `cliente-api-canales`).

## Goals / Non-Goals

**Goals:**
- Que las tres consolas y `/app` funcionen igual con `VITE_API=mock` y con `VITE_API=real` + `VITE_DEMO=true`, sin tocar vistas al cambiar de modo.
- Un único punto para el tiempo real (cliente) y un único punto para el contexto (proveedor).

**Non-Goals:**
- Probar contra el servidor real de `api-comandos`: aún no existe, y queda como control bloqueado.
- Reconexión con estado offline, colas de reenvío o indicadores de latencia.
- Cualquier selección de hilo, paciente o sede distinta de la que da el contexto (no hay búsqueda de pacientes).

## Decisions

### D1. Salas en la interfaz del cliente, con conteo de referencias
`ClienteApi` gana `unirse(sala): () => void`. El cliente real valida la sala con `SalaSchema` y lleva un conteo por sala. Emite `sala:unirse` con la primera referencia y `sala:salir` cuando se libera la última, y al reconectar reemite `sala:unirse` para las salas con referencias. El simulado devuelve una función vacía. Las vistas usan un hook `useSala(sala | undefined)` del módulo cliente.
- Alternativa: unir a todas las salas al conectar. Se descarta porque el servidor filtra por sala y el contrato define la unión explícita.
- Alternativa: que cada vista emita `sala:unirse`. Se descarta porque rompe "vistas sin acceso directo a la red" y duplicaría la reconexión.

### D2. Conexión perezosa e inyectable
`ClienteReal` crea el socket la primera vez que hay una suscripción o una sala, con la URL base (`VITE_API_URL`) y transporte `websocket`. El constructor acepta una fábrica de socket opcional (como ya acepta `fetch`) para probar con un socket falso que implemente `on`, `off`, `emit`, `connect` y la reconexión. `suscribir` registra el oyente y valida cada dato con `ESQUEMAS_EVENTOS_SOCKET`. Un dato inválido se descarta sin lanzar, sin registrar valores y sin `console.*`.
- Alternativa: un servidor Socket.IO real en las pruebas. Se descarta porque obliga a agregar `socket.io` como dependencia de desarrollo en la configuración raíz, que es archivo compartido.

### D3. Versión de `socket.io-client`
Se fija `socket.io-client` en `4.8.1` exacta, como el resto de dependencias de `apps/web`. La compatibilidad depende de la major del servidor (4.x). Antes de integrar se confirma con el frente A la versión de `socket.io` de `api-comandos`. Si difiere en major, se detiene y se acuerda.

### D4. Orden del contexto
`useContextoConsulta` resuelve cada valor en este orden: guion (modo simulado), última `RespuestaComando` de la pestaña y `contextoDemo` (solo en modo real, con una consulta compartida vía TanStack Query). Si `contextoDemo` falla con `NO_DISPONIBLE` (sin `VITE_DEMO`) o trae nulos, el valor queda indefinido y la vista muestra el estado "sin contexto" con "Actualizar", que invalida esa consulta. Como `ProveedorCliente` invalida todo al recibir eventos, el contexto se refresca solo cuando llega uno.
- Alternativa: pedir el `pacienteId` en `/app` con un campo. Se descarta porque exponer o teclear identificadores no es la experiencia del paciente, y el contrato ya trae `contextoDemo` como fuente provisional.

### D5. Consentimiento y solicitud de continuación
El consentimiento es una casilla en la vista ("El paciente aceptó continuar por WhatsApp"). Solo habilita el botón: no se envía como dato porque `SolicitarContinuacion` ya registra el consentimiento en el núcleo. El envío pasa por `useAccion`, que bloquea el doble envío y conserva la clave en el reintento. El enlace y el QR salen del `codigoContinuacion` de la ficha. La vista no conserva el código en estado propio ni en almacenamiento.

### D6. ANI
Campo `tel` con el patrón del contrato (`/^\d{10,15}$/`) y `CONTACTO_DEMO` como valor inicial, igual que en `/wa`. Se envía en `payload.contacto` y se descarta después; la ficha solo muestra lo que devuelve la lectura.

### D7. Guion simulado
- `IniciarTramite` esperado pasa a incluir `contacto: CONTACTO_DEMO`.
- Se inserta un paso `CONTINUACION_SOLICITADA` entre `COTIZADO` y `CONTINUAR_WA`: espera `SolicitarContinuacion` del call center, responde con el trámite en `COTIZADO` y un evento en la línea de tiempo con canal `callcenter`, y desde ese paso la ficha trae `codigoContinuacion`.
- Se ajustan el total de pasos, las versiones del trámite y los índices dependientes, como `oferta` y `codigoContinuacion`.

El evento de la línea de tiempo es `ConsentimientoContactoWA`, que está en el catálogo de `docs/eventos.md` (`PLAN.md` §7).

### D8. Etiquetas de KPI
Un mapa de presentación en la web traduce las claves documentadas (`cambiosCanal`, `cambiosCanalPorHilo`, `tramitesRecuperados`, `citasConfirmadas`, `llegadasRegistradas`, `datosRepetidos`, `intentosVerificacionFallidos`) a nombres en español. El valor se muestra tal cual, formateado como número, y las claves desconocidas aparecen con su clave. No hay cálculos en la vista.

### D9. Salas por consola
| Vista | Salas |
|---|---|
| `/callcenter` | `hilo:<hiloId>` |
| `/clinica` | `sede:<sedeId>` |
| `/admin` | `admin` y `hilo:<hiloId>` |
| `/app` | `paciente:<pacienteId>` |

Cada vista se une solo cuando tiene el identificador.

## Risks / Trade-offs

- [El servidor real no emite en las salas esperadas o usa otros nombres] → Las salas y eventos son los de `SalaSchema` y `EVENTOS_SOCKET`. La verificación real queda bloqueada hasta `api-comandos` y se repite en la integración conjunta.
- [Major distinta de Socket.IO entre cliente y servidor] → D3: confirmar antes de integrar y detener si difiere.
- [`contextoDemo` apunta al último hilo con cita confirmada, no al que opera el asesor] → La última respuesta de comando de la pestaña tiene prioridad (D4). En otra pestaña, el call center sin comando previo muestra "Llamada entrante", no un hilo ajeno.
- [Insertar un paso en el guion rompe pruebas y evidencias que cuentan pasos] → Se actualizan en el mismo grupo de tareas que el guion, y el recorrido completo se comprueba en el grupo final.
- [Invalidar todas las consultas con cada evento genera lecturas de más] → Es aceptable para la demo. Optimizar por sala queda fuera de alcance.

## Migration Plan

- Sin migración de datos.
- Antes de integrar: rebase sobre `main`, `pnpm install` (dependencia nueva) y confirmación de la versión de Socket.IO con el frente A.
- Reversión: revertir el commit. El modo simulado no depende del servidor.
