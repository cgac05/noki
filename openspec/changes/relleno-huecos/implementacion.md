# Implementación de relleno-huecos

Revisión 4 autorizada por Christian Avila (`cgac05`) en [handoff.md](handoff.md), sobre `main` local `d37b8c2`. El usuario confirmó en el chat el puerto específico de tokens para D1 y D5 y autorizó sus adaptadores en memoria y `out-security`.

## Implementación

- Dominio y aplicación (1.1–2.2). Once eventos nuevos, agregado de hueco y oferta, selección FIFO, límite semanal y silencio local, elección de estrategia y transición `adelantar` del tipo `AGENDAR`. La saga conserva `CONFIRMADA`, cambia de sede si el hueco es compatible con el interés y guarda primero el nuevo horario. Si falla antes del guardado, libera la reserva nueva y cancela el folio nuevo si existe.
- WhatsApp (2.1–3.2). La aprobación va al contacto vigente del titular de la cita. Los botones de aprobación y oferta solo están disponibles en demo. El adaptador JOSE comprueba firma, uso, vigencia y contacto antes de consumir el JTI en Postgres. El adaptador en memoria usa un identificador opaco y la misma lógica de contacto y consumo. El 403 de la aprobación se persiste con la clave idempotente. Los tres usos de token anteriores conservan su puerto.
- Postgres y API (3.1–3.2). [005_huecos.sql](../../../infra/migraciones/005_huecos.sql) añade intereses, huecos y ofertas. Se persisten la cita, el agregado y sus eventos de outbox en una sola transacción. La reserva única y el bloqueo por hueco coordinan la oleada. El grupo `huecos` procesa las cancelaciones y los adelantos. El programador usa `OFERTA:<ofertaId>` en memoria y `OFERTA-<ofertaId>` en BullMQ. El panel devuelve hasta 50 huecos con sus ofertas ordenadas y la proyección de tiempo real emite `admin:metricas`. El reenvío al abrir WhatsApp conserva el contacto y el JTI originales.
- Semilla (4.1). Ana inicia el Flujo C, Beto espera el horario de Ana y Carla espera el de Beto. La semilla de citas es idempotente. Se conserva el uso de la semilla con migraciones anteriores para las pruebas incrementales. El contexto de demo prefiere el flujo activo con evento de confirmación y encuentra la cita de Ana en una base recién sembrada.
- Archivos y alcance. Cambios en `packages/domain`, `packages/application`, adaptadores, `apps/api`, la migración 005, `tests` y esta carpeta. El manifiesto de 5.1 enumera las rutas. Se conservan los esquemas web actuales y el catálogo compartido queda a cargo del cambio de D12.

## Validación y límites

- Evidencia inicial: [dominio rojo](evidencias/01-rojo.txt), [dominio verde](evidencias/01-verde.txt), [aplicación roja](evidencias/02-rojo.txt), [aplicación verde](evidencias/02-verde-parcial.txt), [migración roja](evidencias/03-rojo.txt) y [Flujo C y oleada verdes](evidencias/03-verde.txt).
- La prueba integrada recorre HTTP y Socket.IO sobre Postgres y la agenda simulada. Comprueba el reenvío, el límite de 50, los KPI en `OfertaEnviada` y `HuecoAsignado`, el efecto dominó y tres aceptaciones simultáneas con un solo ganador. La prueba de BullMQ verifica que la oferta se entrega al worker al adelantar el reloj.
- El cliente web del Flujo C se entrega por el frente B. La validación de este cambio usa las rutas y eventos reales del backend.
- En una oleada se envían hasta cinco ofertas disponibles. Si hay menos de tres candidatos compatibles, se ofrecen los disponibles. El registro de una oferta y su outbox son transaccionales. La programación y el envío por Socket.IO ocurren después del guardado; el chat puede recuperar la oferta vigente al volver a unirse. La compensación por un fallo al liberar la cita anterior registra `COMPENSACION_AGENDA_FALLIDA`, según D5.

- Semilla validada con `corepack pnpm db:migrate` y `corepack pnpm seed` sobre una base de prueba vacía en el puerto 55432. Ambas salieron con código 0 y se contaron tres citas y dos intereses. [Registro de semilla](evidencias/04-semilla.txt).
- Control 5.1 ejecutado en serie con `corepack pnpm`. `lint` y `lint:deps` pasaron. `test` pasó con 443 pruebas y `test:integracion` con 52 pruebas, usando Postgres en 55432 y Redis en 6379. Se verificó que el ancestro común y la referencia remota de `main` siguen en `d37b8c2`. [Lint](evidencias/05-lint.txt) · [Fronteras](evidencias/05-deps.txt) · [Unitarias y web](evidencias/05-test.txt) · [Integración](evidencias/05-integracion.txt) · [Manifiesto](evidencias/05-archivos-entregados.json).
- La migración 005 se verificó también como actualización desde 004, conservando una fila de la bandeja. En el primer control se detectó un esquema de prueba sobrante de un timeout y expectativas de pruebas que aún asumían las cifras anteriores de semilla. Se limpió ese esquema aislado, se ajustaron las expectativas y se repitieron los controles.

## Payloads de D2 para el catálogo compartido

| Evento | Payload |
| --- | --- |
| `InteresAdelantoRegistrado` | `{ interesId, servicioId }` |
| `InteresAdelantoCancelado` | `{ interesId }` |
| `HuecoLiberado` | `{ huecoId, sedeId, recursoId, servicioId, inicio, estrategia }` |
| `OfertaEnviada` | `{ huecoId, ofertaId, expiraEn }` |
| `OfertaAceptada`, `OfertaRechazada`, `OfertaExpirada`, `OfertaPerdida` | `{ huecoId, ofertaId }` |
| `CitaAdelantada` | `{ reservaAnteriorId, reservaId, diasAdelantados }` |
| `HuecoAsignado` | `{ huecoId, ofertaId }` |
| `HuecoDesierto` | `{ huecoId }` |

Los eventos del hueco se atribuyen al trámite y al hilo de la cita que liberó el horario. Los eventos de oferta y `CitaAdelantada` se atribuyen al trámite y al hilo del candidato. `diasAdelantados` se calcula como las horas transcurridas entre ambos horarios divididas por 24.

Para el README: las ofertas se envían entre las 07:00 y las 22:00 en la zona horaria de la sede, con un máximo de tres por paciente en siete días. Si el ensayo empieza en horario de silencio, adelanta el reloj de demo a una hora de envío antes de liberar la cita.
