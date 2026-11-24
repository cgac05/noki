# Design

## Context

`apps/web` tiene hoy Vite 7, React 19, Tailwind 4 y una página índice (`App.tsx`) que importa `CanalSchema` de `@noki/contracts`. `lint:deps` solo le permite importar `@noki/contracts` (regla f). `@noki/contracts` define comandos, respuesta, siguiente pregunta, mensajes del bot, contrato de WhatsApp, eventos de Socket.IO y cuerpo de error, pero no define consultas de lectura. Todos los IDs de los contratos son UUID v7. La configuración de Vitest de la raíz tiene solo los proyectos `unitarios` e `integracion` en entorno `node`, y `pnpm test` ejecuta solo `unitarios`. Motivación y alcance: ver proposal.md.

## Goals / Non-Goals

**Goals:**
- Que las vistas no sepan si hablan con el simulado o con la API real.
- Que un dato simulado que viole el contrato rompa una prueba, no la demo.
- Que el guion del Flujo A se pueda mostrar de punta a punta desde un celular, saltando entre canales.

**Non-Goals:**
- Reglas de negocio en la web: el guion simulado es una secuencia fija de respuestas, no una máquina de estados.
- Socket.IO real, consultas `GET` reales, modal tipo Flow, escaneo con cámara y autenticación de roles.
- Rediseñar la identidad visual existente: se reutilizan los estilos actuales.

## Decisions

### D1. Enrutamiento y estructura
`react-router` (modo biblioteca, `createBrowserRouter`) con un layout raíz que contiene la barra de demo y un `<Outlet>`. Vite ya hace *fallback* al índice en desarrollo y vista previa, lo que cubre la recarga directa en una ruta. Estructura:

```
apps/web/src/
  main.tsx, rutas.tsx
  cliente/   ClienteApi.ts (interfaz), crearCliente.ts (lee VITE_API), errores.ts,
             provisional.ts (tipos de lectura pendientes de contrato),
             mock/ (guionFlujoA.ts, datosWeb.ts, ClienteMock.ts),
             real/ClienteReal.ts, ProveedorCliente.tsx (contexto + TanStack Query)
  componentes/ Layout, BarraDemo, MensajeBot, EstadoCarga, EstadoError, LineaTiempo
  vistas/    Portada, Web, Wa, App, CallCenter, Clinica, Admin, Bandeja, NoEncontrado
```
- Alternativa: enrutador propio con `history`. Descartada: más código y riesgo para la recarga y el foco.

### D2. Interfaz `ClienteApi`
```ts
interface ClienteApi {
  modo: 'mock' | 'real';
  enviarComando(c: ComandoRequest, o?: { idempotencyKey?: string }): Promise<RespuestaComando>;
  enviarMensajeWa(m: SolicitudMensajeWa): Promise<RespuestaMensajeWa>;
  consultar<K extends keyof ConsultasProvisionales>(k: K, p: ParametrosConsulta[K]): Promise<ConsultasProvisionales[K]>;
  suscribir<N extends NombreEventoSocket>(n: N, f: (d: DatosEventoSocket[N]) => void): () => void;
  demo?: { paso(): PasoGuion; reiniciar(): void; alCambiar(f: () => void): () => void };
}
```
- Las vistas obtienen el cliente con un *hook* (`useCliente`) y llaman a TanStack Query (`useQuery`/`useMutation`); nunca usan `fetch`.
- `demo` solo existe en modo simulado; la barra de demo lo usa si está presente y, si no, muestra solo los enlaces.
- `crearCliente` lee `import.meta.env.VITE_API` (por defecto `mock`); un valor distinto lanza un error de configuración que `main.tsx` muestra en lugar de la aplicación.

### D3. Validación y errores
- Ambos modos pasan cada respuesta por `Schema.parse` del contrato correspondiente y cada comando o mensaje saliente por `ComandoRequestSchema`/`SolicitudMensajeWaSchema`.
- `ErrorCliente` con `tipo: 'CONTRATO' | 'RED' | 'API' | 'CONFIGURACION' | 'NO_DISPONIBLE'`, más `codigo` y `mensaje` cuando vienen de `CuerpoError`. Las vistas muestran `mensaje`; los detalles de Zod no llegan a la interfaz.
- Alternativa: validar solo en pruebas. Descartada: la validación en ejecución es la que protege la integración con la API real.

### D4. Cliente real
- `fetch` a `${VITE_API_URL ?? 'http://localhost:4000'}`. `POST /api/comandos` y `POST /api/canales/wa/mensajes` con `Content-Type: application/json` e `Idempotency-Key`.
- La clave se genera con `crypto.randomUUID()` en la web (fuera del dominio, permitido) al crear el intento y se reutiliza en un reintento automático ante error de red (máximo 1) o si la vista la pasa de nuevo.
- `consultar` intenta las rutas `GET` de `AGENTS.md` §7 que ya existen en el contrato informal (`/api/hilos/:id/linea-tiempo`, `/api/admin/kpis`); las demás devuelven `ErrorCliente('NO_DISPONIBLE')`. `suscribir` en modo real no conecta todavía y devuelve una función vacía; queda documentado como pendiente de `api-comandos`.

