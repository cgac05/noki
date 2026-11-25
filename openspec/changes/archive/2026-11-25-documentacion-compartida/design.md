# Design

## Context

Ver `proposal.md` (Why). Estado en `main` `e3d49ea`:

- `packages/contracts/src/comandos.ts` incluye `ComprobarIdentidad` (`INE_CLINICA`). `consultas.ts` define `metodo?: 'GET'`, y solo `alertasSeguridad` lo declara.
- `rutasComandos.traducir` responde `NoEncontrado('operacion')` a `ComprobarIdentidad` y a `CerrarAtencion`. `clinica-alertas` (revisión 2) implementa `CerrarAtencion` y deja la otra rama.
- `rutaRelojDemo.ts` valida `{ adelantarMinutos }` con un Zod local (spec `reloj-demo`).
- `AGENTS.md` §7 lista los grupos `proyecciones`, `notificador`, `huecos`, `recordatorios` y `tiempo-real`, y el `job_id` `${tipo}:${tramiteId}`.
- `docs/eventos.md` (líneas 3 y 57) dice que la base no implementa outbox ni consumidores.
- `PLAN.md` menciona la INE en tres lugares:
  - §7 `/clinica`: «marcar "INE verificada" → `IdentidadComprobada`»;
  - el esquema de datos: `nivel_identidad: … 2 INE en clínica` y la lista de `metodo` con `INE_CLINICA`;
  - la tabla de §8: «agendar | datos declarados (la clínica valida la INE en recepción)».

## Goals / Non-Goals

**Goals:** que los archivos compartidos reflejen lo que hay en `main` después de `clinica-alertas` y la decisión de no comprobar identidad en clínica, y dar al botón del reloj un contrato.

**Non-Goals:** comportamiento nuevo del núcleo, pantallas o eventos.

## Decisions

### D1. Quitar el comando y no solo dejarlo sin implementar
Un comando del contrato que siempre responde 404 invita al frente B a mostrar un botón que no hace nada. Quitarlo es aditivo-inverso, pero nadie lo usa en `main`: la web no lo envía y el núcleo no lo implementa. La prueba de contratos pasa a exigir que `ComprobarIdentidad` ya no valide.

*Alternativa descartada:* dejarlo como reservado. Contradice la decisión de Christian y mantiene una rama muerta en la API.

### D2. `INE_CLINICA` se queda en el dominio como reservado
Quitarlo de `MetodoVinculo` cambia el vocabulario del dominio y de `docs/eventos.md` sin beneficio, porque ningún evento guardado lo usa. `PLAN.md` lo marca como reservado, igual que el nivel 2 (`paciente.nivel_identidad` conserva su `CHECK` de 0 a 2).

### D3. Contrato del reloj en un módulo propio
`packages/contracts/src/demo.ts` exporta lo siguiente:

- `AdelantarRelojSchema` (`z.object({ adelantarMinutos: z.number().int().min(1).max(10_080) })`);
- `RespuestaRelojSchema` (`{ ahora: z.string().datetime() }`);
- `RUTA_RELOJ_DEMO = { metodo: 'POST', ruta: '/api/demo/reloj', soloDemo: true } as const`.

No entra en `RUTAS_CONSULTAS`, que solo tiene GET. `rutaRelojDemo.ts` importa el esquema y conserva su respuesta 400 actual.

### D4. Integración después de `clinica-alertas`
Este cambio quita la rama 404 que `clinica-alertas` conserva y documenta las alertas como disponibles. Si se integrara antes, la documentación diría algo falso hasta la integración del otro cambio. Si `clinica-alertas` se retrasa, este cambio puede integrarse quitando solo la parte de alertas de D4 de `proposal.md`, con una revisión nueva.

## Risks / Trade-offs

- **Quitar un comando es un cambio incompatible del contrato** → no hay clientes que lo usen (búsqueda en `apps/web` y `packages`), y el cambio lo aprueban los dos frentes.
- **Conflictos con las pantallas del frente B** en `guionFlujoA.ts` o en el cliente → este cambio no toca `apps/web`. El frente B hace rebase al integrarlo.
