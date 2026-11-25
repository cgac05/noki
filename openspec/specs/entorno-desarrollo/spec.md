# entorno-desarrollo Specification

## Purpose

Define cómo cualquier integrante obtiene, desde un checkout limpio, un entorno local reproducible: versión de herramientas, comandos del workspace, infraestructura, esquema de datos, datos semilla y configuración sin secretos versionados.

## Requirements

### Requirement: Versiones de herramientas fijadas
El repositorio SHALL declarar la versión exacta de pnpm en `packageManager`, `engines.node` con `>=20` y un archivo `.nvmrc` con una versión de Node que satisfaga ese rango.

#### Scenario: Versiones declaradas
- **WHEN** se inspeccionan `package.json` y `.nvmrc` en la raíz
- **THEN** `packageManager` tiene la forma `pnpm@<versión exacta>`, `engines.node` es `>=20` y `.nvmrc` contiene una versión mayor o igual a 20

#### Scenario: Instalación con corepack
- **WHEN** en una máquina con Node que cumple `.nvmrc` se ejecuta `corepack enable` y después `pnpm install`
- **THEN** se usa la versión de pnpm declarada y la instalación termina sin errores

### Requirement: Comandos del workspace disponibles
Desde la raíz, tras `pnpm install`, los comandos `pnpm lint`, `pnpm lint:deps` y `pnpm test` SHALL existir y terminar con código cero sobre la base entregada. `pnpm lint` MUST incluir la verificación de tipos de todos los paquetes en modo estricto.

#### Scenario: Checkout limpio en verde
- **WHEN** se clona el repositorio, se ejecuta `pnpm install` y luego `pnpm lint && pnpm lint:deps && pnpm test`
- **THEN** los tres comandos terminan con código cero

#### Scenario: Error de tipos detectado
- **WHEN** un paquete contiene un error de tipos o un uso de `any` explícito y se ejecuta `pnpm lint`
- **THEN** el comando termina con error

#### Scenario: Pruebas unitarias sin infraestructura
- **WHEN** se ejecuta `pnpm test` sin Postgres ni Redis disponibles
- **THEN** las pruebas pasan sin intentar conectarse a servicios externos

### Requirement: Infraestructura local con un comando
El repositorio SHALL incluir una definición de Docker Compose que levante PostgreSQL y Redis con puertos y credenciales de desarrollo documentados.

#### Scenario: Servicios saludables
- **WHEN** se ejecuta `docker compose -f infra/docker-compose.yml up -d postgres redis`
- **THEN** ambos contenedores quedan en estado saludable y aceptan conexiones con los valores de `.env.example`

### Requirement: Migración del núcleo
`pnpm db:migrate` SHALL aplicar sobre una base vacía la migración `001_nucleo` y MUST ser repetible sin error. Esa migración MUST crear las tablas de identidad, hilo, trámite, evento, catálogo de servicios, sedes, oferta por sede, recurso, reserva, localidad, outbox, eventos procesados y tokens usados, y MUST NOT crear tablas de huecos, intereses de adelanto, recordatorios, preferencias de contacto, facturación ni perfil fiscal.

#### Scenario: Migración sobre base vacía
- **WHEN** se ejecuta `pnpm db:migrate` contra una base recién creada
- **THEN** existen las tablas del núcleo, no existe ninguna de las tablas excluidas y el comando termina con código cero

#### Scenario: Migración repetida
- **WHEN** se ejecuta `pnpm db:migrate` por segunda vez
- **THEN** no se aplica nada nuevo y el comando termina con código cero

### Requirement: Restricciones de integridad del núcleo
El esquema MUST impedir dos reservas activas (`APARTADA` o `CONFIRMADA`) para la misma sede, recurso e inicio; dos eventos con el mismo `idempotency_key`; que un consumidor registre dos veces el mismo `idempotency_key`; y que un `jti` se registre dos veces como usado.

#### Scenario: Doble reserva rechazada por la base
- **WHEN** se insertan dos reservas con la misma sede, recurso e inicio y ambas en estado `APARTADA` o `CONFIRMADA`
- **THEN** la segunda inserción falla por violación de unicidad

