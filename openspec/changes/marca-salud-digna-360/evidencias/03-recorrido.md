# Recorrido visual — Salud Digna 360

Fecha: 2026-11-25. Revisión: archivos y hashes del manifiesto `04-archivos-entregados.json`, sobre `0b59599722ae1999ba24f61d7399b8a007b92bac`. Chrome instalado, mediante Playwright 1.56.1 temporal, sin agregarlo a las dependencias del proyecto.

## Entorno y reproducción

Los servidores existentes en la máquina usan **mock en localhost:5174** y **real en localhost:5173**, con API en localhost:4000, `VITE_DEMO=true` y Postgres/Redis disponibles (`GET /ready` devolvió estado `ok`). Se confirmó el valor de `import.meta.env.VITE_API` servido por cada Vite; no se presupuso el modo por el puerto. No se reinició la base ni se enviaron comandos de negocio a la API real.

```powershell
# Instalación aislada, fuera del repositorio, realizada para este control:
$nokiBrowserTools = Join-Path $env:TEMP 'noki-marca-browser'
npm install --prefix $nokiBrowserTools --no-save --package-lock=false playwright@1.56.1
$env:NOKI_BROWSER_TOOLS = $nokiBrowserTools
node openspec/changes/marca-salud-digna-360/evidencias/recorrido.mjs
```

El script usa el Chrome de `C:/Program Files/Google/Chrome/Application/chrome.exe`. Los puertos pueden ajustarse en el script para reproducirlo en otra máquina. El resultado final está en `03-ejecucion.txt` y el detalle comprobable en `03-resultados.json`.

## Resultado

**PASS: 32 vistas**, ocho rutas × dos tamaños (375 × 812 y 1280 × 900) × dos modos. En todas:

- `documentElement.scrollWidth` es igual al ancho de la ventana; no hay desplazamiento horizontal de página. La navegación móvil conserva su desplazamiento interno.
- El encabezado enlaza a `/` con «Salud Digna 360»; el título incluye el nombre y no hay texto visible «noki».
- La marca usa Open Sans 700 a 32 px y la fuente está cargada. «Modo simulado» aparece exclusivamente en mock.
- No hay errores JavaScript sin manejar. Las peticiones HTTP y WebSocket se limitan al origen de la web y a localhost:4000; las fuentes se cargan desde la web.

Se revisaron visualmente capturas representativas de portada, WhatsApp, Call Center, App, administración y error, además de los controles automáticos en las 32 vistas. Los colores de texto, controles y superficies se verifican con la prueba WCAG de `identidadVisual.test.ts`. Los estados mantienen sus textos y controles existentes.

| Ruta | Mock 375 | Mock 1280 | Real 375 | Real 1280 |
|---|---|---|---|---|
| `/` | [captura](03-mock-375-portada.png) | [captura](03-mock-1280-portada.png) | [captura](03-real-375-portada.png) | [captura](03-real-1280-portada.png) |
| `/web` | [captura](03-mock-375-web.png) | [captura](03-mock-1280-web.png) | [captura](03-real-375-web.png) | [captura](03-real-1280-web.png) |
| `/wa` | [captura](03-mock-375-wa.png) | [captura](03-mock-1280-wa.png) | [captura](03-real-375-wa.png) | [captura](03-real-1280-wa.png) |
| `/app` | [captura](03-mock-375-app.png) | [captura](03-mock-1280-app.png) | [captura](03-real-375-app.png) | [captura](03-real-1280-app.png) |
| `/callcenter` | [captura](03-mock-375-callcenter.png) | [captura](03-mock-1280-callcenter.png) | [captura](03-real-375-callcenter.png) | [captura](03-real-1280-callcenter.png) |
| `/clinica` | [captura](03-mock-375-clinica.png) | [captura](03-mock-1280-clinica.png) | [captura](03-real-375-clinica.png) | [captura](03-real-1280-clinica.png) |
| `/admin` | [captura](03-mock-375-admin.png) | [captura](03-mock-1280-admin.png) | [captura](03-real-375-admin.png) | [captura](03-real-1280-admin.png) |
| `/bandeja` | [captura](03-mock-375-bandeja.png) | [captura](03-mock-1280-bandeja.png) | [captura](03-real-375-bandeja.png) | [captura](03-real-1280-bandeja.png) |

## Interacciones y estados

- **Flujo A, ambos tamaños:** llamada entrante → cotización → consentimiento → continuación → WhatsApp → Ver horarios → Ver opciones → Jueves 26 · 09:15 → Revisar cita. La lista modal y los botones son pulsables. [375](03-flujoA-375.png), [1280](03-flujoA-1280.png).
- **Flujo C, ambos tamaños:** elegir guion C → App → Cancelar cita → Confirmar cancelación. Aparece «La cancelación espera aprobación en WhatsApp», sin presentarla como error. [375](03-flujoC-375.png), [1280](03-flujoC-1280.png).
- **Deshabilitado, validación y foco:** capturar `12345` en ANI impide enviar; el botón cambia de azul a gris, el error conserva el tono café y el campo muestra el foco azul. El script compara también los fondos activo/deshabilitado. [375](03-deshabilitado-375.png), [1280](03-deshabilitado-1280.png).
- **Error de red:** abortar únicamente desde el navegador las llamadas `/api/**` de administración muestra el error comprensible con «Reintentar», conservando el encabezado y la navegación. No se apagó ni modificó la API. [375](03-error-375.png), [1280](03-error-1280.png).

Las capturas son de página completa: la barra fija puede aparecer superpuesta en el punto de desplazamiento de la interacción. En móvil la marca usa dos líneas con la insignia; conserva los 32 px y no desborda. Se preservó la disposición aprobada.

El detector Impeccable produjo una recomendación genérica sobre la popularidad de Open Sans (`03-impeccable.json`). No se aplicó: D2 fija explícitamente esa tipografía. No representa un fallo funcional ni de contraste.
