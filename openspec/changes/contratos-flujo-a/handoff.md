# Transferencia: contratos-flujo-a

- Responsable: cambio compartido. Requiere el visto bueno de un responsable de cada frente: `J3sus-esb` o Christian Avila (`cgac05`), co-responsables del frente A, y `LuisMaster119` por el frente B (`docs/trabajo-paralelo.md`). Propuesta: lo implementa el frente A, incluido el ajuste mínimo de `apps/web` (tarea 2.1), que el visto bueno del frente B debe cubrir expresamente.
- Objetivo: completar el contrato compartido para el Flujo A real; ver `proposal.md` (Why). Lo consume el grupo 7 de `api-comandos`.
- Alcance autorizado: `proposal.md` (What Changes) sin lo listado como "Fuera de alcance"; tareas 1.1–2.3. Sin `design.md`: las decisiones son de forma del contrato y están en la propuesta y en `api-comandos/design.md` D12.
- Visto bueno del frente A: otorgado para la revisión 1 por Christian Avila, co-responsable del frente A, en el hilo del proyecto el 2026-11-24. Cita: "Doy el visto bueno del frente A a contratos-flujo-a revisión 1, implementado por el frente A". Cubre que lo implemente el frente A, incluida la tarea 2.1 en `apps/web`, sujeta al visto bueno del frente B.
- Autorización de commit y push: Christian Avila, mismo mensaje: "Autorizo crear un commit con contratos-flujo-a en la rama feat/contratos-flujo-a desde main y hacer push de esa rama para que Luis la revise". Cubre solo ese commit de los artefactos y el push de esa rama.
- Visto bueno del frente B: PENDIENTE.
- Revisión presentada: revisión 1 (rama `feat/contratos-flujo-a` desde `main` `a576e79`), SHA-256 (12 primeros caracteres): `proposal.md` dde609d8859e · `tasks.md` 8bcd8958ed3c · `specs/contratos-canales/spec.md` 6b63de4448b5 · `specs/contratos-consultas/spec.md` 1ca1e6da95a5. `openspec validate` no se pudo ejecutar en la máquina de Claude: el CLI no está instalado.
- Artefactos a leer: `proposal.md`, los dos specs, `tasks.md`; `openspec/changes/api-comandos/design.md` D7 y D12; `docs/contratos.md`; `AGENTS.md` §5–§9; `openspec/specs/contratos-canales/spec.md` y `contratos-consultas/spec.md`.
- Tareas pendientes: 1.1–2.3 de `tasks.md`.
- Restricciones: tocar solo `packages/contracts/src/{comandos.ts,consultas.ts,vocabulario.ts,tiempoReal.ts,index.ts}`, `tests/unit/{contratos,consultas}.test.ts`, `packages/adapters/in-http/{src/mapeoErroresHttp.ts,test/coherencia.test.ts}`, `apps/web/src/**` solo según la tarea 2.1, `docs/contratos.md` y `AGENTS.md` §7. `contracts` solo con `zod`. Ningún campo de lectura nuevo con datos personales. No crear commits ni publicar sin autorización explícita.
- Criterios de aceptación: los requisitos modificados y sus escenarios en los dos specs; las pruebas existentes de contratos y de la web siguen en verde.
- Validaciones requeridas: puntos de control 1.5 y 2.3; `pnpm --filter @noki/web build`.
- Detener la parte afectada si: hace falta cambiar algo fuera de los archivos listados, una vista de `apps/web` requiere más que tolerar `null`, o un responsable pide otra forma para algún campo (vuelve a planificación).
- Integración: después del merge en `main`, el frente B hace rebase y `api-comandos` ejecuta su grupo 7.
- Autorización de cierre: PENDIENTE (de ambos frentes).
