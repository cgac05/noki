# Transferencia: contratos-consultas

- Responsable: cambio compartido. Lo implementa el frente B (`LuisMaster119`), con el visto bueno de los dos responsables: `LuisMaster119` por el frente B y `J3sus-esb` o Christian Avila (`cgac05`), co-responsables, por el frente A.
- Objetivo: llevar a `@noki/contracts` los modelos de lectura y la tabla de rutas de consulta, y migrar la web a ellos; ver `proposal.md` (Why).
- Alcance: `proposal.md` (What Changes), sin lo listado como "Fuera de alcance"; design D1–D5. Incluye la decisión "solo datos, sin acciones prearmadas" (design D1), que el frente A debe aceptar al autorizar.
- Visto bueno del frente B para que el frente B lo implemente: PENDIENTE de `LuisMaster119`.
- Visto bueno del frente A para que el frente B lo implemente: PENDIENTE de `J3sus-esb` o Christian Avila. Solo se pedirá cuando la rama `feat/contratos-consultas` esté en GitHub y el frente A haya revisado los artefactos.
- Revisión presentada: rama `feat/contratos-consultas` sobre `main` `7789d32`, sin commit del cambio; SHA-256 (12 primeros caracteres): `proposal.md` 8d848a6d6ffb · `design.md` bfcbfa603227 · `tasks.md` 2f6f929cac1e · `specs/cliente-api-canales/spec.md` 5bf56828c376 · `specs/contratos-consultas/spec.md` 1a6e5d990b25. `openspec validate contratos-consultas --type change --strict --no-interactive` → válido.
- Artefactos a leer: `proposal.md`, los dos specs, `design.md`, `tasks.md`; `docs/contratos.md`; `AGENTS.md` §5–§9; `docs/trabajo-paralelo.md`; `openspec/specs/cliente-api-canales/spec.md` y `navegacion-canales/spec.md`.
- Tareas pendientes: 1.1–4.3 de `tasks.md`.
- Restricciones: tocar solo `packages/contracts/src/{consultas.ts,index.ts}`, `tests/unit/consultas.test.ts`, `apps/web/**`, `docs/contratos.md`, `AGENTS.md` §7 y la tabla de `docs/trabajo-paralelo.md`; nada de `apps/api`, `packages/domain`, `packages/application` ni adaptadores; `contracts` solo con `zod`; evidencia en la carpeta del cambio, no en `apps/web`; completar cada punto de control antes del siguiente; no crear commits.
- Criterios de aceptación: todos los requisitos y escenarios de `contratos-consultas` y del delta de `cliente-api-canales`; el Flujo A simulado sigue funcionando igual.
- Validaciones requeridas: puntos de control 1.3, 2.4, 3.4 y 4.3; comprobación manual 3.3.
- Detener la parte afectada si: hace falta cambiar comandos, eventos, `TramiteVista` u otro contrato existente; hace falta código del frente A; una vista tendría que decidir reglas de negocio para armar un comando.
- Autorización de cierre: PENDIENTE
