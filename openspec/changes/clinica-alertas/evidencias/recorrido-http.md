# Recorrido HTTP en modo demo

API real con Postgres de prueba y Redis local. Datos semilla sintéticos en un esquema aislado.

~~~text
Cita A confirmada por HTTP en Tepic → CONFIRMADA
POST /api/comandos RegistrarLlegada A → 200 EN_CLINICA
Cita B confirmada por HTTP en Tepic → CONFIRMADA
POST /api/comandos RegistrarLlegada B → 200 EN_CLINICA
GET /api/sedes/{sede}/llegadas → 200 A=1, B=2
POST /api/comandos CerrarAtencion A → 200 ATENDIDA
GET /api/sedes/{sede}/llegadas → 200 B=1
POST /api/canales/wa/mensajes intento 1 → 200
POST /api/canales/wa/mensajes intento 2 → 200
POST /api/canales/wa/mensajes intento 3 → 200
GET /api/admin/alertas → 200, intentos 3, 2 y 1; solo el tercero indica bloqueo
La respuesta validada no incluye el teléfono ni las fechas enviadas.
~~~