### D5. Cliente simulado y guion del Flujo A
- `guionFlujoA.ts` es una lista ordenada de pasos (`INICIO`, `LLAMADA_ENTRANTE`, `COTIZADO`, `CONTINUAR_WA`, `ELEGIR_HORARIO`, `HORARIO_RESERVADO`, `VERIFICACION`, `CONFIRMADA`, `EN_CLINICA`). Cada paso declara la respuesta de comando, los mensajes del bot, los eventos de línea de tiempo y los eventos de tiempo real que produce, con IDs UUID v7 fijos y datos ficticios coherentes con la semilla (Ana, Tepic, Paquete US mamario + Papanicolaou).
- `ClienteMock` mantiene el índice del paso en memoria (un único objeto para toda la aplicación), avanza cuando recibe el comando o mensaje que el paso espera y notifica a los suscriptores. Ante una entrada inesperada responde con el mensaje de ayuda del paso actual. No calcula estados: los copia del guion.
- El paso `VERIFICACION` produce un mensaje `flow` (que la vista muestra como aviso, ver spec) seguido de botones "Confirmar cita", para no bloquear el guion sin el simulador completo.
- `/web` usa un mini guion propio (`datosWeb.ts`) de cotización y código de continuación, independiente del Flujo A.
- Latencia simulada configurable (por defecto 150 ms) para ejercitar los estados de carga.

### D6. Datos provisionales de lectura
`cliente/provisional.ts` define los tipos de lectura que faltan en el contrato: `CatalogoVista` (servicio y sede con nombre y precio en centavos), `CitaVista` (trámite, servicio, sede, inicio ISO, zona horaria, token del QR), `FichaHilo` (nombre de pila, `telefonoEnmascarado`, trámites, línea de tiempo), `LlegadaVista`, `MensajeBandeja` (canal, asunto, cuerpo) y `MetricasVista`. Son tipos y esquemas Zod locales (Zod ya llega como dependencia transitiva vía contratos; se declara explícita en `apps/web` si hace falta), con un comentario de cabecera que los marca como pendientes del cambio compartido `contratos-consultas`.

### D7. Presentación
- Móvil primero con Tailwind y los estilos existentes; ancho máximo de contenido de unos 72 rem en escritorio; botones de al menos 44 px; foco visible ya definido en `styles.css`.
- Fechas formateadas con `Intl.DateTimeFormat` en la `zonaHoraria` que trae el dato; la web no convierte zonas por su cuenta.
- QR en `/app` con `qrcode` (a SVG) a partir del token del dato.
- Barra de demo fija abajo en móvil y arriba en escritorio, con los siete canales, el paso actual y "Reiniciar guion".

### D8. Pruebas
- Proyecto Vitest `web` en `vitest.config.ts` de la raíz con `root: 'apps/web'`, entorno `jsdom` e `include: ['src/**/*.test.{ts,tsx}']`, y script `test` de la raíz: `vitest run --project unitarios --project web`. Es el único cambio en archivos compartidos (requiere a ambos responsables).
- Pruebas: (a) todo el guion y los datos de `/web` cumplen sus esquemas; (b) el cliente real arma la petición correcta y conserva la clave en el reintento, con `fetch` simulado; (c) respuesta real mal formada → error de contrato; (d) cada ruta renderiza con el cliente simulado (Testing Library); (e) recorrido del guion: call center → WhatsApp retoma en el horario → app muestra QR → clínica registra llegada; (f) ninguna vista importa `fetch` ni `socket.io` (prueba que inspecciona los archivos de `vistas/` y `componentes/`).
- Comprobación manual en 375 × 812 y 1280 × 900 sin desplazamiento horizontal ni errores de consola.

## Risks / Trade-offs

- [El contrato de lectura que defina el frente A difiere de los tipos provisionales] → Están aislados en un módulo y se migran en `contratos-consultas`; las vistas solo cambian sus importaciones.
- [El guion simulado se percibe como lógica de negocio] → Es una secuencia de datos fija, sin cálculo; las pruebas (e) solo verifican lo que el guion declara.
- [El ajuste compartido de Vitest choca con un cambio del frente A] → Es un cambio de dos líneas; se integra primero y el otro frente hace rebase.
- [La API real cambia las rutas de lectura] → Las consultas reales no disponibles fallan con `NO_DISPONIBLE` visible, nunca en silencio.
- [Tamaño del paquete] → Solo se agregan `react-router`, `@tanstack/react-query` y `qrcode`; sin bibliotecas de componentes.

## Migration Plan

Rama `feat/esqueleto-canales`. Se integra a `main` con dictamen PASS y la parte compartida autorizada por ambos responsables. Revertir = revertir el merge; la página índice anterior se conserva como portada.

## Open Questions

- Nombre y forma final de las consultas de lectura: se resuelve en `contratos-consultas` con el frente A, sin cambiar este diseño.
