# Revisión: contratos-consultas

- Dictamen: PASS
- Revisión inspeccionada: rama `feat/contratos-consultas` en `6b04834` más el diff sin commit del 2026-11-24. Archivos tocados: `packages/contracts/src/{consultas.ts,index.ts}`, `tests/unit/consultas.test.ts`, `apps/web/**`, `docs/contratos.md`, `AGENTS.md` §7 y la tabla de `docs/trabajo-paralelo.md`, todos dentro de lo permitido en `handoff.md`. `handoff.md` solo tiene cambios de Claude (vistos buenos y ajuste de orden). Propuesta, diseño y specs conservan los hashes de la revisión 2 autorizada; `tasks.md` cambió por el ajuste de orden registrado y por las casillas.
- Cobertura: 17/17 tareas; 8 requisitos ADDED (`contratos-consultas` 4, delta de `cliente-api-canales` 4) y 1 REMOVED; design D1–D5.
- Evidencia comprobada independientemente (Claude):
  - `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm lint:deps` (119 módulos, 278 dependencias, sin violaciones), `pnpm test` (19 archivos, 132/132), `pnpm test:integracion` (3 archivos, 17/17) y `pnpm --filter @noki/web build` → todos con código 0. `packages/contracts` depende solo de `zod` 4.1.13. `openspec validate contratos-consultas --type change --strict` → válido.
  - Contrato (`packages/contracts/src/consultas.ts`):
    - Seis modelos de lectura.
    - `tokenQr` rechaza folios de 8 o 9 dígitos.
    - `zonaHoraria` se valida con `Intl`.
    - `precioCentavos` es un entero no negativo.
    - `telefonoEnmascarado` usa el patrón `•••• dddd`.
    - `FichaHilo` y `LlegadaVista` no tienen acciones.
    - Los objetos de Zod descartan las claves desconocidas.
    - `RUTAS_CONSULTAS` tiene las 9 consultas con parámetros UUID v7, y `bandeja` está marcada como `soloDemo`.
    - `rutaConsulta` valida los parámetros antes de sustituirlos.
  - Pruebas: `tests/unit/consultas.test.ts` tiene una prueba con el nombre de cada escenario de `contratos-consultas`, incluido el del folio (`it.each` con 8 y 9 dígitos) y el del precio decimal. Las pruebas de `apps/web` cubren los escenarios del delta: datos simulados contra el contrato, lectura real mal formada, ruta de la tabla, bandeja fuera de demo, registrar llegada desde la cita y selección de catálogo.
  - REMOVED "Datos de lectura provisionales aislados": `apps/web/src/cliente/provisional.ts` ya no existe. Los tipos de demo viven en `demo.ts`, y los modelos de lectura se importan de `@noki/contracts`.
  - Vistas: `Clinica.tsx` arma `RegistrarLlegada` con `cita.tokenQr`, y `CallCenter.tsx` arma `IniciarTramite`, `SeleccionarServicio` y `SeleccionarSede` con los IDs de la oferta. Todos se validan con `ComandoRequestSchema` y se envían por el cliente. `useAccion` envía la secuencia con una clave de idempotencia por comando y, al reintentar, retoma desde el comando que falló.
  - `ClienteReal.consultar` usa `rutaConsulta` y valida la respuesta con el esquema de la tabla. `bandeja` exige `VITE_DEMO=true`, y `conversacion` y `web` devuelven `NO_DISPONIBLE` en modo real.
  - Documentación: `AGENTS.md` §7 lista las 9 rutas y conserva `/api/admin/embudo` y `/api/admin/huecos` como pendientes, además de advertir que las consultas no tienen autenticación. `docs/trabajo-paralelo.md` registra `cgac05`.
  - Navegador (modo mock, 375 × 812): Flujo A completo. Llamada entrante → cotización a $250.00 → continuar por WhatsApp → `/wa` retoma en el horario → horario → verificación → confirmar → `/app` con el QR visible (y=322–546) → `/clinica` registra la llegada (`EN_CLINICA`) → `/admin` con 3 `CanalCambiado`. Sin desplazamiento horizontal.
- Evidencia de Codex aceptada tras inspección: la consola sin errores en un servidor recién iniciado está en `evidencias/03-consola.json` y `03-servidor.txt`. En el servidor de 5173, que sigue en marcha desde antes de estos cambios, la consola acumula los errores ya conocidos (H-02 de `esqueleto-canales`) y fallos de recarga de CSS durante la edición. No son atribuibles al código entregado. Revisé también los registros en rojo (`01-consultas-rojo.txt`) y la búsqueda sin duplicados (`02-sin-duplicados.txt`). Corrección: 8 archivos de evidencia sí contienen rutas locales con el nombre del usuario (ver H-04).
- Controles no ejecutados: ninguno aplicable. Las rutas reales no se prueban contra la API porque `api-comandos` no existe todavía (fuera de alcance).

| Hallazgo | Gravedad | Requisito / tarea | Evidencia | Corrección necesaria / estado |
|---|---|---|---|---|
| H-01 | SUGGESTION | cliente-api-canales "Comandos armados por la vista" | `Clinica.tsx` y `CallCenter.tsx` fijan en la vista los actores `recepcion:tepic` y `asesor:asesor1` | Cuando exista la sesión de roles (cambio de seguridad), obtener el actor del contexto de sesión en vez de fijarlo en la vista. No bloquea la demo |
| H-02 | SUGGESTION | Riesgo de integración | `ProveedorCliente.tsx:46`: `pacienteId` solo sale de `cliente.demo`. En modo real `/app` no tiene paciente que consultar | Resolverlo junto con la autenticación (el paciente lo da el token de contexto) o con la respuesta de `api-comandos`. Registrar como dependencia del frente A |
| H-04 | SUGGESTION | Privacidad (`AGENTS.md` §8) | `evidencias/01-consultas-rojo.txt`, `02-cliente.txt`, `02-test.txt`, `02-web.txt`, `03-test.txt`, `03-vistas.txt`, `04-integracion.txt` y `04-test.txt` contienen rutas absolutas del perfil local del usuario, con su nombre | Antes del commit, sustituir esas rutas por `<repo>`/`<home>`, como en `base-contratos` (H-02). **Resuelto** por Claude antes del commit, con la autorización del usuario («Commit e integrar»): las rutas se sustituyeron por `<repo>` en los 8 archivos y ya no queda ninguna |
| H-03 | SUGGESTION | Higiene | `AGENTS.md` quedó con finales de línea CRLF en la copia de trabajo (Git avisa que los normaliza a LF al hacer commit, por `.gitattributes`) | Ninguna acción obligatoria: el commit lo normaliza |

- Riesgos residuales: las consultas no tienen autenticación y exponen datos personales hasta el cambio de seguridad (registrado en la propuesta, el handoff y `AGENTS.md` §7). El frente A debe implementar las 9 rutas en `api-comandos` respondiendo con estos esquemas, y generar `tokenQr` como token firmado de un solo uso.
- Condiciones para recomendar el cierre: cumplidas. H-04 está resuelto; H-01 a H-03 son sugerencias abiertas.
- Próximo responsable: usuario (`LuisMaster119`), con el frente A. Hacer commit de la rama e integrarla a `main` con los controles de `docs/trabajo-paralelo.md`. Como es un cambio compartido, el cierre (sincronizar y archivar) necesita la autorización de un responsable de cada frente.
