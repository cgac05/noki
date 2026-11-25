# Design

## Context

Ver `proposal.md` (Why). Estado actual:

- **Contrato** (`packages/contracts`, sin cambios aquí): `IdentificarPacienteSchema` con payload discriminado por `paso` (`DESTINATARIO`, `CONFIRMAR`, `FECHA_NAC`, `CURP`, `DATOS`, `REINICIAR`) y `pista.paso` opcional en `SiguientePregunta`.
- **Núcleo**, según `packages/domain/src/tipos/agendar.ts` y el spec `siguiente-pregunta`, «Pista de interfaz coherente con el contrato»:
  - `DESTINATARIO`: `BOTONES` con opciones `MI` y `OTRA_PERSONA`.
  - `CONFIRMAR`: `LISTA` con una opción por candidato (payload = referencia opaca) más `NINGUNO`.
  - `FECHA_NAC`: `FLOW` con el campo `fechaNac`.
  - `CURP`: `FLOW` con el campo `curp` y la opción `SIN_CURP`.
  - `DATOS`: `FLOW` con `nombre`, `apellidoPaterno`, `apellidoMaterno` (opcional) y, sin CURP, `fechaNac`, `sexo` y `entidadNacimiento`.
  - Los ids de campo coinciden con las claves del payload, y todos los campos son `sensitive` sin valor inicial.
- **Orden en `callcenter`**: `paciente` va primero, así que tras `IniciarTramite` o cualquier comando del asesor la respuesta pide `paciente` mientras la casilla siga vacía.
- **Web**:
  - `CallCenter.tsx` guarda la última `RespuestaComando` en `useRespuestaComando`.
  - `ModalFlow.tsx` captura campos `sensitive` enmascarados, valida requeridos, permite reintentar el mismo envío y descarta los valores al cerrar.
  - `useAccion` guarda las variables en la `MutationCache` de TanStack Query, lo que `simulador-whatsapp` prohíbe para datos del Flow.
- **Guion**: la verificación de `/wa` son los pasos `VERIFICACION` (Flow con `fechaNac`) y `VERIFICADA`. Las respuestas del call center piden `servicio`, no `paciente`.

## Goals / Non-Goals

**Goals:**
- Pintar cualquier paso de identificación a partir de la pista, sin tablas de preguntas en la web.
- Aplicar a la consola las mismas garantías de privacidad que al Flow de `/wa`.

**Non-Goals:**
- Recuperar la pregunta tras recargar la pestaña. No hay consulta para eso, y agregarla sería un cambio de contrato.
- Validar reglas de identidad en la web (dígito verificador, concordancia, bloqueos). Lo hace el núcleo; la web solo valida la forma del contrato.

## Decisions

### D1. Fuente de la pregunta
La sección se alimenta de `useRespuestaComando().respuesta.siguientePregunta` cuando es `PREGUNTA`, con `casilla === 'paciente'` y `pista.paso` definido. Cada comando del asesor actualiza esa respuesta (incluidos los de identificación, mediante `recordar`), así que la sección avanza sola. Tras recargar no hay respuesta y la sección no aparece; la ficha sigue mostrando el nombre de pila que devuelva la lectura.
- Alternativa: deducir el paso de la ficha. Se descarta porque la ficha no expone el estado de identificación, y deducirlo sería lógica de negocio.

### D2. Armado del payload por paso, guiado por el contrato
Un módulo del cliente (`cliente/identificacion.ts`) traduce una respuesta del asesor a `IdentificarPaciente`:

| Paso | Respuesta | Payload |
|---|---|---|
| `DESTINATARIO` | opción | `{ paso, para: payload }` |
| `CONFIRMAR` | opción | `{ paso, candidato: payload === 'NINGUNO' ? null : payload }` |
| `CURP` | opción `SIN_CURP` | `{ paso, curp: null }` |
| cualquier paso | campos | `{ paso, ...valores }`, con el `id` de cada campo como clave |
| `REINICIAR` | — | `{ paso: 'REINICIAR' }` |

Los valores se recortan (`trim`), los opcionales vacíos se omiten y `curp`, `sexo` y `entidadNacimiento` se pasan a mayúsculas, porque sus valores válidos en el contrato son mayúsculas. El resultado se valida con `ComandoRequestSchema` antes de enviarse. Si falla, se devuelven los `id` de los campos con error, sin valores. Una opción o paso desconocido produce un error de contrato y no se envía nada.
- Alternativa: mapear cada opción por su título. Se descarta porque los títulos son texto de presentación del núcleo.

