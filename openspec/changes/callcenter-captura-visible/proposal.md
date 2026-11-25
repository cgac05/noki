# Propuesta: callcenter-captura-visible

## Why

Christian probó «Identificar paciente» en `/callcenter` (2026-11-25, captura en el hilo del proyecto):

1. Con CURP la identificación no avanza («no pasa la curp»). Causa sin confirmar.
2. Por nombre, «Sexo» y «Entidad de nacimiento» son texto libre; «nayarit» o «m» se rechazan con «Revisa el formato de este campo», porque el contrato solo acepta `F|M|X` y las claves de `ENTIDADES_NACIMIENTO` (`NT`, `JC`…).
3. Los datos que captura un empleado se ocultan como contraseña («Mostrar/Ocultar»). En la captura asistida por un asesor (no PIN ni OTP) deben verse siempre.

## What Changes

- Diagnosticar y corregir el fallo de CURP en `/callcenter` con la API real; dejar la causa en `implementacion.md`.
- En el formulario del asesor, `sexo` se elige en un selector («Mujer» `F`, «Hombre» `M`, «No binario» `X`) y `entidadNacimiento` en un selector con los nombres de los estados en orden alfabético y «Nací en el extranjero» (`NE`), que envían la clave del contrato. Mismos textos que `wa-una-pregunta` (D4 de su diseño), sin importar adaptadores.
- En `/callcenter` los campos `texto` y `sensitive` se muestran siempre en claro, sin botón «Mostrar/Ocultar». Los campos `passcode` (PIN/OTP) siguen ocultos. `/wa` no cambia.

## Fuera de alcance

- Cambios en `packages/contracts`, el dominio o el flujo `/wa` y su cambio `wa-una-pregunta`. Si la causa de la CURP está en el núcleo, detener y documentar.

## Impact

- `apps/web/src/componentes/{ModalFlow,IdentificacionAsesor}.tsx`, `apps/web/src/cliente/identificacion.ts`, un módulo nuevo de catálogo de entidades en `apps/web` y sus pruebas.
