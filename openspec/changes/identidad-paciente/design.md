# Design

## Context

- `Tramite.asignarPaciente(pacienteId, ctx, datos)` llena la casilla `paciente`; no existe registro de pacientes. `PacientesPort` ofrece `datosElegibilidad`, `coincideFechaNac` y `buscarPorDatos`.
- `contacto_canal` es único por `(canal, valor_externo)` y tiene un hilo (`002`); `vinculo` es `(contacto, paciente)` con `relacion`, `metodo` y `nivel`. Un contacto ya puede tener varios pacientes; lo que falta es que el resolvedor deje de tratar cualquier vínculo como prueba de identidad.
- `paciente.curp` existe (`001`) sin uso ni unicidad. Los logs ya redactan `curp`.
- `api-comandos` (en pausa, sin commit) tiene `003_api.sql` y un motor de WhatsApp que pregunta `paciente` con un Flow fijo.

## Goals / Non-Goals

Goals: identificar o registrar al paciente sin usar el teléfono como identidad, sin revelar datos de registros encontrados y con continuidad entre canales a mitad de la identificación. Non-goals: ver proposal (Fuera de alcance).

## Decisions

### D1. "¿Eres X?" con nombre enmascarado y confirmación por fecha (revisión 2)

Decisión de Christian (2026-11-24): en el pre-registro por teléfono sí se pregunta "¿eres X?"; si la persona se identifica no se pide CURP, salvo que agende para otra persona.
- Riesgo: el número puede ser de un familiar o estar reasignado, y mostrar el nombre revela un dato que el usuario no dio (`AGENTS.md` §8). Mitigación: (a) solo se muestra el nombre de pila más la inicial del apellido paterno ("Ana P."), nunca apellidos completos, fecha ni CURP; (b) solo de vínculos del número con uso en los últimos 180 días (`VIGENCIA_VINCULO_DIAS`), así un número reasignado hace tiempo no muestra a nadie; (c) elegir un nombre no identifica: hay que confirmar con la fecha de nacimiento de ese paciente, y un fallo cuenta intento (3 → bloqueo de 15 min); (d) siempre existe la opción "No soy ninguno".
- Con más de un candidato (familia) se listan todos, hasta 9, más "No soy ninguno". Sin candidatos este paso no aparece.
- Vale igual en WhatsApp y en el call center: el asesor ve las mismas opciones enmascaradas.
- Alternativa (revisión 1): no mostrar nombres y comparar la fecha contra todos los vinculados. Reemplazada por la decisión de Christian.

### D2. Pasos como estado del trámite

`DatosTramite` gana `identificacion?: { relacion?: 'TITULAR' | 'FAMILIAR'; candidatos?: { ref: string; pacienteId: PacienteId; nombreVisible: string }[]; elegido?: string; ninguno?: true; fechaNac?: string; curp?: string; sinCurp?: true }`. `ref` es un ID opaco del `GeneradorId` (nunca el `pacienteId`). El paso actual se calcula:
- sin `relacion` → `DESTINATARIO`;
- `TITULAR` (para mí): con `candidatos` no vacíos y sin `elegido` ni `ninguno` → `CONFIRMAR`; sin `fechaNac` → `FECHA_NAC` (con `elegido`, es la confirmación de ese candidato); sin `curp` ni `sinCurp` → `CURP`; si no → `DATOS`;
- `FAMILIAR` (otra persona): sin `curp` ni `sinCurp` → `CURP`; si no → `DATOS` (que pide también la fecha si no hay CURP).
Se guarda en `tramite.datos` (ya serializado en `002`), así un trámite empezado en el call center sigue en el mismo paso en WhatsApp. Al asignar paciente se borra `identificacion` salvo `relacion`.
- Fecha, CURP y nombres visibles pendientes son datos personales en el estado del trámite. Aceptable: `tramite.datos` no es un log ni un evento; MUST NOT aparecer en `TramiteVista`, eventos ni logs, y se borran al asignar. Los nombres enmascarados solo salen en la pista del paso `CONFIRMAR`.
- Alternativa: guardar los pasos en la conversación del canal (`conversacion_wa` de `api-comandos`). Descartada: rompe la continuidad entre canales.
- Volver al inicio se hace con `paso: 'REINICIAR'`, que borra `identificacion` sin contar intento.

### D3. Comando único con payload por paso

