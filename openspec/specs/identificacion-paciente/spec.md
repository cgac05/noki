# identificacion-paciente Specification

## Purpose

Identifica o registra al paciente por pasos (destinatario, "¿eres X?" con nombre enmascarado, fecha de nacimiento, CURP y datos básicos) sin usar el teléfono como identidad, para que cualquier canal agende para la persona correcta, incluso cuando quien agenda es otra persona.

## Requirements

### Requirement: Pasos de identificación dentro de la casilla paciente
La casilla `paciente` SHALL llenarse por pasos guardados en el estado del trámite. El primero es `DESTINATARIO` (para quién es la cita: `MI` → relación `TITULAR`, `OTRA_PERSONA` → relación `FAMILIAR`). Para `TITULAR` siguen `CONFIRMAR` (solo si el teléfono tiene candidatos), `FECHA_NAC`, `CURP` y `DATOS`; para `FAMILIAR` siguen `CURP` y `DATOS`. El paso actual MUST calcularse a partir de lo ya respondido, MUST conservarse al retomar el trámite en otro canal y MUST NOT volver a pedir un dato ya dado. La casilla MUST considerarse llena solo cuando el trámite tiene `pacienteId`. Un comando con un paso distinto del actual, o con un candidato que no pertenece al trámite, MUST fallar con `ReglaViolada('PASO_IDENTIFICACION_INVALIDO', { esperado })` sin cambiar el trámite. El paso `REINICIAR` MUST borrar las respuestas pendientes y volver a `DESTINATARIO` sin contar intento. Declarar el destinatario MUST emitir `DestinatarioDeclarado{relacion}`. Al asignar paciente, los candidatos, la fecha de nacimiento y la CURP pendientes MUST borrarse del estado del trámite.

#### Scenario: Orden de pasos sin registro previo
- **WHEN** un trámite de un teléfono sin pacientes vinculados recibe `DESTINATARIO` con `para: 'MI'` y después `FECHA_NAC`
- **THEN** no hubo paso `CONFIRMAR`, el paso siguiente es `CURP`, la casilla `paciente` sigue vacía y hay un `DestinatarioDeclarado{relacion: 'TITULAR'}`

#### Scenario: Para otra persona
- **WHEN** un trámite recibe `DESTINATARIO` con `para: 'OTRA_PERSONA'` desde un teléfono con pacientes vinculados
- **THEN** el paso siguiente es `CURP`, sin `CONFIRMAR` ni `FECHA_NAC`, y hay un `DestinatarioDeclarado{relacion: 'FAMILIAR'}`

#### Scenario: Paso fuera de orden
- **WHEN** un trámite en el paso `DESTINATARIO` recibe un comando del paso `CURP`
- **THEN** falla con `PASO_IDENTIFICACION_INVALIDO` indicando `DESTINATARIO` y la versión del trámite no cambia

#### Scenario: Identificación retomada en otro canal
- **WHEN** el asesor responde `DESTINATARIO` con `MI` y `CONFIRMAR` con "No soy ninguno" y `FECHA_NAC` en `callcenter`, y el trámite se retoma en `whatsapp` con un token
- **THEN** la siguiente pregunta en `whatsapp` es `paciente` en el paso `CURP`, sin volver a pedir destinatario, confirmación ni fecha

#### Scenario: Reiniciar
- **WHEN** un trámite en el paso `DATOS` recibe `REINICIAR`
- **THEN** el paso vuelve a `DESTINATARIO`, la fecha y la CURP pendientes se borran y no se cuenta intento

