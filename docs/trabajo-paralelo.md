# Trabajo en paralelo

Cómo trabajan dos frentes a la vez sobre `main` sin pisarse. Complementa [colaboracion-openspec.md](colaboracion-openspec.md) (ciclo de cada cambio) y `PLAN.md` §11 (fases).

Desde el 2026-11-25 y hasta la entrega, Christian (`cgac05`) decidió coordinar el cierre del proyecto como un frente único. La tabla siguiente conserva el reparto anterior.

## Frentes y responsables

| Frente | Responsable | Puede apoyar o relevar |
|---|---|---|
| **A: núcleo** | `J3sus-esb` (Jesús Aldahir) y `cgac05` (Christian Avila), co-responsables | Cualquier integrante, si el responsable lo acuerda y queda anotado en esta tabla y en el `handoff.md` del cambio en curso |
| **B: canales** | `LuisMaster119` | Igual que arriba |

El **responsable de un frente** autoriza la implementación y el cierre de los cambios de su frente. Si un frente tiene co-responsables, basta la autorización de uno de ellos. Los cambios a archivos compartidos requieren el visto bueno de un responsable de cada frente.

Para relevar o sumar a alguien en un frente: actualizar esta tabla con un commit en `main`, anotar el relevo en el `handoff.md` de cada cambio abierto y que la persona nueva continúe en la rama existente del cambio, sin abrir otra.

## Propiedad de archivos

| Frente A: núcleo | Frente B: canales |
|---|---|
| `packages/domain`, `packages/application`, `packages/adapters/*`, `apps/api`, `apps/sd-mock`, `infra/` | `apps/web` |
| Specs de capacidades del núcleo: trámite, identidad, eventos, reservas | Specs de capacidades de canales: simulador WA, consolas, vistas |

**Compartidos**: `packages/contracts`, `docs/contratos.md`, `docs/eventos.md`, `AGENTS.md`, `PLAN.md`, `CLAUDE.md`, `docs/colaboracion-openspec.md`, este archivo y la configuración raíz (`package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, ESLint, dependency-cruiser, Vitest). Nadie los modifica dentro de la rama de su frente: se cambian en un cambio pequeño propio, integrado en `main` con el visto bueno de ambos, y el otro frente hace rebase.

`pnpm-lock.yaml`: quien agrega una dependencia en su frente hace rebase sobre `main` justo antes de integrar y vuelve a correr `pnpm install`.

## Trabajar sin esperar al otro frente

El frente B usa en `apps/web` un cliente simulado que devuelve datos de prueba **validados con los esquemas de `@noki/contracts`**. Una variable `VITE_API=mock|real` cambia entre simulado y API real. Si los datos de prueba dejan de cumplir el contrato, las pruebas de B fallan.

El frente A prueba con adaptadores en memoria y con `pnpm test:integracion`; no necesita la web para avanzar.

## Secuencia de cambios

Cada fila es un cambio de OpenSpec completo (explorar → proponer → autorizar → implementar → verificar → integrar → archivar). Los IDs son orientativos y se confirman al proponer.

| Horas | Frente A: núcleo | Frente B: canales |
|---|---|---|
| 2–6 | `nucleo-tramite`: máquina de estados, `siguientePregunta`, política de identidad, resolvedor de continuidad, adaptadores en memoria | `esqueleto-canales`: las 7 rutas, layout móvil, cliente simulado |
| 6–10 | `persistencia-eventos`: event store y outbox, Redis Streams, reservas, `sd-mock` | `simulador-wa`: chat, botones, listas y modal tipo Flow sobre `MensajeBot` |
| 10–14 | `api-comandos`: `POST /api/comandos`, endpoint de WA, Socket.IO | `consolas-internas`: `/callcenter`, `/clinica`, `/admin` |
| 14–18 | **Integración del Flujo A, en conjunto**: B cambia a `VITE_API=real` y se prueba el guion de `PLAN.md` §12 de punta a punta | |

Los extras de §11 (huecos, recordatorios, etc.) se reparten en la hora 18 según el avance.

## Reglas de integración

- **Ramas**: `feat/<id-del-cambio>`, de vida corta, creadas desde `main` actualizado.
- **Integrar a `main`** solo con dictamen `PASS` en `revision.md` y con `pnpm lint`, `pnpm lint:deps`, `pnpm test` y `pnpm test:integracion` en verde sobre la rama ya rebasada.
- **Rebase sobre `main`** cada vez que el otro frente integre.
- **Archivar solo en `main`, después del merge**, para que solo un cambio a la vez escriba en `openspec/specs/`. Lo archiva el frente dueño del cambio.
- **Migraciones nuevas** solo desde el frente A (`002_…`, `003_…`); `001_nucleo` no se edita.
- **Cada integrante** usa su propio clon, su Docker local y sus agentes. Las carpetas `openspec/changes/<id>/` no chocan porque los IDs son distintos.

## Puntos de sincronización

| Hora | Qué se revisa juntos |
|---|---|
| 6 | A muestra el dominio con pruebas; B muestra las rutas con datos simulados. Se acuerdan los cambios de contrato pendientes |
| 10 | Contrato de la API congelado para el Flujo A; cualquier cambio posterior pasa por un cambio compartido |
| 18 | MVP del Flujo A de punta a punta; se decide el reparto de extras |

## Arranque de un integrante nuevo

Seguir el `README.md`: `corepack enable`, `pnpm install`, copiar `.env.example` a `.env`, levantar Docker, `pnpm demo:reset` y comprobar `GET /ready` en verde. Después leer este archivo y [colaboracion-openspec.md](colaboracion-openspec.md).
