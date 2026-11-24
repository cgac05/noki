# Proposal

## Why

Hoy el núcleo solo llena la casilla `paciente` con un `pacienteId` ya conocido (`AsignarPaciente`) y `api-comandos` planeaba identificarlo con un Flow de nombre, apellidos y fecha de nacimiento que debe coincidir exacto con un único registro. Eso deja tres huecos que Christian pidió cerrar antes de seguir con la API:

1. **El teléfono funciona en la práctica como identidad.** El contacto (`wa_id` o ANI) tiene un solo hilo y cualquier vínculo con un paciente basta para revelar sus trámites abiertos (prioridad 2 del resolvedor). Los números se reasignan: el nuevo dueño de un número vería servicio y sede de la persona anterior. `PLAN.md` §8 ya dice que el teléfono es un factor de posesión, no una identidad; falta aplicarlo.
2. **No hay forma de registrar a un paciente nuevo** ni de usar la CURP, que ya existe como columna `paciente.curp` sin uso.
3. **Quien agenda puede no ser el paciente** (una madre que agenda para su hijo, alguien que llama por un familiar). El flujo actual supone que el contacto es el paciente.

El flujo pedido, pensado para WhatsApp y call center: por el teléfono se buscan registros previos; si la persona ya está registrada se confirma solo con la fecha de nacimiento; si no, se pide la CURP; si no la tiene, se piden datos básicos con los que se calcula la parte calculable de la CURP. Antes de todo se pregunta para quién es la cita.

## What Changes

- **Identificación del paciente por pasos** dentro de la casilla `paciente` (capacidad nueva `identificacion-paciente`), primero "¿para ti o para otra persona?" (`DESTINATARIO`). La casilla sigue llena solo cuando hay `pacienteId`; los pasos son estado del trámite, así que se retoman en otro canal sin repetir lo ya dicho.
  - **Para mí, pre-registro por teléfono (revisión 2, decisión de Christian)**: se buscan los pacientes vinculados a ese teléfono (últimos 10 dígitos, cualquier canal, con uso en los últimos 180 días). Si hay, se pregunta "¿eres X?" (`CONFIRMAR`) con el nombre enmascarado ("Ana P.") y la opción "No soy ninguno". Quien elige un nombre lo confirma con su fecha de nacimiento (`FECHA_NAC`) y queda identificado **sin pedir CURP**. Una fecha equivocada cuenta intento (3 → bloqueo) y regresa a la pregunta.
  - **Para mí sin registro previo**, o "No soy ninguno": fecha de nacimiento → CURP (o "No la tengo") → datos básicos.
  - **Para otra persona**: CURP (o "No la tengo") → datos básicos de esa persona, incluida su fecha de nacimiento si no hay CURP. Se vincula al contacto como `FAMILIAR`.
  - Una CURP se valida por formato y dígito verificador y debe concordar con la fecha ya dada. Si existe, o coincide con la CURP calculada de alguien registrado sin ella, se asigna ese paciente. Si no, con datos básicos (con CURP solo nombre y apellidos, porque fecha, sexo y entidad salen de ella) se registra un paciente nuevo o se reutiliza el existente si los datos coinciden con uno solo.
  - Mitigación del número reasignado o compartido (design D1): solo nombre de pila e inicial, solo vínculos usados en 180 días, confirmación obligatoria con fecha de nacimiento y opción "No soy ninguno".
- **Teléfono no único**: un contacto puede vincularse a varios pacientes (`TITULAR` o `FAMILIAR`). Un vínculo creado solo con datos declarados (CURP o datos básicos) queda en nivel 0 y no sirve para la prioridad 2 del resolvedor de continuidad; tampoco un vínculo sin uso en 180 días. Confirmar "¿eres X?" con la fecha de nacimiento crea o renueva un vínculo de nivel 1 con el método nuevo `TELEFONO_FECHA_NAC`.
- **Dominio**: cálculo de los 16 caracteres calculables de la CURP y validación de una CURP completa (funciones puras), normalización de teléfono, estado de identificación del trámite, pistas por paso en `siguientePregunta`, eventos nuevos `DestinatarioDeclarado{relacion}` y `PacienteRegistrado{pacienteId}`, enmascarado de nombres, método de vínculo `TELEFONO_FECHA_NAC` y reglas `CURP_INVALIDA`, `CURP_NO_COINCIDE`, `IDENTIDAD_AMBIGUA`, `IDENTIFICACION_BLOQUEADA`, `PASO_IDENTIFICACION_INVALIDO` y `ASIGNACION_SOLO_PERSONAL`.
- **Aplicación y adaptadores**: caso de uso `identificarPaciente` en `CasosTramite`; `PacientesPort` y `ContactosPort` ganan búsqueda por CURP, por CURP calculada, por teléfono y registro; adaptadores Postgres y en memoria; el resolvedor de continuidad aplica la regla de vínculos de nivel 0 e inactivos. `AsignarPaciente` con `pacienteId` queda solo para personal interno.
- **Postgres**: migración nueva `infra/migraciones/003_identidad.sql` (no edita 001 ni 002): `paciente.entidad_nac`, `paciente.curp_base`, unicidad parcial de `curp`, método `TELEFONO_FECHA_NAC` en `vinculo`, índices de búsqueda. La semilla de demo gana CURP ficticias para Ana y Beto.
- **Contrato compartido** (`@noki/contracts`): comando `IdentificarPaciente` con payload por paso (incluido `CONFIRMAR`), `paso` opcional en la pista de `SiguientePregunta`, entidades de nacimiento. `docs/contratos.md`, `docs/eventos.md`, `PLAN.md` §5 y §8 y `AGENTS.md` §7 se actualizan.

