# Persistencia y publicación de eventos

La migración `002_persistencia` agrega la instantánea JSON y canal de origen del trámite, el folio único de la reserva, el hilo de referencia del contacto, el nivel del vínculo y la tabla `intento_verificacion`. Convierte las claves de idempotencia de `evento` y `evento_procesado` a texto y conserva sus restricciones de unicidad. Admite UUID en minúsculas y sus variantes con sufijo `:n`.

El repositorio escribe la versión del trámite, sus eventos y una fila de outbox por evento en una misma transacción. Si falla una escritura, revierte todo y el agregado conserva sus eventos pendientes. El registro de intentos cuenta y bloquea en PostgreSQL. Aplicación construye el evento de verificación fallida y lo guarda con su outbox en una transacción posterior.

## Relay y consumidor

- La partición es FNV-1a de 32 bits sobre los bytes UTF-8 de `pacienteId ?? hiloId`, módulo 8. Asignar paciente puede cambiar de partición.
- El relay toma un bloqueo consultivo de sesión por partición. Publica en `eventos:{n}` en orden de outbox y marca cada fila después de la confirmación de Redis. Un error deja la fila pendiente y registra `PUBLICACION_FALLIDA`. Si Redis confirma y el relay cae antes de marcar, el mensaje se publica de nuevo.
- Un consumidor base por grupo recupera los pendientes y luego lee eventos nuevos. Registra la clave procesada en `evento_procesado` y confirma con `XACK`. Al tercer fallo, mueve el identificador y el motivo genérico a `eventos:fallidos`. El manejador de negocio debe ser idempotente si un proceso falla entre efectuar su operación y registrar la clave.

## Reservas y agenda simulada

`HORARIO_NO_DISPONIBLE` indica que el horario no se pudo apartar o que el hold ya no se puede confirmar. Al detectar un hold vencido en la confirmación, el trámite emite `ReservaExpirada`. `AGENDA_NO_DISPONIBLE` indica que se agotaron los intentos contra la agenda externa. Si el guardado del trámite entra en conflicto después de confirmar la reserva y el ganador quedó con otro estado o folio, la saga cancela la cita externa y libera la reserva.

`sd-mock` expone `GET /agenda/disponibilidad`, `POST /agenda/citas` y `DELETE /agenda/citas/:folio`. Configura su latencia y probabilidad de fallo con `PUT /simulacion` y un cuerpo como `{"latenciaMs":300,"falloPorcentaje":20,"fallarSiguientes":2}`. Las rutas de agenda permiten ajustar los parámetros por solicitud con `?latencia=300&fallo=20`. `fallarSiguientes` es opcional. El cliente hace hasta tres intentos y limita cada petición a un segundo.

`api-comandos` debe conectar los repositorios, proporcionar el cliente de agenda externa configurado con `SD_MOCK_URL`, conservar las claves de evento en los consumidores y traducir las reglas de agenda a HTTP 422.
