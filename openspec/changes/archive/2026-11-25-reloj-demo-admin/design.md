# Design

## Context

Ver `proposal.md` (Why). Estado en `main` `44c57f4`:

- **Contrato** (`packages/contracts/src/demo.ts`): `AdelantarRelojSchema`, `RespuestaRelojSchema` y `RUTA_RELOJ_DEMO` (`POST /api/demo/reloj`, `soloDemo`).
- **API** (`packages/adapters/in-http/src/rutaRelojDemo.ts`): adelanta el `Reloj` y ejecuta los trabajos vencidos de `temporizadores-tramite` (`HOLD`, `INASISTENCIA`, `INACTIVIDAD`). Sus efectos llegan como eventos publicados, y por tanto por Socket.IO a la sala `admin`.
- **Web**:
  - `ClienteApi` no tiene la operación.
  - `ClienteReal` guarda `demoHabilitada` (de `VITE_DEMO`) y ya lo usa para las consultas `soloDemo`.
  - `Admin.tsx` se une a la sala `admin` e invalida lecturas con cada evento.
- **Semilla**: hold de 10 min y tolerancia de 15 min (`apps/api/src/semilla/datosDemo.ts`).

## Goals / Non-Goals

**Goals:** un control seguro para adelantar el reloj desde `/admin` en la demo real, sin tocar contratos ni API.

**Non-Goals:** reiniciar la demo, mostrar la hora sin adelantarla, simular el reloj en el guion.

## Decisions

### D1. Operación opcional en `ClienteApi`
Se agrega `relojDemo?: { adelantar(minutos: number): Promise<{ ahora: string }> }`. `ClienteReal` lo define solo si `demoHabilitada`, y `ClienteMock` nunca. La vista decide si muestra la sección según exista `cliente.relojDemo`, sin preguntar por el modo. `adelantar` valida con `AdelantarRelojSchema` (error de validación sin petición), hace `POST` con el mismo manejo de errores HTTP que los comandos y valida la respuesta con `RespuestaRelojSchema`.
- Alternativa: un método siempre presente que lance `NO_DISPONIBLE`. Se descarta porque obliga a la vista a intentar para saber si existe.
- Sin `Idempotency-Key`: el contrato no lo define para esta ruta. La protección contra doble envío está en la vista (D2).

### D2. Candado síncrono en la sección
Un `useRef` impide un segundo envío mientras hay uno en curso, igual que `useAccion`. No se usa TanStack Query para la mutación, para no reintentar automáticamente un adelanto irreversible. «Reintentar» repite exactamente los mismos minutos, y solo lo pulsa el usuario.

### D3. Presentación
La sección va al final de `/admin`, después de las alertas. Incluye:

- el texto «Adelantar el reloj afecta a toda la demo y no se puede deshacer; usa `pnpm demo:reset` para volver al inicio»;
- los botones rápidos (15, 60, 1 440 y 10 080 minutos) y el campo numérico con `min`, `max` y mensaje de rango;
- la hora devuelta, formateada con `Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' })` en la zona del navegador, más la ISO UTC.

Tras el éxito, `invalidateQueries({ queryKey: ['consulta'] })`. Los eventos de los temporizadores llegan además por la sala `admin`.

## Risks / Trade-offs

- [Los temporizadores vencidos se ejecutan de forma asíncrona y el refresco inmediato no los ve aún] → La sala `admin` vuelve a invalidar las lecturas cuando llegan sus eventos; el escenario «Hold vencido en vivo» lo comprueba sin recargar.
- [Adelantar por error una semana] → El aviso y la falta de reintentos automáticos lo hacen explícito; la recuperación es `pnpm demo:reset`.
