# Diseño: web-identificacion

- **D1. Teléfono primero.** `WebReal` pide el teléfono con la misma validación que el ANI de `/callcenter` y lo manda en `IniciarTramite.payload.contacto`. El resto de la secuencia de cotizar no cambia.
- **D2. Identificación reutilizada.** `armarIdentificacion` recibe `canal` y `actor` (por defecto `callcenter` / `asesor:asesor1`, para no tocar `/callcenter`). El componente de identificación se generaliza (props `canal`, `actor`, `capturaAsesor`); `/web` lo usa con `web`, `paciente` y `capturaAsesor=false`. La pista sale de `siguientePregunta` de la última respuesta de comando, como en `/callcenter`.
- **D3. Selectores siempre.** En `ModalFlow`, los selectores de `sexo` y `entidadNacimiento` se muestran en cualquier modo; `capturaAsesor` solo controla el enmascarado. `/wa` no usa esos campos en Flow tras `wa-una-pregunta`, así que no cambia.
- **D4. Continuación con paciente.** El botón «Continuar en WhatsApp» se habilita cuando la respuesta del trámite trae `pacienteId` o la `siguientePregunta` ya no es la casilla `paciente`.

## Revisión 2 (SUSTITUIDA por la revisión 3; no implementar D5–D8)

Cita: «es una simulacion asumamos que quien usa la web y esta haciendo el registro ya se encontraba validada con su curp y numero de telefono dejando el numero de telefono como predeterminado porque aunque se rota es mas facil de recordar».

- **D5. Confianza de la web solo en demo.** En `rutasComandos.ts`, con `deps.demo === true`, `IdentificarPaciente` con canal `web` y actor `paciente` no exige la credencial de contexto: se trata como sesión web ya validada y el contacto es el teléfono del hilo. Con `demo` falso el comportamiento no cambia (`STEP_UP_REQUERIDO`). Ningún otro canal ni comando cambia.
- **D6. Orden en web.** En `packages/domain/src/tipos/agendar.ts`, `ordenPorCanal.web` pasa a `servicio, sede, paciente, horario, requisitos, elegibilidad`, para identificar justo después de elegir el estudio. WhatsApp y app no cambian.
- **D7. Navegación de sitio web.** `/web` permite explorar el catálogo sin crear trámite: filtrar o recorrer servicios y sedes, ver el precio de varias opciones y volver atrás en cada paso con «Volver» (también con el botón atrás del navegador si es sencillo, con estado en la URL o en el historial). Solo al pulsar «Agendar este estudio» se pide el teléfono y se envían los comandos. Desde la identificación, «Volver» regresa a la elección de estudio sin perder el teléfono; si ya existe trámite, cambiar de estudio reenvía `SeleccionarServicio`/`SeleccionarSede` sobre el mismo trámite.
- **D8. Teléfono como identificador principal.** El teléfono es obligatorio y precarga la identificación; la CURP o la fecha de nacimiento son el dato adicional que pide el núcleo.

## Revisión 3 (decisión de Christian, 2026-11-25 12:55 UTC)

Citas: «o incluso para la simulacion vamos a empezar en call center o ws y como ultima parada web o es mejor web al inicio ?» y «y al final siempre termina el pago en web». El coordinador confirmó: la web es la última parada y ahí termina el pago; identificación completa y cotizar varios pasan a segundo plano; «Volver» se queda.

- **D9. Entrada por teléfono (demo).** `/web` en modo real abre con «Paga tu cita»: el paciente escribe su teléfono (10 a 15 dígitos; se muestra enmascarado salvo los últimos 4). Con `VITE_DEMO=true`, la vista usa `contextoDemo` (como `/app`) para obtener el `pacienteId` y consulta `citasPaciente`; se asume la sesión ya validada (simulación). Sin paciente en contexto muestra «No encontramos citas pendientes» con enlace a `/wa` y `/callcenter`.
- **D10. Pago simulado.** Por cada cita `CONFIRMADA` muestra servicio, sede, fecha en la sede y el precio de `catalogo` (servicio + sede). «Pagar» abre una confirmación con «Volver»; al confirmar muestra «Pago simulado registrado» con un folio de pago generado en el cliente (no es el folio de la cita) y la cita queda marcada como pagada en `sessionStorage` (envuelto en try/catch). No hay comando, evento ni cambio en la API: el núcleo no tiene pagos y PLAN.md §60 excluye pagos reales. La pantalla dice claramente «Simulación: no se realiza ningún cobro».
- **D11. «Volver».** Cada paso de `/web` (teléfono → citas → confirmar pago → recibo, y cotizar) tiene «Volver» al paso anterior.
- **D12. Cotizar queda secundario.** La cotización actual (con teléfono, D1) se conserva debajo, como «¿Aún no tienes cita? Cotiza un estudio».
- **D13. Pagar con CoDi (12:55 UTC, Christian: «agrega un boton de pagar con codi que abrar el qr generico y al dar clic sobre el se marque como pagado»).** El botón de pago de D10 se llama «Pagar con CoDi» y muestra un QR genérico de CoDi (con `QrCita`, contenido fijo de demo, sin datos personales). Hacer clic o pulsar Enter sobre el QR (elemento accesible con `role="button"` y etiqueta «Simular pago con CoDi») marca la cita como pagada y muestra el recibo simulado de D10. «Volver» cierra el QR sin pagar.
