# Spec Delta

## ADDED Requirements

### Requirement: Cotización desde el catálogo
Mientras el trámite activo no tenga cotización, `/callcenter` SHALL ofrecer un botón de cotizar por cada oferta del catálogo. El texto de cada botón SHALL incluir el servicio, la sede y el precio de esa oferta tal como los devuelve la lectura `catalogo`. Dos ofertas distintas MUST NOT mostrarse con el mismo texto. La vista MUST NOT agrupar, filtrar, ordenar ni ocultar ofertas por su cuenta.

#### Scenario: Catálogo con varios servicios por sede
- **WHEN** el catálogo trae 4 servicios en 3 sedes
- **THEN** hay 12 botones, cada uno con un texto distinto que nombra su servicio, su sede y su precio

#### Scenario: Cotizar la oferta elegida
- **WHEN** el asesor pulsa el botón del «Paquete US mamario + Papanicolaou» en «Clínica Tepic»
- **THEN** se envían `SeleccionarServicio` y `SeleccionarSede` con los identificadores de esa oferta
