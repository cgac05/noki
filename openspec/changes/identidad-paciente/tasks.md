# Tasks

Cambio compartido: no empezar sin el visto bueno de ambos frentes registrado en `handoff.md`. Lo implementa el frente A. Escribir primero cada prueba. Al terminar cada grupo, `pnpm lint && pnpm lint:deps && pnpm test` en verde; desde el grupo 4, también `pnpm test:integracion` (Postgres de prueba en 55432 en CGAC1). Registrar resultados reales en `implementacion.md`. Las pruebas existentes se conservan; si una cambia (por ejemplo, la pista de `paciente` o una prueba que asigna paciente como `paciente`), registrar cuál y por qué, sin debilitar sus comprobaciones. Datos de prueba siempre sintéticos. `apps/web` no se toca.

## 1. Dominio (frente A)

- [x] 1.1 `identidad/curp.ts`: `validarCurp` (formato, fecha real, verificador) y `curpBase` con las reglas de design D4; `ENTIDADES_NACIMIENTO`. Pruebas: una tabla de casos sintéticos por regla (partícula, `JOSE`/`MARIA` compuesto, `Ñ`, sin materno, palabra inconveniente, sexo `X` → sin base) y verificador alterado → inválida. Ref: identificacion-paciente "CURP validada y concordante".
- [x] 1.2 `identidad/telefono.ts`: `normalizarTelefono` (últimos 10 dígitos) y `VIGENCIA_VINCULO_DIAS = 180`; `identidad/nombre.ts`: `enmascararNombre` ("Ana P."). `MetodoVinculo` gana `TELEFONO_FECHA_NAC`; eventos `DestinatarioDeclarado{relacion}` y `PacienteRegistrado{pacienteId}` en `EVENTOS_DOMINIO` y `PayloadsEvento`. Verificar con pruebas de la función y de tipos.
- [x] 1.3 `Tramite`: estado `identificacion` (D2), métodos `declararDestinatario` (con candidatos), `elegirCandidato`, `guardarFechaNac`, `guardarCurp`, `marcarSinCurp`, `reiniciarIdentificacion`, `pasoIdentificacion`, borrado al asignar, y `PASO_IDENTIFICACION_INVALIDO`. Serialización en `TramiteRegistro`. Pruebas: "Orden de pasos sin registro previo", "Para otra persona", "Paso fuera de orden", "Reiniciar", candidato ajeno → `PASO_IDENTIFICACION_INVALIDO`; la versión solo sube con cambios. Ref: identificacion-paciente "Pasos de identificación dentro de la casilla paciente".
- [x] 1.4 `siguientePregunta` y `tipos/agendar.ts`: pista de `paciente` por paso con `paso` (D9). Pruebas: "Captura sensible del paciente", "Primer paso del paciente", "Confirmar candidatos", "Datos con CURP pendiente"; las de orden por canal siguen en verde. Ref: siguiente-pregunta.
- [x] 1.5 Punto de control 1: `pnpm test --filter domain` en menos de 2 s; `packages/domain` sin dependencias.

## 2. Aplicación y memoria (frente A)