`IdentificarPaciente` con `payload` discriminado por `paso`:
`{ paso: 'DESTINATARIO', para: 'MI' | 'OTRA_PERSONA' }` · `{ paso: 'CONFIRMAR', candidato: string | null }` (`ref` de la opción; null = "No soy ninguno") · `{ paso: 'FECHA_NAC', fechaNac }` · `{ paso: 'CURP', curp: string | null }` (null = "No la tengo") · `{ paso: 'DATOS', nombre, apellidoPaterno, apellidoMaterno?, fechaNac?, sexo?, entidadNacimiento? }` · `{ paso: 'REINICIAR' }`.
Un paso que no corresponde al estado, o un `candidato` que no es una `ref` del trámite → `ReglaViolada('PASO_IDENTIFICACION_INVALIDO', { esperado })`. En `DATOS`, `fechaNac` es obligatoria si no se dio antes ni hay CURP; `sexo` y `entidadNacimiento`, solo sin CURP. Un solo comando mantiene un solo caso de uso, una sola traducción HTTP y una sola entrada en el motor de WhatsApp.

### D4. CURP en el dominio

Funciones puras en `packages/domain/src/identidad/curp.ts`:
- `validarCurp(curp)`: 18 caracteres con el patrón oficial (`^[A-Z][AEIOUX][A-Z]{2}\d{6}[HMX](AS|BC|…|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d$`), fecha real, y dígito verificador (posición 18) calculado sobre las 17 anteriores con el diccionario `0-9A-NÑO-Z` y pesos 18…2.
- `curpBase(datos)`: los 16 caracteres calculables (letras de apellidos y nombre, fecha, sexo `H`/`M`, entidad, consonantes internas), con: mayúsculas sin acentos, `Ñ`→`X`, partículas omitidas (`DA, DAS, DE, DEL, DER, DI, DIE, DD, EL, LA, LOS, LAS, LE, LES, MAC, MC, VAN, VON, Y`), primer nombre omitido si es `JOSE`/`J`/`MARIA`/`MA`/`M` y hay otro, apellido materno ausente → `X`, palabras inconvenientes del instructivo → segunda letra `X`. La homoclave (17) y el verificador (18) no se calculan: los asigna RENAPO.
- Sexo `X` del paciente: `curpBase` no se calcula (devuelve `undefined`) y `curp_base` se guarda nula; el registro funciona igual, solo no se podrá encontrar después por `curp_base` (con CURP completa se encuentra por `curp` exacta).
- Concordancia en `DATOS` con una CURP pendiente (revisión 3): se comparan solo los caracteres derivados de nombre y apellidos (posiciones 1–4 y 14–16) con los que produce el cálculo de `curpBase` para esos nombres; la fecha (5–10) ya se comprobó contra la fecha declarada en el paso `CURP`; sexo (11) y entidad (12–13) se toman de la propia CURP y no se comparan. Así la regla es la misma para `H`, `M` y `X`.
- Una CURP dada debe concordar con lo declarado: su fecha con `fechaNac` si ya se dio y, en `DATOS`, sus 16 primeros caracteres con `curpBase` de los nombres más los datos de la CURP. Si no, `CURP_NO_COINCIDE`.

### D5. Búsquedas y registro (aplicación)