### Requirement: Pre-registro por teléfono con "¿eres X?"
Al declarar `MI`, el caso de uso SHALL buscar los pacientes vinculados a cualquier contacto cuyo número coincida en sus últimos 10 dígitos con el contacto del comando, en cualquier canal, con último uso del vínculo dentro de 180 días según el `Reloj`. Con al menos uno, el paso `CONFIRMAR` MUST ofrecer cada candidato (hasta 9) solo con su nombre enmascarado (primer nombre e inicial del apellido paterno, por ejemplo "Ana P.") y una referencia opaca que no es su ID, más la opción "No soy ninguno"; MUST NOT mostrar apellidos completos, fecha de nacimiento, CURP, ID ni trámites. Elegir un candidato MUST NOT asignarlo: el paso `FECHA_NAC` MUST compararse solo con ese candidato. Si coincide, MUST asignarse sin pedir CURP, crear o renovar el vínculo contacto-paciente con nivel 1, método `TELEFONO_FECHA_NAC` y relación `TITULAR`, y emitir `IdentidadComprobada{pacienteId, metodo: 'TELEFONO_FECHA_NAC'}`. Si no coincide, MUST contar un intento fallido con `IntentoVerificacionFallido{metodo: 'TELEFONO_FECHA_NAC', intentos}`, borrar la elección y volver a `CONFIRMAR` sin indicar qué dato falló; con el contacto bloqueado MUST fallar con `ReglaViolada('IDENTIFICACION_BLOQUEADA', { hasta })` sin evaluar la fecha. "No soy ninguno" MUST seguir a `FECHA_NAC` sin comparar candidatos y sin contar intento. Los vínculos sin uso en 180 días MUST NOT ofrecerse.

#### Scenario: Paciente ya registrado
- **WHEN** Ana, vinculada en la semilla al `wa_id` `5210000000001`, llama al call center con ANI `0000000001` (mismos últimos 10 dígitos), declara `MI`, elige "Ana P." y da su fecha de nacimiento correcta
- **THEN** el trámite tiene a Ana como paciente sin haber pasado por `CURP`, existe un vínculo de nivel 1 con método `TELEFONO_FECHA_NAC` entre el contacto del call center y Ana, y hay un `IdentidadComprobada`

#### Scenario: Número compartido por una familia
- **WHEN** un teléfono está vinculado a dos pacientes
- **THEN** `CONFIRMAR` ofrece ambos nombres enmascarados y "No soy ninguno", y la pista no contiene sus IDs, apellidos completos ni fechas

#### Scenario: Fecha que no coincide
- **WHEN** se elige un candidato y se da una fecha distinta de la suya
- **THEN** se cuenta un intento fallido, el paso vuelve a `CONFIRMAR` y el candidato no queda asignado

#### Scenario: Número reasignado
- **WHEN** el último uso del único vínculo de un teléfono fue hace 181 días según el `Reloj` y se declara `MI`
- **THEN** no hay paso `CONFIRMAR` ni se muestra ningún nombre; el paso siguiente es `FECHA_NAC`

#### Scenario: Tercer intento bloquea
- **WHEN** el mismo contacto falla tres veces la fecha de un candidato
- **THEN** el cuarto `FECHA_NAC` con candidato elegido falla con `IDENTIFICACION_BLOQUEADA` hasta que el `Reloj` avance 15 minutos

### Requirement: CURP validada y concordante
El dominio SHALL validar una CURP completa por formato oficial (18 caracteres, fecha real, sexo `H`, `M` o `X`, clave de entidad o `NE`) y por su dígito verificador, y SHALL calcular los 16 caracteres calculables (`curpBase`) a partir de nombre, apellidos, fecha, sexo y entidad, con las reglas de partículas, nombres compuestos `JOSE`/`MARIA`, `Ñ`, apellido materno ausente y palabras inconvenientes. Para sexo `X` `curpBase` MUST NOT calcularse y la base guardada MUST quedar nula. Una CURP mal formada o con verificador incorrecto MUST fallar con `ReglaViolada('CURP_INVALIDA')`; una CURP válida cuya fecha no es la ya declarada, o cuyos caracteres derivados de nombre y apellidos (posiciones 1–4 y 14–16) no concuerdan con los calculados para los nombres declarados en `DATOS`, MUST fallar con `ReglaViolada('CURP_NO_COINCIDE')`; sexo y entidad se toman de la CURP y no se comparan. Ninguno de estos fallos MUST contar intento.

#### Scenario: Verificador incorrecto
- **WHEN** se envía una CURP sintética con formato correcto y el último dígito alterado
- **THEN** falla con `CURP_INVALIDA`

