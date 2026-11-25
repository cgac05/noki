# noki

Base del cerebro omnicanal para la demo de Salud Digna en HackaTec. El cambio `base-contratos` entrega el workspace, contratos, herramientas de validación, migración, semilla y aplicaciones mínimas. El núcleo de negocio, la continuidad y los simuladores por canal se construirán en cambios posteriores.

## Requisitos

- Node **24**, según `.nvmrc`; el manifiesto declara `engines.node >=20`.
- Corepack y pnpm **11.25.0**, fijado en `packageManager`.
- Docker con Docker Compose y daemon iniciado. Los puertos 5432, 6379, 4000, 4001 y 5173 deben estar libres.

## Arranque desde un checkout nuevo

Desde la raíz, en PowerShell:

```powershell
node --version
corepack enable
Copy-Item .env.example .env
pnpm install --frozen-lockfile
docker compose -f infra/docker-compose.yml up -d --wait postgres redis
pnpm db:migrate
pnpm seed
pnpm dev
```

En Linux/macOS, usar `cp .env.example .env` en lugar de `Copy-Item`. `.env` está ignorado por Git. Los comandos de migración, semilla, reinicio, integración y las apps backend lo cargan mediante Node; una variable ya exportada tiene prioridad sobre el archivo.

En Windows, si `corepack enable` falla por permisos en `Program Files`, se pueden habilitar shims locales sin instalar otra herramienta:

```powershell
New-Item -ItemType Directory -Path .tools/corepack -Force | Out-Null
corepack enable --install-directory .tools/corepack
corepack prepare pnpm@11.25.0 --activate
$env:PATH = (Join-Path (Get-Location).Path '.tools/corepack') + [IO.Path]::PathSeparator + $env:PATH
```

`pnpm-workspace.yaml` autoriza únicamente los scripts de instalación de `esbuild` y `argon2`; no hay que aprobar scripts nuevos para esta base. Los paquetes internos se consumen como TypeScript fuente y no requieren compilación a `dist`.

## Direcciones y comprobación antes de presentar

| Dirección | Resultado |
|---|---|
| [Web](http://localhost:5173) | Página índice React; los canales aún no tienen rutas de negocio |
| [Salud de API](http://localhost:4000/health) | 200 `{ "estado": "ok" }` mientras el proceso vive |
| [Disponibilidad de API](http://localhost:4000/ready) | 200 únicamente si Postgres y Redis responden |
| [Salud de sd-mock](http://localhost:4001/health) | 200 `{ "estado": "ok" }` sin dependencias |

Antes de presentar, comprobar `/ready`, no solo `/health`:

```powershell
Invoke-RestMethod http://localhost:4000/ready
```

El resultado esperado es `{ estado: 'ok', postgres: 'ok', redis: 'ok' }`. Si una dependencia falla, responde 503 e identifica la dependencia como `error`, sin exponer la URL, credenciales ni errores del driver. Cada comprobación tiene un límite de un segundo y ambas se ejecutan en paralelo.

## Comandos

| Comando | Uso |
|---|---|
| `pnpm install --frozen-lockfile` | Instalación reproducible |
| `pnpm lint` | ESLint y tipos de todos los paquetes y pruebas |
| `pnpm lint:deps` | Fronteras hexagonales y ciclos |
| `pnpm test` | Unitarias, contratos y pruebas de tipos; sin red ni Docker |
| `pnpm test:integracion` | Postgres y Redis reales; falla si no están disponibles |
| `pnpm db:migrate` | Aplica migraciones SQL con Kysely; repetible |
| `pnpm seed` | Upsert de datos de demostración; repetible sin duplicados |
| `pnpm demo:reset` | Borra el esquema público, migra y siembra; exige `DEMO_MODE=true` |
| `pnpm dev` | API 4000, sd-mock 4001 y web 5173 con recarga |
| `pnpm --filter @noki/web build` | Compila el frontend |

La integración crea y reinicia exclusivamente la base separada **`noki_test`** en el mismo servidor de `DATABASE_URL`. El usuario de Postgres necesita permiso para crear esa base. Nunca dirige las pruebas al esquema de desarrollo `noki`. La suite cubre migración limpia y repetida, restricciones e índices, 50 reservas concurrentes, idempotencia, tokens usados, disponibilidad, semilla y reinicio. No omite pruebas por falta de infraestructura.

Para detener los servicios del proyecto sin borrar su volumen:

```powershell
docker compose -f infra/docker-compose.yml stop postgres redis
```

## Datos y credenciales solo de demo

Datos sintéticos: pacientes con apellidos `Paciente Demo`, sin CURP, teléfonos reservados para esta demo y fechas ficticias. Los precios y las instrucciones de preparación son datos de prueba, sin validez clínica ni comercial. No reutilizar estos usuarios ni este patrón de credenciales fuera del modo demo.

| Rol | Usuario | Credencial / contacto |
|---|---|---|
| Paciente A | Ana (`ana`) | PIN `1234`; WA `5210000000001` |
| Paciente B | Beto (`beto`) | PIN `1234`; WA `5210000000002` |
| Asesor | `asesor1` | `demo123` |
| Recepción | `recepcion.tepic` | `demo123` |
| Administrador | `admin` | `demo123` |

Son credenciales sembradas; los flujos de login y las rutas `/callcenter`, `/clinica`, `/admin`, `/wa` y `/app` todavía no están implementados. La semilla guarda PIN y contraseñas únicamente como **argon2id**, con sal aleatoria por hash. El futuro adaptador de seguridad debe verificar ese formato estándar. Repetir `seed` conserva los IDs y los recuentos, y actualiza los hashes.

La semilla incluye Tepic (`America/Mazatlan`), Bahía de Banderas (`America/Bahia_Banderas`) y Tijuana (`America/Tijuana`), cuatro servicios con perfiles y sinónimos, sus ofertas y recursos por sede y Xalisco, cuya sede sembrada más cercana es Tepic. Los componentes del paquete mamario/Papanicolaou son códigos del perfil, pendientes de la implementación del itinerario. No hay historial de eventos ni intereses de adelanto en este cambio.

`demo:reset` exige el valor exacto `true` en `DEMO_MODE` **antes de abrir una conexión**, anuncia el host y elimina todo el esquema público de la base indicada por `DATABASE_URL`. Usar únicamente una base de demo destinada a reiniciarse.

## Reloj de demo

Con `DEMO_MODE=true`, puedes adelantar el reloj de la API entre 1 y 10080 minutos enteros. Por ejemplo, para adelantarlo una hora desde PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/demo/reloj -ContentType 'application/json' -Body '{"adelantarMinutos":60}'
```

La respuesta contiene `{ ahora }` en ISO 8601 UTC. El avance activa los temporizadores que ya vencieron según el nuevo reloj. Fuera del modo demo, el endpoint responde 404. El botón «Adelantar reloj» de `/admin` está previsto para el cambio de pantallas del frente B y usará el mismo contrato.

## Contratos y colaboración

- [Contratos de canales](docs/contratos.md): esquemas Zod, vocabulario, mensajes, tiempo real y errores.
- [Eventos](docs/eventos.md): envoltura, 27 eventos tipados y familias reservadas.
- [Colaboración con OpenSpec](docs/colaboracion-openspec.md): Claude planifica/revisa, Codex implementa/prueba, el usuario autoriza.

`001_nucleo.sql` crea solo las tablas autorizadas. `usuario_interno` es la adición al modelo para las credenciales del personal. Después de integrarse, los cambios del esquema se incorporarán en migraciones nuevas; no editar `001_nucleo` ya aplicada para introducir cambios en una base existente.
