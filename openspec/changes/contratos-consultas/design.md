# Design

## Context

`apps/web/src/cliente/provisional.ts` define hoy `CatalogoVista`, `CitaVista`, `FichaHilo`, `LlegadaVista`, `MensajeBandeja`, `MetricasVista`, `ConversacionVista`, `WebVista`, `AccionVista` y `PasoGuion`, más `ESQUEMAS_CONSULTAS`. Las vistas usan `useConsulta` con `ficha`, `conversacion`, `citas`, `llegadas`, `bandeja`, `metricas`, `lineaTiempo` y `web`. `ClienteReal.consultar` solo conoce `lineaTiempo` y `metricas`. `@noki/contracts` depende solo de `zod`, y la regla de coherencia del vocabulario vive en `in-http`. `nucleo-tramite` ya está en `main`, y su `siguientePregunta` y sus vistas de trámite usan `TramiteVistaSchema`. Motivación: ver proposal.md.

## Goals / Non-Goals

**Goals:**
- Una sola definición de cada lectura, usada por el núcleo al responder y por la web al validar.
- Que el cliente real pueda consultar todas las rutas sin escribirlas a mano.
- Mantener el Flujo A simulado funcionando igual después de la migración.

**Non-Goals:**
- Implementar las rutas `GET` en `apps/api`.
- Autenticación de las consultas, paginación, embudo y huecos.
- Historial de la conversación de WhatsApp (queda en el módulo de demo hasta `simulador-wa`).

## Decisions

### D1. Módulo `consultas.ts` en `@noki/contracts`
Esquemas con `z.object(...).strict()` solo donde descartar campos desconocidos importa para la privacidad. En los demás, el objeto por defecto de Zod ya descarta las claves desconocidas al parsear (así se cumple "Ficha sin acciones"):
- `OfertaCatalogoSchema { servicioId, servicio, sedeId, sede, precioCentavos }`. Reemplaza a `CatalogoVista`.
- `CitaVistaSchema { tramite: TramiteVista, servicio, sede, inicio (ISO), zonaHoraria (IANA, validada con Intl), tokenQr }`.
- `FichaHiloSchema { hiloId, nombrePila, telefonoEnmascarado (/^•••• \d{4}$/), tramites: TramiteVista[], lineaTiempo: EventoVista[], soloLectura, oferta: OfertaCatalogo | null, codigoContinuacion: string | null }`. Se agrega `hiloId` y se quita `acciones`; `catalogo` pasa a llamarse `oferta`.
- `LlegadaVistaSchema { cita: CitaVista, registrada }`. Se quita `accion`.
- `MensajeBandejaSchema` y `MetricasVistaSchema` sin cambios de forma.
- Alternativa: incluir acciones disponibles calculadas por el núcleo (*hypermedia*). Descartada para no cargar al frente A con un cálculo extra antes de la integración; `siguientePregunta` ya guía la conversación.

### D2. Tabla `RUTAS_CONSULTAS`
```ts
RUTAS_CONSULTAS = {
  tramite:          { ruta: '/api/tramites/:tramiteId',                   parametros: {tramiteId}, respuesta: TramiteVistaSchema },
  lineaTiempo:      { ruta: '/api/hilos/:hiloId/linea-tiempo',            parametros: {hiloId},    respuesta: z.array(EventoVistaSchema) },
  tramitesAbiertos: { ruta: '/api/pacientes/:pacienteId/tramites-abiertos', parametros: {pacienteId}, respuesta: z.array(TramiteVistaSchema) },
  catalogo:         { ruta: '/api/catalogo',                               parametros: {},          respuesta: z.array(OfertaCatalogoSchema) },
  fichaHilo:        { ruta: '/api/hilos/:hiloId/ficha',                    parametros: {hiloId},    respuesta: FichaHiloSchema },
  citasPaciente:    { ruta: '/api/pacientes/:pacienteId/citas',            parametros: {pacienteId}, respuesta: z.array(CitaVistaSchema) },
  llegadasSede:     { ruta: '/api/sedes/:sedeId/llegadas',                 parametros: {sedeId},    respuesta: z.array(LlegadaVistaSchema) },
  metricas:         { ruta: '/api/admin/kpis',                             parametros: {},          respuesta: MetricasVistaSchema },
  bandeja:          { ruta: '/api/demo/bandeja',                           parametros: {},          respuesta: z.array(MensajeBandejaSchema), soloDemo: true },
} satisfies Record<string, DefinicionConsulta>
```
- Todos los parámetros de ruta son UUID v7 (`z.uuidv7()`).
- Una función pura `rutaConsulta(nombre, parametros)` valida los parámetros y sustituye las plantillas; un parámetro inválido lanza el error de Zod y no produce ninguna ruta. Los tipos `NombreConsulta`, `ParametrosConsulta<N>` y `RespuestaConsulta<N>` se derivan de la tabla.
- El método siempre es `GET`, así que no se declara por entrada.

