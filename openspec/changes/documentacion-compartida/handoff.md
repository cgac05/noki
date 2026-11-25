# Transferencia: documentacion-compartida

- Responsables: cambio **compartido**. Hace falta el visto bueno de un responsable de cada frente: frente A (`J3sus-esb` o `cgac05`) y frente B (`LuisMaster119`, escrito por él o transmitido textualmente y atribuido).
- Objetivo: poner al día los archivos compartidos. Incluye quitar `ComprobarIdentidad` y la INE, la tabla de rutas uniforme, las alertas documentadas como disponibles, el contrato del reloj de demo, `AGENTS.md` §7 con temporizadores, `docs/eventos.md` y el README. Ver `proposal.md` (Why).
- Alcance propuesto: `proposal.md` (What Changes), sin lo listado en «Fuera de alcance»; design D1–D4.
- Visto bueno del frente A: otorgado por `cgac05` (Christian Avila) en el hilo del proyecto el 2026-11-25. Cita: "Como frente A, doy visto bueno a documentacion-compartida con la revisión 1; lo implementa el frente A."
- Visto bueno del frente B: otorgado por `LuisMaster119`, transmitido textualmente y atribuido por Christian en el mismo mensaje. Cita: "Doy visto bueno a documentacion-compartida con la revisión 1; lo implementa el frente A."
- Los dos cubren la revisión 1 (hashes de abajo, sin cambios al registrarlos) y que la implemente el frente A, incluidos los archivos compartidos. No autorizan commits.
- Revisión presentada: revisión 1 en la rama local `feat/documentacion-compartida` (checkout `noki`), sobre `main` `e3d49ea` (avanzada por fast-forward a `71f01f5`, con `clinica-alertas` integrado, el 2026-11-25), sin commit. SHA-256 (12 primeros caracteres): `proposal.md` a5acb08df58a · `design.md` ede3ad4161ed · `tasks.md` 38310a0eadf1 · `specs/contratos-canales/spec.md` 2f0d06fece4b. `openspec validate documentacion-compartida --type change --strict --no-interactive` → válido.
- Orden: implementar e integrar **después** de `clinica-alertas` (D4). Antes de empezar, hacer rebase sobre `main` con `clinica-alertas` ya integrado.
- Quién implementa: se propone el frente A con Codex, incluidos los archivos compartidos. El visto bueno del frente B debe cubrirlo.
- Artefactos a leer:
  - `proposal.md`, `design.md`, `tasks.md` y el delta de `contratos-canales`;
  - `openspec/specs/{contratos-canales,contratos-consultas,reloj-demo,temporizadores-tramite,publicacion-eventos}/spec.md`;
  - `AGENTS.md`, `PLAN.md` §7–§8, `docs/contratos.md`, `docs/eventos.md` y `README.md`.
- Tareas pendientes: 1.1–3.1.
- Restricciones:
  - No tocar `apps/web`; el botón «Adelantar reloj» es del cambio de pantallas del frente B.
  - Sin eventos ni migraciones nuevas.
  - No crear commits.
- Detener la parte afectada si:
  - algún cliente de `apps/web` envía `ComprobarIdentidad`;
  - `clinica-alertas` no está en `main` al empezar.
- Autorización de cierre: otorgada el 2026-11-25 en el hilo del proyecto, después de la primera vuelta PASS de `revision.md`:
  - Frente A, `cgac05` (Christian Avila): "Autorizo commit, push de feat/documentacion-compartida, integrar en main por fast-forward y cerrar documentacion-compartida."
  - Frente B, `LuisMaster119`, transmitido textualmente y atribuido por Christian en el mismo mensaje: "Autorizo cerrar documentacion-compartida e integrarlo en main."

  Cubren el commit, el push de la rama, el fast-forward de `main` y su push, y la sincronización de specs y el archivado.
