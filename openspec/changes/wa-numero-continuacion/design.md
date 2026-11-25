# Design

## Decisions

### D1. El ANI sale del comando de la llamada
La ficha solo trae `telefonoEnmascarado`, así que `CallCenter` toma el número del `IniciarTramite` que envió la propia pestaña (`payload.contacto` de la acción de «Llamada entrante»). Si no hay ANI (p. ej. modo mock sin llamada iniciada en la pestaña), el enlace queda como hoy.

### D2. Parámetro `numero` en `/wa`
`/wa?continuar=<código>&numero=<ANI>`: si `numero` cumple `^\d{10,15}$`, el simulador cambia a ese número y envía `CONTINUAR <código>` una sola vez desde él; después reemplaza la URL por `/wa`. Un `numero` inválido se ignora (se usa el número actual). El ANI se usa tal cual (10 dígitos en el ejemplo): `continuacionPorAni` y el contacto ya comparan los últimos 10 dígitos.

## Risks
El número viaja en la URL del simulador de demo (enlace y QR). Mitigación: solo en el simulador, se retira de la URL al abrir y la aplicación ya declara `Referrer-Policy: no-referrer`.
