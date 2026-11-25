# Proposal

## Why

Christian (2026-11-25, hilo del proyecto): «la app móvil solo los terminados; incluyamos: si no está concluida, termine el proceso». Hoy `/app`, ya con identificación (`app-sesion`), solo muestra citas (`citasPaciente`). Un trámite a medias del mismo número no aparece y no se puede terminar desde la app.

## What Changes

- `/app`, después de identificarse, muestra además «Citas por terminar»: los trámites `AGENDAR` en proceso del número (`sesionWebDemo.tramitesEnProceso`) y del paciente (`tramitesAbiertos`, solo estados en proceso), sin duplicados, con servicio y sede.
- «Termina tu cita» abre dentro de `/app` el mismo asistente que `/web` (`AsistenteCita` con el teléfono de la sesión), para completar horario, datos y confirmación. «Volver» regresa a la lista. Al confirmar, la cita aparece en la lista de citas.
- Funciona también sin paciente vinculado: si hay trámites en proceso, se muestran aunque no haya citas.

### Fuera de alcance
API y contratos (se reutilizan `sesionWebDemo`, `tramitesAbiertos` y `AsistenteCita`). Igual que en web y call center, los pasos quedan registrados con canal `whatsapp`.

## Capabilities

### Modified Capabilities
- `navegacion-canales`: requisito nuevo «Terminar en la app una cita en proceso».

## Impact
`apps/web/src/vistas/App.tsx` y sus pruebas; cliente simulado si hace falta. Ninguna dependencia nueva.