`CasosTramite.identificarPaciente(tramiteId, payload, valorContacto, ctx)`, con el contacto del canal del comando. Con el contacto bloqueado, el paso `FECHA_NAC` con candidato elegido falla con `ReglaViolada('IDENTIFICACION_BLOQUEADA', { hasta })`.
1. `DESTINATARIO` → con `MI`, `ContactosPort.pacientesPorTelefono(normalizarTelefono(valor), desde)` devuelve los pacientes vinculados a cualquier contacto con esos 10 dígitos, en cualquier canal, con `ultimo_uso` dentro de 180 días según el `Reloj`, con nombre y apellido paterno; la aplicación arma `nombreVisible` con `enmascararNombre` (dominio) y una `ref` por candidato (máximo 9). `Tramite.declararDestinatario(relacion, candidatos)` → `DestinatarioDeclarado{relacion}` (sin candidatos en el evento). Con `OTRA_PERSONA` no se busca.
2. `CONFIRMAR` → guarda `elegido` o `ninguno`.
3. `FECHA_NAC` → con `elegido`: `coincideFechaNac(pacienteId del elegido)`. Coincide → asignar, vínculo nivel 1 `TELEFONO_FECHA_NAC`, `IdentidadComprobada{pacienteId, metodo}`; no se pide CURP. No coincide → intento fallido con `IntentoVerificacionFallido{metodo: 'TELEFONO_FECHA_NAC', intentos}`, se borra `elegido` y se vuelve a `CONFIRMAR`, con un resultado que no dice cuál dato falló. Sin `elegido` (no hubo candidatos o "No soy ninguno"): se guarda la fecha y se pasa a `CURP`, sin intento.
4. `CURP` → `validarCurp`; fecha distinta de la ya dada → `CURP_NO_COINCIDE` (sin intento). `buscarPorCurp` (exacta) y, si no hay, `buscarPorCurpBase(curp[0..16])` entre pacientes sin CURP. Uno → asignar, completar `curp` del paciente si estaba vacía, vínculo nivel 0 `FLOW_DECLARADO`. Varios por base → `IDENTIDAD_AMBIGUA` (se deriva a personal). Ninguno → guardar CURP y pasar a `DATOS`. `null` → `sinCurp` y pasar a `DATOS`.
5. `DATOS` → con CURP: fecha, sexo y entidad salen de la CURP. Sin CURP: la fecha (guardada o del payload), sexo y entidad del payload. Se calcula `curpBase`. Reutilizar: si `buscarPorDatos` (nombre, apellidos, fecha) da uno solo **y** su `curp_base` coincide o es nula, se asigna ese; varios → `IDENTIDAD_AMBIGUA`. Si no, `PacientesPort.registrar(...)` con id de `GeneradorId`, `nivel_identidad` 0 → `PacienteRegistrado{pacienteId}` y asignar. Vínculo nivel 0 `FLOW_DECLARADO`.
- Al asignar se usan las mismas reglas que `asignarPaciente` (elegibilidad con los datos del paciente, `PacienteAsignado`). La relación del vínculo es `TITULAR` si `para: 'MI'` y `FAMILIAR` si `OTRA_PERSONA`. Si el par contacto-paciente ya existe (revisión 4): una operación de nivel igual o mayor al guardado actualiza `nivel` y `ultimo_uso`; una de nivel menor no modifica el vínculo (conserva su nivel y su `ultimo_uso`). Así una declaración de nivel 0 no reactiva un vínculo de nivel 1 vencido para la prioridad 2 ni para `CONFIRMAR`.
- Registro concurrente con la misma CURP: la unicidad parcial de `curp` en Postgres hace fallar al segundo; el adaptador lo traduce a "ya existe" y el caso de uso reintenta la búsqueda una vez y asigna el existente.
- Ninguna respuesta del caso de uso distingue "no existe" de "no coincide" salvo las reglas de formato (`CURP_INVALIDA`, `CURP_NO_COINCIDE`) que solo dependen de lo que el usuario escribió.

### D6. Vínculos de nivel 0 e inactivos en la continuidad

En el resolvedor, la prioridad 2 solo considera vínculos con `nivel ≥ 1` y `ultimo_uso` dentro de 180 días según el `Reloj` (constante `VIGENCIA_VINCULO_DIAS` del dominio). Los demás se ignoran como si no existieran (sin intento). Así, declarar la CURP de otra persona permite agendarle una cita y, como mucho, ver su nombre enmascarado en el paso `CONFIRMAR` de ese teléfono (que no la identifica sin la fecha), como ya permite la política (`agendar` sin requisito), pero no ver sus trámites, y el nuevo dueño de un número reasignado no hereda nada. La prioridad 3 (teléfono capturado) compara con `normalizarTelefono`.
- Alternativa: degradar el nivel guardado con un trabajo periódico. Descartada: necesita BullMQ (fuera) y la regla en lectura es suficiente.

### D7. Quién usa `AsignarPaciente`

Con actor `paciente`, `asignarPaciente` por ID permitiría asignar cualquier UUID. Queda solo para actores internos (`asesor`, `recepcion`, `sistema`); con `paciente` → `ReglaViolada('ASIGNACION_SOLO_PERSONAL')`. Los canales del paciente usan `IdentificarPaciente`. La prueba obligatoria de continuidad ya asigna como asesor.

### D8. Migración `003_identidad`