#### Scenario: Cálculo con reglas especiales
- **WHEN** se calcula `curpBase` para datos sintéticos con partícula (`DE LA`), primer nombre `MARIA` seguido de otro, `Ñ` y sin apellido materno
- **THEN** el resultado coincide con el esperado de la tabla de casos de prueba, uno por regla

#### Scenario: CURP con sexo X
- **WHEN** en `DATOS` se registra a un paciente con una CURP sintética válida de sexo `X` y nombres concordantes
- **THEN** se registra con esa CURP, sexo `X` y `curp_base` nula; con un apellido paterno distinto falla con `CURP_NO_COINCIDE`

#### Scenario: Fecha distinta
- **WHEN** en el paso `CURP` llega una CURP válida cuya fecha no es la declarada en `FECHA_NAC`
- **THEN** falla con `CURP_NO_COINCIDE` y el paso sigue en `CURP`

### Requirement: Paciente encontrado por CURP
En el paso `CURP`, una CURP válida SHALL buscarse primero exacta y, si no existe, por sus 16 primeros caracteres entre pacientes sin CURP registrada. Con un resultado único MUST asignarse ese paciente, completar su CURP si estaba vacía y crear o renovar un vínculo de nivel 0 con método `FLOW_DECLARADO` y la relación declarada. En todo este cambio, renovar un vínculo existente con una operación de nivel menor al guardado MUST NOT cambiar su nivel ni su último uso; con nivel igual o mayor MUST actualizar ambos. Con varios resultados por la base MUST fallar con `ReglaViolada('IDENTIDAD_AMBIGUA')`. Sin resultado MUST guardarse la CURP y pasar a `DATOS`. `curp: null` ("No la tengo") MUST pasar a `DATOS`.

#### Scenario: CURP registrada
- **WHEN** se envía la CURP sintética de Beto desde un contacto nuevo con `para: 'OTRA_PERSONA'`
- **THEN** Beto queda asignado y el contacto tiene con él un vínculo `FAMILIAR` de nivel 0

#### Scenario: Declaración no reactiva un vínculo vencido
- **WHEN** un contacto tiene con Beto un vínculo de nivel 1 sin uso en 181 días según el `Reloj` y vuelve a declarar la CURP de Beto
- **THEN** Beto queda asignado, el vínculo conserva nivel 1 y su último uso anterior, y el resolvedor de continuidad lo sigue ignorando en la prioridad 2

#### Scenario: Paciente registrado antes sin CURP
- **WHEN** un paciente registrado por `DATOS` sin CURP es buscado después con su CURP completa
- **THEN** se encuentra por los 16 primeros caracteres, se asigna y su CURP queda guardada

#### Scenario: Sin CURP
- **WHEN** en el paso `CURP` llega `curp: null`
- **THEN** el paso pasa a `DATOS` y su pista incluye sexo y entidad de nacimiento

### Requirement: Registro o reutilización con datos básicos
En el paso `DATOS` el caso de uso SHALL tomar fecha, sexo y entidad de la CURP pendiente si existe (y pedir solo nombre y apellidos) o, sin CURP, la fecha ya guardada o la del payload, y sexo y entidad del payload, que MUST incluirlos. MUST calcular `curpBase` y reutilizar al paciente existente cuando nombre, apellidos y fecha coinciden con uno solo cuya base coincide o es nula; con varias coincidencias MUST fallar con `IDENTIDAD_AMBIGUA`. En otro caso MUST registrar un paciente nuevo con ID del `GeneradorId`, `nivel_identidad` 0, CURP si se dio y `curpBase`, emitir `PacienteRegistrado{pacienteId}` y asignarlo. En ambos casos MUST crear o renovar un vínculo de nivel 0 `FLOW_DECLARADO` con la relación declarada. Dos registros concurrentes con la misma CURP MUST terminar con un solo paciente asignado a ambos trámites.

