# Design

## Context

Ver `proposal.md` (Why). Estado en `main` `71f01f5`:

- **Web**:
  - `Clinica.tsx` lista `llegadasSede` y registra la llegada con `useAccion`. Se une a `sede:<id>` e invalida las lecturas con cualquier evento de su sala.
  - `Admin.tsx` muestra conteos, KPIs y la línea de tiempo, y se une a `admin` y a `hilo:<id>`.
- **Contrato** (`contratos-clinica-alertas`):
  - `CerrarAtencion {}`;
  - `LlegadaVista.posicion?`, solo si la llegada está registrada;
  - `AlertaSeguridad` y la consulta `alertasSeguridad`;
  - además `ComprobarIdentidad`, que no se implementa y que `documentacion-compartida` quitará.
- **Núcleo y API** (`clinica-alertas`):
  - `CerrarAtencion` avanza la fila y emite `sede:fila`;
  - `/api/admin/alertas` devuelve los últimos 50 intentos fallidos, con `bloqueado: true` en el tercero.

La revisión 1 de este cambio ya está implementada sin commit, con «INE verificada» incluido. La revisión 2 lo retira.

## Goals / Non-Goals

**Goals:** pintar la fila, «Cerrar atención» y las alertas solo con lo que entrega el contrato, sin reglas de negocio en la web.

**Non-Goals:** comprobar identidad en clínica (basta el QR firmado); elegir qué cita se puede cerrar (lo decide el núcleo).

## Decisions

### D1. Turno desde la lectura
«Turno N» sale de `posicion` tal cual, y las tarjetas conservan el orden de `llegadasSede`. No se ordena por `posicion` ni se infiere un turno si falta. La actualización en vivo ya existe: el evento `sede:fila` invalida las lecturas.

### D2. (Retirada en la revisión 2)
El diálogo de confirmación de «INE verificada» se elimina junto con el botón. `ConfirmarIne.tsx` y sus pruebas se borran.

### D3. Envíos con `useAccion` por tarjeta
`CerrarAtencion` no lleva datos sensibles, así que usa `useAccion`, con su candado síncrono y la clave reutilizada en el reintento. Cada tarjeta tiene su propia instancia, para que el error de una no bloquee las demás. Se elimina el estado «Identidad comprobada».

### D4. Alertas como sección independiente del tablero
Una consulta `useConsulta('alertasSeguridad', {})` con su propio estado de carga, error y vacío, para que un error no oculte el resto del tablero. La hora se formatea con `Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' })` en la zona del navegador, con el canal mediante los nombres ya usados en `LineaTiempo`. «Bloqueado» es una etiqueta textual, no solo de color.

### D5. Guion simulado
Se agrega un paso al final, de modo que el guion pasa de 13 a 14:

| Paso | Espera | Línea de tiempo |
|---|---|---|
| `ATENDIDA` | `CerrarAtencion` de `recepcion:tepic` | `AtencionCerrada` (canal `clinica`). La cita sale de `llegadasSede` y queda `ATENDIDA` en `citasPaciente`. |

En `EN_CLINICA` la llegada trae `posicion: 1`. Las versiones y los números de evento son consecutivos. `alertasSeguridad` es `[]` en todos los pasos. El paso `INE_VERIFICADA` de la revisión 1 se elimina.

## Risks / Trade-offs

- [`documentacion-compartida` quita `ComprobarIdentidad` del contrato] → La revisión 2 elimina todo uso en la web antes de que eso ocurra, así que no hay ruptura de compilación sin importar el orden de integración.
- [Recorrido real con dos pacientes en la fila] → Requiere dos citas confirmadas en Tepic el mismo día y registrar ambas llegadas. La semilla de demo o dos recorridos de WhatsApp las proveen; se documenta cómo se obtuvieron en `implementacion.md`.
