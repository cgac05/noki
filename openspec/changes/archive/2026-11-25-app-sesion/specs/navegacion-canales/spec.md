## ADDED Requirements

### Requirement: Identificación en la app de demo
En modo demo, `/app` SHALL pedir teléfono (10 a 15 dígitos) y la contraseña de demostración antes de mostrar citas, con el mismo formulario y validación que `/web`, y SHALL obtener el paciente con la consulta `sesionWebDemo`. Con paciente, SHALL mostrar sus citas (`citasPaciente`) con estado, QR y «Cancelar cita» según los requisitos vigentes; sin paciente vinculado o con 404, SHALL indicar que no hay citas para ese número con enlaces a `/web` y `/wa`. «Salir» SHALL volver a la identificación para consultar otro número. Una contraseña distinta MUST rechazarse sin consultar la API.

#### Scenario: Entrar con un número
- **WHEN** en `/app` se escribe `5210000000001` y `prueba123`
- **THEN** se muestran las citas de Ana con su QR

#### Scenario: Cambiar de número
- **WHEN** después se pulsa «Salir» y se entra con `5210000000002`
- **THEN** se muestran las citas de Beto y ya no las de Ana

#### Scenario: Contraseña incorrecta
- **WHEN** se escribe otra contraseña
- **THEN** se muestra «Contraseña incorrecta.» y no se consulta la API

#### Scenario: Número sin registro
- **WHEN** el número no tiene paciente vinculado
- **THEN** se indica que no hay citas para ese número, con enlaces a `/web` y `/wa`
