# Diseño: callcenter-captura-visible

- **D1. Modo asesor en `ModalFlow`.** Prop opcional (p. ej. `capturaAsesor`) que muestra en claro `texto` y `sensitive`, quita «Mostrar/Ocultar» y cambia la ayuda («En el chat solo aparecerá un resumen enmascarado» no aplica). Sin la prop, `/wa` se comporta igual que hoy.
- **D2. Selectores.** Para los campos con id `sexo` y `entidadNacimiento`, `ModalFlow` en modo asesor renderiza `<select>` accesible con etiqueta. El catálogo de nombres vive en `apps/web` como `Record<typeof ENTIDADES_NACIMIENTO[number], string>`, para que TypeScript exija las 33 claves del contrato. El valor enviado es la clave.
- **D3. CURP.** Reproducir con la API real (`/callcenter`, Llamada entrante, paso CURP) y una CURP válida del seed o de las fixtures (`apps/web/src/pruebas/pistasIdentificacion.json`, `apps/sd-mock`). Revisar mayúsculas, espacios, `captura` del campo y la respuesta del servidor. Corregir solo en `apps/web` salvo autorización.
