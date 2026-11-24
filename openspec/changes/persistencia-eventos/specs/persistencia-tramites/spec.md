# Spec Delta

## Purpose

Define la persistencia real del núcleo en PostgreSQL: los repositorios de los puertos existentes, el event store y el outbox en la misma transacción que el cambio de estado, con concurrencia optimista y partición por paciente o hilo.

## ADDED Requirements

### Requirement: Migración incremental de persistencia
El proyecto SHALL agregar `infra/migraciones/002_persistencia.sql` sin modificar `001_nucleo.sql`. La migración MUST agregar lo necesario para persistir los puertos del núcleo (estado serializado y canal de origen del trámite, folio de la reserva, hilo del contacto, nivel del vínculo y contador de intentos de verificación por contacto). MUST además admitir las claves de idempotencia por evento que genera el núcleo (`<uuid>` o `<uuid>:n`) en `evento` y `evento_procesado`, conservando su unicidad y rechazando cualquier otro formato. La migración MUST aplicarse sobre una base que ya tiene `001` y datos sembrados. Volver a migrar MUST NOT aplicar nada nuevo.

#### Scenario: Migración sobre una base con datos
- **WHEN** se ejecuta `pnpm db:migrate` sobre una base con `001_nucleo` y la semilla de demo
- **THEN** se aplica `002_persistencia` sin errores y una segunda ejecución no aplica ninguna migración

#### Scenario: Claves de idempotencia con sufijo
- **WHEN** después de `002` se insertan en `evento` dos eventos con claves `<uuid>:1` y `<uuid>:2`, después uno repetido con `<uuid>:1`, y después uno con la clave `abc`
- **THEN** los dos primeros se aceptan y los otros dos se rechazan (unicidad y formato); en `evento_procesado` el mismo par consumidor y clave con sufijo también se rechaza la segunda vez

#### Scenario: La migración base no cambia
- **WHEN** se compara `infra/migraciones/001_nucleo.sql` con `main` antes del cambio
- **THEN** el archivo es idéntico

### Requirement: Repositorios Postgres intercambiables
Cada puerto del núcleo con estado (`TramiteRepo`, `HiloRepo`, `ContactosPort`, `PacientesPort`, `CatalogoPort`, `AgendaPort`, `RegistroIntentos` y los puertos nuevos de este cambio que guardan datos) SHALL tener un adaptador en `packages/adapters/out-postgres` con la misma semántica observable que su adaptador en memoria. Un trámite guardado y leído de nuevo MUST conservar casillas, estado, versión, horario, folio y canal de origen, y su `siguientePregunta` MUST ser la misma para cada canal. `PacientesPort` MUST resolver la comparación de fecha de nacimiento y la búsqueda por datos dentro de la consulta y devolver solo `boolean` o IDs, nunca la fecha, el nombre ni otros datos personales.

#### Scenario: Ida y vuelta del trámite
- **WHEN** un trámite `LISTO_PARA_RESERVAR` con advertencia de elegibilidad se guarda en Postgres y se vuelve a cargar
- **THEN** el trámite cargado tiene el mismo estado, casillas, versión y la misma `siguientePregunta` en los cinco canales

#### Scenario: Misma prueba con ambos adaptadores
- **WHEN** se ejecuta la batería de comportamiento de un puerto contra su adaptador en memoria y contra el de Postgres
- **THEN** ambos pasan las mismas comprobaciones

#### Scenario: Pacientes sin exponer datos
- **WHEN** se consulta `coincideFechaNac` o `buscarPorDatos` en Postgres
- **THEN** el resultado es solo un `boolean` o una lista de IDs y la consulta usa parámetros, nunca texto concatenado

### Requirement: Event store y outbox en la misma transacción
Al guardar un trámite, el repositorio Postgres SHALL escribir en una sola transacción la fila del trámite, cada evento pendiente en la tabla `evento` con su envoltura completa y una fila de `outbox` por evento con `publicado_en` nulo. Si cualquier escritura falla, incluida una `idempotency_key` repetida, MUST NOT quedar ni el cambio del trámite ni ningún evento ni fila de outbox, y los eventos pendientes del trámite MUST conservarse. Solo tras confirmar la transacción el trámite MUST vaciar sus pendientes.

#### Scenario: Guardado completo
- **WHEN** se guarda la selección de sede que completa la cotización
- **THEN** en la base quedan el trámite con la versión nueva, los eventos `SedeSeleccionada` y `CotizacionGenerada` y dos filas de outbox pendientes, y el trámite en memoria ya no tiene pendientes

#### Scenario: Falla a mitad de la transacción
- **WHEN** uno de los eventos tiene una `idempotency_key` que ya existe en `evento`
- **THEN** se lanza un error, la fila del trámite conserva su versión anterior, no hay eventos ni outbox nuevos y el trámite en memoria conserva sus pendientes

#### Scenario: Eventos sin trámite
- **WHEN** se guarda `IntentoVerificacionFallido` por el puerto de eventos sin trámite
- **THEN** quedan el evento con `tramite_id` nulo y su fila de outbox en la misma transacción

### Requirement: Concurrencia optimista en Postgres
El repositorio Postgres SHALL actualizar el trámite solo si la versión almacenada coincide con la versión de carga; si no coincide, MUST lanzar `ConflictoVersion{esperada, actual}` sin escribir nada. Insertar un trámite nuevo con un `id` existente MUST tratarse igual.

#### Scenario: Escritura concurrente contra Postgres
- **WHEN** dos casos de uso cargan la misma versión del trámite desde Postgres, ambos lo modifican y guardan en paralelo
- **THEN** exactamente uno se guarda y el otro recibe `ConflictoVersion`, y en `evento` solo están los eventos del ganador

### Requirement: Partición por paciente o hilo
Cada fila de outbox SHALL llevar `particion = hash(pacienteId ?? hiloId) % 8`, con una función de hash determinista, pura y documentada, de modo que todos los eventos de un mismo paciente (o de un hilo anónimo) caigan en la misma partición mientras no cambie esa clave.

#### Scenario: Misma clave, misma partición
- **WHEN** se guardan varios eventos de trámites distintos del mismo paciente
- **THEN** todas sus filas de outbox tienen la misma partición, entre 0 y 7

#### Scenario: Hilo anónimo
- **WHEN** se guardan eventos de un trámite sin paciente
- **THEN** la partición se calcula con el `hiloId`

### Requirement: Sin datos personales en eventos ni registros
Los eventos persistidos y las filas de outbox SHALL contener solo los payloads del catálogo de eventos (IDs, sin fecha de nacimiento, teléfono, correo, nombre, CURP, RFC ni PIN). Los mensajes de error guardados (`outbox.ultimo_error`) y los registros del logger de estos adaptadores MUST NOT incluir payloads, cadenas de conexión ni datos personales.

#### Scenario: Error de publicación registrado
- **WHEN** falla la publicación de un evento y se registra el fallo en el outbox
- **THEN** `ultimo_error` contiene un mensaje genérico y no contiene el payload ni la URL de Redis