### D3. Envío fuera de `useAccion`
Un hook `useIdentificacion` envía con `cliente.enviarComando(comando, { idempotencyKey })` y guarda el pendiente (`comando` y `clave`) en un `useRef`. No usa TanStack Query para la mutación. Un candado síncrono evita el doble envío. Al tener éxito llama a `recordar(respuesta)`, invalida las consultas y borra el pendiente. Al fallar conserva el pendiente para reintentar con la misma clave, y cancelar o desmontar lo borra. Los errores se muestran con el `codigo` y el `mensaje` del `ErrorCliente`.
- Alternativa: reutilizar `useAccion`. Se descarta porque guardaría CURP y fecha en la `MutationCache`.

### D4. Reutilizar `ModalFlow` para los campos
Para una pista `FLOW` se abre `ModalFlow` con `{ tipo: 'flow', titulo: 'Identificar paciente', campos: pista.campos }`. Su `onEnviar(valores)` arma el comando (D2) y lo envía (D3). `ModalFlow` gana una prop opcional `validar(valores) => string[]` que marca en error los campos indicados sin enviarlos, con el mensaje «Revisa el formato de este campo». Sin la prop, `/wa` se comporta igual que hoy. Las opciones de una pista `FLOW` (como `SIN_CURP`) se muestran como botones junto a «Capturar datos».
- Alternativa: un formulario nuevo para el asesor. Se descarta porque duplicaría el enmascarado, el foco atrapado y el descarte que `ModalFlow` ya prueba.

### D5. Ubicación y visibilidad en la ficha
La sección va dentro de la ficha, después de los datos del paciente y antes de la cotización. Su título es «Identificar paciente (opcional)», seguido del paso, las opciones y los campos, y «Reiniciar identificación». No se muestra con `soloLectura`, y no deshabilita la cotización ni la continuación.

### D6. Guion simulado
`VERIFICACION` y `VERIFICADA` se sustituyen por cuatro pasos, de modo que el guion pasa de 11 a 13 pasos:

| Paso | Espera | Responde |
|---|---|---|
| `IDENTIFICACION_DESTINATARIO` | «Revisar cita» | Botones «Para mí» / «Para otra persona» y `paciente` con `paso: 'DESTINATARIO'` |
| `IDENTIFICACION_CONFIRMAR` | Botón `MI` | Lista con «Soy Ana P.» (referencia opaca ficticia) y «No soy ninguno», `paso: 'CONFIRMAR'` y evento `DestinatarioDeclarado` |
| `IDENTIFICACION_FECHA` | Fila de Ana | Flow «Fecha de nacimiento» (`fechaNac`, `sensitive`, requerido) y `paso: 'FECHA_NAC'` |
| `VERIFICADA` | `flowResponse` completo | Botón «Confirmar cita» y evento `IdentidadComprobada` |

- `OTRA_PERSONA` y `NINGUNO` caen en la ayuda del paso, sin avanzar.
- Las versiones y los números de evento se recalculan de forma consecutiva.
- `PacienteReconocido` desaparece del guion.
- Las respuestas del call center no cambian: siguen pidiendo `servicio`, así que la sección de D5 no aparece en simulado. Esto lo decidió el usuario.

## Risks / Trade-offs

- [El núcleo cambia los payloads de las opciones o los ids de campo] → D2 valida con el contrato antes de enviar, y una prueba fija la convención con las pistas del dominio. Si cambia, se detiene y se coordina con el frente A.
- [Tras recargar, el asesor pierde la sección] → Es aceptable para la demo y está documentado. La identificación puede seguir en WhatsApp, que retoma el paso (`identificacion-paciente`, «Identificación retomada en otro canal»).
- [`sexo` y `entidadNacimiento` como texto libre generan errores de formato] → Se pasan a mayúsculas y se valida antes de enviar con un mensaje por campo. Los selectores quedan fuera de alcance.
- [En simulado no se ve la identificación del asesor] → Se cubre con pruebas de la vista con `ClienteReal` y `fetch` falso, y se verifica de punta a punta cuando llegue `api-comandos`.

## Migration Plan

Sin migración. Reversión: revertir el commit. El guion vuelve a su versión anterior.
