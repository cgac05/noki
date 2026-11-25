# Implementación de ajustes-flujo-a

Se aplicó la revisión 1 autorizada en el handoff, con los hashes comprobados, sobre la rama feat/ajustes-flujo-a en c9d18dd. Se completaron las siete tareas. Los cambios se entregan sin commits.

- A1. El puerto de disponibilidad lleva la zona de la sede. El cliente HTTP ya enviaba los campos de la consulta como parámetros, de modo que la nueva zona viaja por ese camino. sd-mock y el adaptador en memoria calculan 15 inicios desde las 09:00 locales. sd-mock rechaza la zona ausente o inválida con 400.
- A2. WhatsApp usa etiquetas en español y fechas con día en las listas, los resúmenes y las confirmaciones. La identificación muestra «¿Eres alguna de estas personas?».
- A3. Un inicio cambia el último canal del hilo sin registrar CanalCambiado. Las lecturas de memoria y Postgres vuelven editable la ficha cuando llega una llamada nueva. La segunda continuación registra un nuevo CanalCambiado.

Se modificaron los adaptadores autorizados de WhatsApp, agenda y lecturas, el dominio del hilo, el caso de uso de inicio, la composición de pruebas de la API y las pruebas de dominio, HTTP e integración. La única dependencia nueva del manifiesto es date-fns-tz 3.2.0 en sd-mock. El lockfile se actualizó con Corepack.

Pasaron la instalación congelada, lint, lint:deps, 312 pruebas unitarias y web y 38 pruebas de integración contra Postgres de prueba en el puerto 55432 y Redis. OpenSpec 1.14.0 devolvió ENOTCACHED en modo offline y se usaron los artefactos locales. La evidencia está en [controles](evidencias/controles.md) y [recorrido real](evidencias/flujo-real.md).

El árbol se validó sobre la base autorizada. origin/main avanzó con temporizadores, cuyos archivos modificados no activaron la condición de parada del handoff. La integración y la revisión independiente quedan pendientes.

## Correcciones de la primera revisión

- H-01. `textosWa.ts` usa «en la web», «en la App», «Acepto la preparación», «Confirmo mis datos» y «¿En qué clínica te atendemos?». Se actualizó la expectativa correspondiente en `comandosHttp.test.ts`.
- H-02. `consultasWaMemoria.test.ts` cubre un servicio que requiere consentimiento y orden médica, y comprueba las etiquetas y la ausencia de identificadores internos en la respuesta.
- H-03. `CasosTramite.ts` guarda el trámite antes de cambiar el canal de un hilo existente. `casosTramite.test.ts` verifica que, si falla ese guardado, el hilo sigue en WhatsApp y solo conserva el trámite anterior.

El control 4.1 pasó de nuevo, con 314 pruebas unitarias y web y 38 de integración. Los resultados están en [controles](evidencias/controles.md).