#### Scenario: Reserva liberada no bloquea
- **WHEN** existe una reserva `EXPIRADA` o `CANCELADA` para una sede, recurso e inicio y se inserta otra `APARTADA` con los mismos valores
- **THEN** la inserción tiene éxito

#### Scenario: Idempotencia de eventos
- **WHEN** se insertan dos eventos con el mismo `idempotency_key`
- **THEN** la segunda inserción falla por violación de unicidad

#### Scenario: Consumidor idempotente
- **WHEN** se registra dos veces el mismo par consumidor e `idempotency_key` en eventos procesados
- **THEN** el segundo registro falla por violación de llave primaria, y el mismo `idempotency_key` con otro consumidor sí se acepta

#### Scenario: Token de un solo uso
- **WHEN** se registra dos veces el mismo `jti` como usado
- **THEN** el segundo registro falla por violación de llave primaria

### Requirement: Búsqueda difusa de servicios en la base
El esquema SHALL habilitar `pg_trgm` e índices de trigramas sobre el nombre y los sinónimos del servicio, de modo que una consulta por similitud encuentre un servicio a partir de un sinónimo con errores de escritura.

#### Scenario: Sinónimo con errores encuentra el servicio
- **WHEN** con la semilla cargada se busca por similitud de trigramas un texto como "quimica sangina"
- **THEN** el primer resultado es el servicio Química sanguínea

#### Scenario: Índices presentes
- **WHEN** se consultan los índices de la tabla de servicios
- **THEN** existen índices GIN con `gin_trgm_ops` para el nombre y para los sinónimos

### Requirement: Datos semilla mínimos
`pnpm seed` SHALL cargar sobre una base migrada: 3 sedes en zonas horarias IANA distintas, incluidas Tepic (`America/Mazatlan`) y Bahía de Banderas (`America/Bahia_Banderas`); los 4 servicios de `PLAN.md` §5 con perfil y sinónimos, su oferta por sede y recursos compatibles; la localidad Xalisco asociada a Tepic; y los usuarios y pacientes de demo de `AGENTS.md` §10. Ejecutarlo dos veces MUST NOT duplicar registros.

#### Scenario: Semilla completa
- **WHEN** se ejecuta `pnpm seed` sobre una base migrada
- **THEN** existen las 3 sedes, los 4 servicios con perfil y sinónimos, la localidad Xalisco y los usuarios `asesor1`, `recepcion.tepic`, `admin` y los pacientes de demo con sus contactos de WhatsApp vinculados

#### Scenario: Semilla repetida
- **WHEN** se ejecuta `pnpm seed` dos veces
- **THEN** el número de registros de cada tabla sembrada no cambia en la segunda ejecución

#### Scenario: Secretos de demo con hash
- **WHEN** se consultan las credenciales sembradas
- **THEN** los PIN y contraseñas de demo están guardados como hash argon2 y ningún valor en claro aparece en la base

#### Scenario: Datos ficticios
- **WHEN** se revisan los datos semilla
- **THEN** ningún nombre, teléfono, fecha de nacimiento o CURP corresponde a una persona real y los teléfonos son los de demo de `AGENTS.md` §10

### Requirement: Reinicio de la demo protegido
`pnpm demo:reset` SHALL dejar la base en el estado de una migración y una semilla recién aplicadas, y MUST negarse a ejecutar si `DEMO_MODE` no es `true`.

#### Scenario: Reinicio en modo demo
- **WHEN** con `DEMO_MODE=true` y datos adicionales en la base se ejecuta `pnpm demo:reset`
- **THEN** los datos adicionales desaparecen y la base contiene exactamente la semilla

#### Scenario: Reinicio bloqueado fuera de demo
- **WHEN** con `DEMO_MODE` ausente o distinto de `true` se ejecuta `pnpm demo:reset`
- **THEN** el comando termina con error sin modificar la base

### Requirement: Configuración sin secretos versionados
El repositorio SHALL incluir `.env.example` con todas las variables del proyecto y valores de desarrollo no secretos, y `.env` MUST estar ignorado por Git.

