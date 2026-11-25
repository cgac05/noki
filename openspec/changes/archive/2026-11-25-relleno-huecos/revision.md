# Revisión: relleno-huecos

## Vuelta 1 (Claude, 2026-11-25)

- **Dictamen: PASS.**
- **Alcance:** revisión 4 autorizada, con las excepciones de D3 y D8 y la aclaración del puerto de botones (ver `handoff.md`). Los hashes de `proposal.md`, `design.md` y del spec coinciden con la revisión 4. `tasks.md` solo cambió en las casillas (9/9). La rama es `claude/project-thread-nqfp68` con base `c7650ad` sobre `main` `d37b8c2`, que sigue siendo el `main` de origen. El diff está sin commit.

### Contraste con requisitos y diseño

- **Aprobación (D1, RH «Aprobación de la cancelación por WhatsApp»):** `CasosTramite.cancelar` solo pide aprobación cuando falta `BOTON_APROBACION`. `AprobacionCancelacion.solicitar` busca el contacto vigente del **paciente del trámite** y nunca el número de quien pide. La respuesta es siempre `StepUpRequerido(0, ['BOTON_APROBACION'])`. La idempotencia guarda solo ese 403 concreto, así que repetir la misma clave no reenvía el mensaje (prueba HTTP). "No, conservarla" consume el `jti` compartido.
- **Tokens de botón:** `TokensBotonWaJose` verifica firma, `typ`, vigencia con el reloj del puerto, uso, acción y contacto, y solo después consume el `jti`. Un número distinto no invalida el botón legítimo (pruebas en memoria y JOSE). Dos acciones simultáneas consumen uno solo. `VerificadorTokens` no cambió.
- **Detección y candidatos (D4, D9):** el grupo `huecos` reacciona a `CitaCancelada` y `CitaAdelantada`. Hay un solo hueco por reserva de origen, garantizado por `UNIQUE (origen_reserva_id)` y por la comprobación previa. `candidatoCompatible` es pura y cubre el ayuno o la preparación, el adelanto real, la ventana, la sede, el límite de 3 en 7 días y el silencio de 22:00 a 07:00 con la hora local que da el puerto. El orden es FIFO.
- **Ofertas y saga (D5, D8):** secuencial con 1 candidato y oleada con hasta 5. La vigencia es el mínimo entre 15 min y el inicio del hueco. El temporizador es `OFERTA:<ofertaId>`. La saga aparta, registra fuera, confirma, adelanta y guarda, y solo después libera el horario anterior. Ante un fallo compensa y deja la oferta `EXPIRADA`. El índice único da un solo ganador en Postgres (3 aceptaciones simultáneas: `ACEPTADA, PERDIDA, PERDIDA`), y los perdedores reciben el texto de D6.
- **Privacidad:** los textos de oferta solo llevan servicio, sede, fecha y hora. Los eventos de hueco van al hilo de origen y los de oferta al del candidato, y los payloads solo llevan IDs (coinciden con la tabla de `implementacion.md`).
- **Modo demo (D13):** fuera de `DEMO_MODE` no se emiten tokens, `enviar` no emite nada, los botones devuelven "no disponible" y el hueco queda `DESIERTO` (pruebas de aplicación y de tokens).
- **Panel, KPI y tiempo real (D10):** `panelHuecos` registrado con el máximo de 50 y orden descendente (prueba con 60). `admin:metricas` se emite con `OfertaEnviada` y `HuecoAsignado`. El reenvío al unirse a `wa:<waId>` solo ocurre en demo.
- **Semilla (D11):** Ana, Beto y Carla con citas, intereses y vínculos, y `seed` sobre una base vacía (evidencia 04).
- **Arquitectura:** `lint:deps` sin violaciones. El dominio no tiene `Date.now`, `new Date()` ni conversión de zonas. Los puertos nuevos tienen adaptador real y de memoria. No hay cambios en `packages/contracts`, `apps/web` ni `docs/`.

### Controles independientes

Ejecutados en serie, sin otros procesos, con la configuración por defecto:

| Control | Resultado | Evidencia |
|---|---|---|
| `corepack pnpm lint` | código 0 | `evidencias/revision-lint.txt` |
| `corepack pnpm lint:deps` | código 0 | `evidencias/revision-deps.txt` |
| `corepack pnpm test` | código 0, 443/443 en 75 archivos | `evidencias/revision-test.txt` |
| integración (Postgres 55432, Redis 6379) | código 0, 52/52 en 18 archivos | `evidencias/revision-integ.txt` |

### Hallazgos (ninguno bloquea)

- **H-01 (sugerencia, baja):** cualquier llamada de `CancelarCita` con actor `paciente` y una clave nueva envía otro mensaje de aprobación al dueño de la cita. No cede control, porque solo el dueño puede aprobar, pero permite insistir con mensajes. Sugerencia para un cambio posterior: no reenviar mientras haya una aprobación vigente de ese trámite.
- **H-02 (sugerencia, baja):** el interés de Beto sigue `ACTIVO` después de adelantar. No afecta la demo, porque sus nuevos candidatos deben ser anteriores a la cita adelantada. Conviene definir cuándo pasa a `CUMPLIDO` en el cambio de recordatorios o de preferencias.
- **H-03 (integración):** `docs/eventos.md` se actualiza en `feat/catalogo-eventos-huecos` (frente B, D12). Este núcleo agrega 11 eventos que esa documentación todavía lista como reservados, así que conviene integrar los dos cambios uno seguido del otro.

### Pendiente

- Autorización de cierre del frente A: commit, integración en `main`, sincronizar specs, archivar y push.