```sql
ALTER TABLE paciente ADD COLUMN entidad_nac text CHECK (entidad_nac ~ '^[A-Z]{2}$'),
  ADD COLUMN curp_base text CHECK (curp_base ~ '^[A-Z]{4}\d{6}[HM][A-Z]{5}$'),
  ADD CONSTRAINT paciente_curp_formato CHECK (curp ~ '^[A-Z]{4}\d{6}[HMX][A-Z]{5}[A-Z\d]\d$');
CREATE UNIQUE INDEX paciente_curp_unica ON paciente (curp) WHERE curp IS NOT NULL;
CREATE INDEX paciente_curp_base ON paciente (curp_base) WHERE curp IS NULL;
-- vinculo.metodo: se reemplaza el CHECK para admitir 'TELEFONO_FECHA_NAC'
CREATE INDEX contacto_telefono ON contacto_canal (right(valor_externo, 10)) WHERE canal IN ('whatsapp','callcenter');
```
Las filas existentes no tienen CURP, así que todos los CHECK pasan. El nombre del CHECK de `vinculo.metodo` se toma de `001` (nombre generado por Postgres) con `DO $$ … $$` que lo busca en `pg_constraint`, para no editar `001`.
- Numeración: este cambio llega a `main` antes que `api-comandos`, así que toma `003`; `api-comandos` renombra la suya a `004_api.sql` en su revisión 4. Alternativa: `004_identidad` dejando el hueco. Descartada: Kysely rechaza aplicar `003_api` después de `004` en una base existente.

### D9. Contrato

- `IdentificarPacienteSchema` en `comandos.ts` como D3, `fechaNac` con `z.iso.date()`, `curp` con el patrón de D4 en mayúsculas (sin dígito verificador: lo comprueba el dominio para poder responder `CURP_INVALIDA`), `entidadNacimiento` con `ENTIDADES_NACIMIENTO` (32 claves + `NE`), `sexo` `F | M | X`.
- `SiguientePreguntaSchema`: `pista.paso?: 'DESTINATARIO' | 'CONFIRMAR' | 'FECHA_NAC' | 'CURP' | 'DATOS'`. Opcional para no romper `apps/web`; el dominio lo envía siempre que la casilla es `paciente`.
- Pistas por paso (dominio): `DESTINATARIO` → `BOTONES` con opciones `MI` ("Para mí") y `OTRA_PERSONA` ("Para otra persona"); `CONFIRMAR` → `LISTA` con una opción por candidato (título "Soy <nombreVisible>", payload su `ref`) y `NINGUNO` ("No soy ninguno"); `FECHA_NAC` → `FLOW` con `fechaNac` `sensitive`; `CURP` → `FLOW` con `curp` `sensitive` y la opción `SIN_CURP` ("No la tengo"); `DATOS` → `FLOW` con nombre y apellidos y, según lo pendiente, `fechaNac`, `sexo` y `entidadNacimiento`, todos `sensitive`, sin valores iniciales.
- `enmascararNombre(nombre, apellidoPaterno)` (dominio): primer nombre con mayúscula inicial más la inicial del apellido paterno y punto ("Ana P.").
- Sin vistas nuevas: `TramiteVista` no lleva identificación ni datos personales.

## Risks / Trade-offs

- [Cálculo de CURP incompleto] → solo afecta la búsqueda por `curp_base`; casos de prueba sintéticos por regla (partícula, compuesto, Ñ, inconveniente, sin materno).
- [Pacientes duplicados] → registro sin CURP de la misma persona con datos escritos distinto crea otro paciente. Mitigación parcial: reutilizar por datos exactos y por `curp_base`; la fusión queda fuera.
- [Revelar nombres por el número] → mitigado en D1 (enmascarado, vigencia de 180 días, confirmación por fecha, "No soy ninguno"). Riesgo residual aceptado por Christian el 2026-11-24 ("pues para eso es la confirmacion con la fecha"): quien tenga el número dentro de esa ventana ve el nombre de pila y una inicial.
- [Datos pendientes en `tramite.datos`] → se borran al asignar; prueba de que no salen en vistas, eventos ni logs.
- [`api-comandos` en pausa] → su revisión 4 depende de este cambio; ver proposal (Impact).

## Migration Plan

1. Integrar este cambio en `main` con PASS y vistos buenos de ambos frentes.
2. `api-comandos`: rebase, revisión 4 (renombrar a `004_api.sql`, sustituir D6 regla 6, traducir `IdentificarPaciente`), autorización y continuar.
3. Frente B: rebase; adoptar `IdentificarPaciente` en `consolas-internas` cuando lo implemente.
Rollback: la migración solo agrega columnas, índices y un valor de CHECK; revertir el código basta para la demo (`pnpm demo:reset`).

## Open Questions

- Revisión 2: D1 lo decidió Christian. Falta que confirme: `apps/web` fuera de este cambio; D8 (`003_identidad` y `004_api`); D6 y D7 (vínculos de nivel 0 o inactivos fuera de la prioridad 2, `AsignarPaciente` solo para personal) y la vigencia de 180 días.