#### Scenario: Archivo de entorno ignorado
- **WHEN** se crea un archivo `.env` en la raíz y se consulta `git status`
- **THEN** el archivo no aparece como pendiente de agregar

#### Scenario: Variables documentadas
- **WHEN** se compara `.env.example` con la lista de variables del proyecto
- **THEN** contiene `DATABASE_URL`, `REDIS_URL`, `SD_MOCK_URL`, `TOKEN_SECRET`, `DEMO_MODE`, `PUBLIC_BASE_URL` y `LOG_LEVEL`

### Requirement: Aplicaciones arrancan en modo desarrollo
`pnpm dev` SHALL iniciar `api`, `sd-mock` y `web`. `api` y `sd-mock` MUST responder `GET /health` con HTTP 200 mientras el proceso esté vivo, sin consultar dependencias, y `web` MUST servir una página en el navegador.

#### Scenario: Proceso vivo
- **WHEN** se ejecuta `pnpm dev` y se consulta `GET /health` en los puertos de `api` y `sd-mock`
- **THEN** ambos responden HTTP 200 con un cuerpo JSON que indica estado correcto

#### Scenario: Frontend accesible
- **WHEN** se ejecuta `pnpm dev` y se abre la URL de `web`
- **THEN** el navegador muestra la página índice sin errores en consola

### Requirement: Disponibilidad con dependencias
`api` SHALL exponer `GET /ready`, que consulta Postgres (`SELECT 1`) y Redis (`PING`) con un tiempo límite corto. MUST responder 200 solo si ambos responden, y 503 indicando qué dependencia falló en otro caso, sin exponer cadenas de conexión ni credenciales.

#### Scenario: Todo conectado
- **WHEN** Postgres y Redis están disponibles y se consulta `GET /ready`
- **THEN** responde HTTP 200 con el estado de cada dependencia en correcto

#### Scenario: Redis caído
- **WHEN** Redis no es alcanzable y se consulta `GET /ready`
- **THEN** responde HTTP 503 indicando que falló Redis, dentro del tiempo límite y sin incluir la URL de conexión

#### Scenario: Postgres caído
- **WHEN** Postgres no es alcanzable y se consulta `GET /ready`
- **THEN** responde HTTP 503 indicando que falló Postgres

### Requirement: Pruebas de integración con contenido real
`pnpm test:integracion` SHALL ejecutar contra Postgres y Redis reales, como mínimo: la migración sobre una base limpia, el rechazo de la segunda reserva activa del mismo horario, `GET /health` de `api` y `sd-mock` y `GET /ready` de `api` con dependencias arriba y con una caída. MUST terminar con error si no hay infraestructura, nunca omitir pruebas.

#### Scenario: Suite de integración completa
- **WHEN** con Postgres y Redis levantados se ejecuta `pnpm test:integracion`
- **THEN** se ejecutan y pasan al menos las pruebas de migración, reserva duplicada, salud y disponibilidad

#### Scenario: Sin infraestructura
- **WHEN** se ejecuta `pnpm test:integracion` con Docker detenido
- **THEN** el comando termina con error explicando que falta la infraestructura, sin reportar pruebas omitidas como aprobadas

### Requirement: Scripts de instalación declarados
Toda dependencia instalada que tenga un script de instalación SHALL figurar en `allowBuilds` de `pnpm-workspace.yaml` con `true` (se compila) o `false` (se ignora). `pnpm install --frozen-lockfile` en un checkout limpio MUST terminar con salida 0 sin variables de entorno que relajen la política, y MUST NOT modificar `pnpm-workspace.yaml`.

#### Scenario: Extensión nativa opcional de BullMQ
- **WHEN** con `bullmq` instalado se ejecuta `pnpm install --frozen-lockfile` en un checkout limpio
- **THEN** termina con salida 0, `msgpackr-extract` no se compila y `git status` no muestra cambios en `pnpm-workspace.yaml`

#### Scenario: Main sin BullMQ
- **WHEN** se ejecuta `pnpm install --frozen-lockfile` en `main` antes de integrar `temporizadores`
- **THEN** termina con salida 0 sin cambios en el lockfile
