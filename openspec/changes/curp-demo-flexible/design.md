# Design

## Decisions

### D1. Contrato relajado, núcleo estricto salvo en demo
El contrato no conoce el modo, así que acepta `^[A-Z0-9]{18}$`. El núcleo conserva `validarCurp` y decide con `curpFlexible` (constructor u opciones de `CasosTramite`, falso por defecto; `componerComandos` y `crearApiPruebas` lo ponen igual a `demo`).

### D2. CURP no verificable = sin CURP
Con `curpFlexible`, en `identificarCurp`, si `validarCurp` falla o la fecha no coincide con la declarada, se llama `tramite.marcarSinCurp()` y se termina sin error ni intento. Así `DATOS` pide fecha, sexo y entidad, y nunca se intenta guardar una CURP que viola `paciente_curp_formato`.

### D3. Nombres que no concuerdan
Con `curpFlexible`, en `identificarDatos`, si `coincideNombreCurp` falla, se registra o reutiliza al paciente sin la CURP (los datos de nacimiento se toman de la CURP válida), en lugar de `CURP_NO_COINCIDE`.

## Risks
CURP falsas aceptadas en la expo. Fuera de demo no cambia nada.