#### Scenario: Paciente nuevo sin CURP
- **WHEN** un contacto sin historial completa `DESTINATARIO` con `MI`, `FECHA_NAC`, `CURP` con `null` y `DATOS` con nombre, apellidos, sexo y entidad
- **THEN** hay un paciente nuevo con `curp_base` calculada y sin CURP, `PacienteRegistrado` y `PacienteAsignado` con el mismo ID, y el trámite pasa a la siguiente casilla

#### Scenario: Paciente nuevo con CURP
- **WHEN** la CURP no existe y en `DATOS` llegan solo nombre y apellidos concordantes
- **THEN** el paciente se registra con la CURP, y la fecha, el sexo y la entidad tomados de ella

#### Scenario: Otra persona sin CURP
- **WHEN** con `para: 'OTRA_PERSONA'` llegan `CURP` con `null` y `DATOS` con nombre, apellidos, fecha, sexo y entidad de esa persona
- **THEN** se registra o reutiliza a esa persona como paciente del trámite y el contacto queda vinculado a ella como `FAMILIAR` de nivel 0

#### Scenario: Registro concurrente
- **WHEN** dos trámites registran en paralelo contra Postgres a la misma persona con la misma CURP
- **THEN** existe un solo paciente con esa CURP y ambos trámites lo tienen asignado

### Requirement: Datos de identificación protegidos
Fecha de nacimiento, CURP, nombres, sexo y entidad SHALL viajar solo en el payload del comando y en el estado o la tabla correspondiente; la única excepción es el nombre enmascarado de los candidatos en la pista del paso `CONFIRMAR`. MUST NOT aparecer en eventos, en `TramiteVista`, en mensajes de error devueltos al canal ni en logs. Las pistas de los pasos MUST capturarlos como `sensitive` sin valores iniciales.

#### Scenario: Nada sensible en eventos ni vista
- **WHEN** se recorre el registro completo de un paciente nuevo con CURP
- **THEN** ningún evento del trámite ni su vista contienen la CURP, la fecha ni los nombres, y el error `CURP_NO_COINCIDE` no repite la CURP

### Requirement: CURP flexible en modo demo
Con `DEMO_MODE=true`, el paso `CURP` SHALL aceptar cualquier valor de 18 caracteres `[A-Z0-9]` sin contar intento. Si la CURP no pasa la validación oficial o su fecha no coincide con la declarada, el trámite SHALL continuar como si se hubiera elegido «No la tengo» y la CURP MUST NOT guardarse. Si la CURP es válida pero sus caracteres de nombre y apellidos no concuerdan con los de `DATOS`, el paciente SHALL registrarse o reutilizarse sin guardar esa CURP. Sin `DEMO_MODE`, las reglas de «CURP validada y concordante» MUST seguir aplicándose sin cambios. El contrato SHALL aceptar en el paso `CURP` cualquier valor de 18 caracteres `[A-Z0-9]`.

#### Scenario: CURP con verificador incorrecto en demo
- **WHEN** con modo demo el asesor envía en el paso `CURP` una CURP sintética de 18 caracteres con el último dígito alterado
- **THEN** la respuesta es 200, no hay `IntentoVerificacionFallido` y la siguiente pregunta es `DATOS` con fecha (si falta), sexo y entidad

#### Scenario: Fecha distinta en demo
- **WHEN** con modo demo llega una CURP válida cuya fecha no es la declarada
- **THEN** no falla y el trámite continúa como sin CURP

#### Scenario: Nombres que no concuerdan en demo
- **WHEN** con modo demo se completa `DATOS` con nombres que no concuerdan con una CURP válida
- **THEN** el paciente queda registrado y asignado sin esa CURP

#### Scenario: Fuera de demo no cambia
- **WHEN** sin modo demo se envía una CURP con verificador incorrecto
- **THEN** falla con `CURP_INVALIDA`

#### Scenario: Contrato de 18 alfanuméricos
- **WHEN** se valida `IdentificarPaciente` con `paso: 'CURP'` y `curp: 'ABCD123456EFGHIJ78'`
- **THEN** el esquema lo acepta, y rechaza 17 caracteres o un guion