### D3. Migración de `apps/web`
- `provisional.ts` → `demo.ts`, que conserva solo `PasoGuion`, `ConversacionVista`, `WebVista` (sin acciones) y los esquemas del paso web. Las consultas del cliente se tipan con `NombreConsulta` del contrato, más `conversacion` y `web` como consultas solo de demo.
- `ClienteApi.consultar` acepta los nombres del contrato con sus parámetros. El mock devuelve los datos del guion validados con `RUTAS_CONSULTAS[n].respuesta`; el real usa `rutaConsulta` y valida con el mismo esquema. `bandeja` en modo real devuelve `NO_DISPONIBLE` salvo con `VITE_DEMO=true`; `conversacion` y `web` en modo real devuelven `NO_DISPONIBLE`.
- Las vistas obtienen los parámetros (`hiloId`, `pacienteId`, `sedeId`) de los datos que ya tienen: la última respuesta de comando o, en modo demo, las constantes del guion expuestas por `cliente.demo`. No calculan nada.
- Las acciones prearmadas pasan a armarse en la vista. En `CallCenter`: "Llamada entrante" → `IniciarTramite`; elegir la oferta → `SeleccionarServicio` y luego `SeleccionarSede` con los IDs de la oferta; "Continuar por WhatsApp" sigue siendo un mensaje de demo del guion. En `Clinica`: `RegistrarLlegada` con `cita.tokenQr`. En `Web`: los comandos de cotización a partir de la oferta. El mock compara el comando recibido con el que espera el paso, igual que ahora.

### D4. Documentación y registro
`docs/contratos.md` con la sección `consultas.ts` y la tabla de rutas; `AGENTS.md` §7 "Consultas" reemplazado por una referencia a `RUTAS_CONSULTAS` con la lista de rutas; `docs/trabajo-paralelo.md` con `cgac05` para Christian Avila.

### D5. Pruebas
- `tests/unit/consultas.test.ts`: escenarios de `contratos-consultas` (cita válida, zona inválida, centavos, ficha sin acciones, teléfono completo rechazado, claves sensibles, rutas construidas, parámetro inválido, rutas conservadas de §7, bandeja solo demo).
- Pruebas existentes de la web actualizadas: datos simulados contra el contrato, lectura real mal formada, ruta de la tabla en el cliente real, bandeja fuera de demo y comandos armados en `Clinica` y `CallCenter`. El recorrido del Flujo A de `vistas.test.tsx` debe seguir pasando sin cambios en lo que verifica.

## Risks / Trade-offs

- [El núcleo necesitará un campo más (p. ej., hora local preformateada)] → Se agrega como campo opcional en un cambio compartido posterior; la web lo tolera.
- [Armar comandos en la vista se percibe como lógica de negocio] → Solo copia IDs del dato elegido a un comando validado por el contrato; las reglas siguen en el núcleo, que responde con `ReglaViolada` si algo no aplica.
- [El cambio toca a la vez archivos compartidos y del frente B] → Integra con la autorización de ambos frentes; el frente A no tiene código que adaptar ahora.
- [Rebase con trabajo en curso del frente A] → Toca solo archivos nuevos de `contracts` más `index.ts`; si chocan en `index.ts`, la resolución es trivial (dos líneas de exportación).

## Migration Plan

Rama `feat/contratos-consultas` desde `main` `7789d32`. Integrar con dictamen PASS y la autorización de ambos frentes. Después, avisar al frente A de que `api-comandos` responde con `RUTAS_CONSULTAS`.
