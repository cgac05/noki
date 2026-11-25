# Tasks

Requisitos: CC = `continuidad-canales` («Llamada entrante retoma el trámite en proceso del número»). Validar con `npx --offline @fission-ai/openspec@1.14.0 validate llamada-retoma-tramite --type change --strict --no-interactive`.

## 1. Núcleo

- [x] 1.1 Escribir en rojo, en memoria (`tests/unit/nucleo/`), los cinco escenarios del requisito CC y el escenario modificado «Llamada nueva tras continuar en WhatsApp».
- [x] 1.2 Agregar `LLAMADA_CC` a `MetodoVinculo` y a `docs/eventos.md`. Agregar a `ContactosPort` una consulta de hilos por los últimos 10 dígitos para contactos `whatsapp` y `callcenter`, en memoria y en Postgres (índice `contacto_telefono`).
- [x] 1.3 Implementar la regla en `CasosTramite.iniciar` solo para `callcenter` con actor `asesor:*` y contacto: elegir el trámite en proceso según el requisito, retomarlo con `HiloAtencion.retomar('callcenter', 'LLAMADA_CC')` / `Tramite.retomar` (sin identidad) o el equivalente existente, guardar trámite e hilo, y si no hay ninguno, crear como hoy. Verificación: 1.1 en verde y las pruebas existentes del núcleo en verde.

## 2. Integración

- [x] 2.1 Prueba en `tests/integracion/` contra Postgres y HTTP: mensaje de WhatsApp que deja `COTIZADO` y después `IniciarTramite` de `callcenter` con el número de 10 dígitos devuelve el mismo trámite. Verificación: pasa con el Postgres de prueba en 55432.

## 3. Controles

- [x] 3.1 `lint`, `lint:deps`, pruebas unitarias del núcleo y de la API, e integración de los archivos afectados, en serie. Evidencia en `evidencias/` sin rutas locales ni datos personales.
