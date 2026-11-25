# Implementación de clinica-alertas

- Resumen. Recepción puede cerrar cualquier cita en clínica. Cada turno posterior que cambia de posición registra su propio evento. La posición se calcula por orden de llegada y se emite en Socket.IO. La consulta de alertas devuelve hasta 50 intentos fallidos sin datos personales.
- Revisión entregada. Revisión 2 sobre e3d49ea en feat/clinica-alertas, con el diff local y los archivos nuevos del manifiesto.
- Autorización. El handoff registra la autorización de la revisión 2. En el chat de implementación, el usuario confirmó que la revisión 2 prevalece sobre PLAN.md §§8–9 para este cambio y que la actualización del plan corresponde a documentacion-compartida. La llegada usa el QR firmado y ComprobarIdentidad conserva el 404.
- Archivos modificados. [Manifiesto del frente A](evidencias/manifiesto.md).
- Tareas. 1.1–3.2 completas.
- Decisiones de implementación. La fila toma las citas elegibles de la sede según el corte local y el límite de la consulta, y ordena las llegadas registradas por fecha del evento e ID. El agregado evita repetir una posición dentro de la misma instancia. La posición de lectura se deriva de las llegadas, sin añadirla a la instantánea. Los puertos internos TramiteRepo y LecturasPort incorporan las operaciones de la revisión 2.
- Limitaciones. Como se acepta en D3, los cierres simultáneos pueden emitir posiciones intermedias y el guardado de cada avance es independiente. Un fallo de ese guardado se registra sin impedir el cierre ni el siguiente avance. La revisión independiente está pendiente.

| Validación | Comando o comprobación | Resultado | Evidencia |
|---|---|---|---|
| 1.1 y 1.2 | Vitest de dominio y casos de uso | PASS. Guarda de estado y de rol, cierre en dos posiciones y recuperación tras fallo parcial. | Suite unitaria |
| 2.1 | Batería de lecturas compartida | PASS en memoria y Postgres. Orden de llegada, sin intentos y límite de 50. | Suite unitaria e integración |
| 2.2 y 2.3 | Pruebas HTTP y Socket.IO | PASS. 409 de cita sin llegada, 404 de identidad, bloqueo al tercer intento y emisiones de llegada y cierre. | Suite unitaria e integración |
| 3.1 | corepack pnpm lint, lint:deps, test y test:integracion | PASS. 339 pruebas unitarias/web y 46 de integración. | [Controles](evidencias/controles.md) |
| 3.2 | API por HTTP con DEMO_MODE=true | PASS. Dos llegadas en Tepic, cierre, recálculo de la fila y tres alertas verificados. | [Recorrido HTTP](evidencias/recorrido-http.md) |
