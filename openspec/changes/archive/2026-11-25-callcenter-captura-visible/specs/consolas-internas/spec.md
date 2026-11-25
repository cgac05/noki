## ADDED Requirements

### Requirement: Captura de identificación por el asesor
En `/callcenter`, el formulario «Identificar paciente» SHALL mostrar en claro los campos de texto y `sensitive` mientras el asesor los captura, sin botón «Mostrar/Ocultar»; los campos `passcode` SHALL seguir ocultos. `sexo` SHALL elegirse entre «Mujer» (`F`), «Hombre» (`M`) y «No binario» (`X`), y `entidadNacimiento` entre los nombres de los estados en orden alfabético más «Nací en el extranjero» (`NE`); el comando SHALL enviar la clave del contrato. Una CURP válida SHALL avanzar la identificación con la API real.

#### Scenario: Datos visibles para el asesor
- **WHEN** el asesor abre «Capturar datos» en el paso `DATOS`
- **THEN** nombre y apellidos se ven en claro y no hay botón «Mostrar» ni «Ocultar»

#### Scenario: Entidad por nombre
- **WHEN** el asesor elige «Nayarit» y «Hombre» y envía
- **THEN** el comando `IdentificarPaciente` lleva `entidadNacimiento: "NT"` y `sexo: "M"` y no aparece «Revisa el formato de este campo»

#### Scenario: CURP válida
- **WHEN** con la API real el asesor captura una CURP válida en el paso `CURP`
- **THEN** la identificación avanza al paso siguiente sin error de formato

#### Scenario: WhatsApp sin cambios
- **WHEN** `/wa` muestra un Flow con un campo `sensitive`
- **THEN** sigue oculto con «Mostrar/Ocultar», como antes