- [x] 2.1 Puertos: `PacientesPort.buscarPorCurp`, `buscarPorCurpBase`, `registrar`, `completarCurp`; `ContactosPort.pacientesPorTelefono` (vigentes en 180 días, con nombre y apellido paterno), y `vincular` que conserva el nivel mayor y actualiza `ultimo_uso`; `Vinculo` expone `ultimoUso`. Adaptadores en `adapters/memory`.
- [x] 2.2 `CasosTramite.identificarPaciente` según D5: los seis pasos, vínculos por relación y nivel, eventos, intentos y bloqueo. Pruebas de aplicación con memoria y `RelojFalso`: "Paciente ya registrado", "Número compartido por una familia", "Fecha que no coincide", "Número reasignado", "Tercer intento bloquea", "No soy ninguno" sin intento, "Fecha distinta", "CURP registrada", "Paciente registrado antes sin CURP", "Sin CURP", "Paciente nuevo sin CURP", "Paciente nuevo con CURP", "Otra persona sin CURP", `IDENTIDAD_AMBIGUA` por base y por datos, "Nada sensible en eventos ni vista". Ref: identificacion-paciente.
- [x] 2.3 `asignarPaciente` con actor `paciente` → `ASIGNACION_SOLO_PERSONAL`. Pruebas: "Paciente asigna un ID arbitrario", "Asesor asigna por ID", "Nivel según el método". Ref: politica-identidad "El teléfono no identifica al paciente".
- [x] 2.4 `ResolvedorContinuidad`: prioridad 2 solo con vínculos de nivel ≥ 1 y vigentes (D6); prioridad 3 con `normalizarTelefono`. Pruebas: "Vínculo declarado no revela", "Número reasignado sin uso reciente"; las pruebas obligatorias de continuidad y las del resolvedor existentes siguen en verde. Agregar "Identificación retomada en otro canal". Ref: continuidad-canales.
- [x] 2.5 Punto de control 2.

## 3. Contrato (compartido)

- [x] 3.1 `comandos.ts`: `IdentificarPaciente` (D3, D9, con `CONFIRMAR`) y `ENTIDADES_NACIMIENTO` exportadas por `@noki/contracts`; `siguientePregunta.ts`: `paso` opcional. Pruebas en `tests/unit/contratos.test.ts`: "Identificación por pasos", "Pregunta con paso" y las existentes. Ref: contratos-canales.
- [x] 3.2 `in-http/test/coherencia.test.ts`: validar con `SiguientePreguntaSchema` cada paso de `paciente`; comprobar que las entidades y los valores de `paso` del dominio y del contrato coinciden. Ref: siguiente-pregunta "Coherencia con el contrato".
- [x] 3.3 Punto de control 3: `contracts` sigue dependiendo solo de `zod`; las pruebas del proyecto `web` siguen en verde sin tocar `apps/web`.

## 4. Postgres (frente A)

- [x] 4.1 `infra/migraciones/003_identidad.sql` según D8. Pruebas de integración: "Migración sobre una base con datos", "CURP única", "Migraciones anteriores intactas" (`git diff main -- infra/migraciones/001_nucleo.sql infra/migraciones/002_persistencia.sql` vacío). Ref: persistencia-tramites "Migración de identidad del paciente".
- [x] 4.2 `PacientesPostgres` y `ContactosPostgres`: métodos de 2.1 (CURP duplicada → "ya existe" sin datos en el error). Mismas pruebas de contrato que la memoria.
- [x] 4.3 Prueba de integración "Registro concurrente" con `CasosTramite` y adaptadores Postgres.
- [x] 4.4 Semilla: CURP sintéticas válidas para Ana y Beto (coherentes con su nombre, fecha y sexo de la semilla, entidad `NT`), `entidad_nac` y `curp_base`. Verificar con `pnpm demo:reset` y una consulta de que las CURP pasan `validarCurp`.
- [x] 4.5 Punto de control 4: `pnpm test:integracion` en verde.

## 5. Documentación (compartido)

- [x] 5.1 `docs/contratos.md` (`IdentificarPaciente`, `paso`, entidades) y `AGENTS.md` §7 (comando nuevo); `docs/eventos.md` (`DestinatarioDeclarado`, `PacienteRegistrado`, método `TELEFONO_FECHA_NAC`).
- [x] 5.2 `PLAN.md` §5 (`paciente.entidad_nac`, `curp_base`, CURP única, método nuevo) y §8 (identificación por pasos con "¿eres X?" enmascarado, nivel por método, vínculos de nivel 0 e inactivos fuera de la prioridad 2, `AsignarPaciente` solo para personal); `AGENTS.md` §8: excepción del nombre enmascarado de `CONFIRMAR` a "nunca se confirman datos que el usuario no dio". Verificar que los nombres coinciden con el código.
- [x] 5.3 Punto de control final: `pnpm install && pnpm lint && pnpm lint:deps && pnpm test && pnpm test:integracion` en verde.
