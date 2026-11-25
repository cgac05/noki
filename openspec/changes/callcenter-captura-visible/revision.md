# Revisión: callcenter-captura-visible

**Dictamen: PASS con riesgos residuales.** Base `main` `0b59599`, árbol local de `noki` el 2026-11-25.

## Comprobaciones de Claude

| Control | Resultado |
|---|---|
| Diff contra D1–D3 | Conforme. `capturaAsesor` solo en `IdentificacionAsesor`; `/wa` conserva «Mostrar/Ocultar». Catálogo tipado con las 33 claves de `ENTIDADES_NACIMIENTO`. |
| `vitest` unitarios y web, `tsc`, `eslint`, `lint:deps`, build web real | Verde / código 0 (mismas corridas que `web-modo-real`). |
| CURP | Codex comprobó con la API real que una CURP válida de la semilla avanza (HTTP 200) y que una con dígito verificador incorrecto da `CURP_INVALIDA` (HTTP 422, validación del dominio). La CURP del reporte no se reprodujo. |
| Recorrido en navegador | BLOQUEADO por la misma razón que `web-modo-real`. |

## Hallazgos

- Sin hallazgos bloqueantes.
- Riesgo residual: si la CURP de Christian es real y aun así falla, revisar `validarCurp` del dominio con ese caso (fuera de alcance).