Fuera de alcance: interfaz de identificación en `apps/web` (la consola del call center es de `consolas-internas`, frente B, y el simulador de WhatsApp solo pinta los mensajes que arme el motor de `api-comandos`); OTP, PIN, sesiones y validación contra RENAPO; relación `TUTOR` y reglas para menores; fusión de pacientes duplicados; cambio de teléfono de un paciente; endpoints HTTP (los expone `api-comandos` en su revisión 4).

## Capabilities

### New Capabilities
- `identificacion-paciente`: pasos de identificación, CURP (validación y cálculo), búsqueda por teléfono, registro y reutilización de pacientes, vínculos por relación y nivel.

### Modified Capabilities
- `siguiente-pregunta`: la pista de `paciente` depende del paso de identificación.
- `continuidad-canales`: la prioridad 2 ignora vínculos de nivel 0 o inactivos y el teléfono se compara normalizado.
- `politica-identidad`: requisito nuevo sobre quién puede asignar un paciente por ID y qué nivel da cada forma de identificarse.
- `contratos-canales`: comando `IdentificarPaciente` y `paso` en la pista.
- `persistencia-tramites`: migración `003_identidad`.

## Impact

- **Cambio compartido.** Toca archivos del frente A (`packages/domain`, `packages/application`, `packages/adapters/{memory,out-postgres,in-http}`, `apps/api/src/semilla`, `infra/migraciones/003_identidad.sql`, pruebas) y compartidos (`packages/contracts`, `docs/contratos.md`, `docs/eventos.md`, `PLAN.md`, `AGENTS.md`). Requiere el visto bueno de un responsable de cada frente. Lo implementa el frente A. `apps/web` no cambia: `paso` es opcional en el contrato y los datos simulados siguen siendo válidos.
- **`api-comandos` (en pausa)**: necesita una revisión 4 tras integrar este cambio en `main`: su migración pasa de `003_api.sql` a `004_api.sql` (Kysely no admite aplicar 003 después de un 003 distinto); su D6 regla 6 (`identificarPaciente` por Flow con coincidencia exacta) se sustituye por el caso de uso de este cambio; el motor de WhatsApp arma un mensaje por paso; `POST /api/comandos` traduce `IdentificarPaciente`; la ficha toma `nombrePila` del paciente del trámite abierto más reciente del hilo. Codex no debe seguir con `api-comandos` hasta esa revisión.
- **Frente B**: la consola del call center (`consolas-internas`) consumirá `IdentificarPaciente` y `paso`; nada de este cambio la bloquea ni la obliga.
- Riesgo: el cálculo de la CURP tiene reglas finas (partículas, nombres compuestos, palabras inconvenientes, Ñ). Se limita a los 16 caracteres calculables y se prueba con casos sintéticos; una diferencia de cálculo solo impide encontrar por `curp_base` a un paciente registrado sin CURP, no asigna a otra persona.
- Riesgo de privacidad: CURP, fecha de nacimiento y nombres son datos sensibles. Se capturan como `sensitive`, nunca van en eventos, vistas ni logs (`curp` ya está en `redact`) y el bot no los repite. La CURP pendiente de un paso vive en el estado del trámite y se borra al asignar paciente.
- Riesgo de privacidad aceptado por Christian el 2026-11-24 ("pues para eso es la confirmacion con la fecha"): quien tenga un número dentro de los 180 días de vigencia ve el nombre de pila y una inicial de los pacientes vinculados. No los identifica: confirmar exige la fecha de nacimiento, y un fallo cuenta intento (3 → bloqueo de 15 min).
- Responsable: compartido; frente A (`J3sus-esb` o Christian Avila) y frente B (`LuisMaster119`).
