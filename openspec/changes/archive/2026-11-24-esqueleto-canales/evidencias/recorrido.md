# Recorrido visual — esqueleto-canales

Fecha: 2026-11-24. Revisión: `feat/esqueleto-canales` sobre `c9ba23fb5bbad5cfbe9aa10d2be23652163dcd76`, diff sin commit; archivos de producto identificados en `revision-sha256.txt`. Se usó el navegador integrado mediante CUA, sin agentes adicionales. Los nombres, códigos y datos de las capturas son ficticios.

## Comprobaciones realizadas

| Comprobación | Pasos y resultado observado |
|---|---|
| Flujo A en 375 × 812 | Call Center: Llamada entrante → Cotizar paquete en Tepic → Continuar por WhatsApp. WhatsApp retomó en horario; Ver horarios → Jueves 26 · 09:15 → Revisar cita → aviso Flow sin campos → Confirmar cita. App mostró la cita y el QR. Clínica registró la llegada y mostró `EN_CLINICA`, paso 9 de 9. PASS. |
| Flujo A en 1280 × 900 | Se reinició el guion y se repitió el mismo recorrido completo. App mostró `CONFIRMADA`, 09:15 en Tepic y QR; Clínica registró la llegada. PASS. |
| Siete rutas en ambos tamaños | Todas las rutas se recorrieron con la barra. En cada medición `scrollWidth` fue igual a `clientWidth`. Ningún botón ni enlace de la barra quedó por debajo de 44 × 44 px. La anchura útil puede descontar 15 px de barra vertical. Véase `mediciones.json`, 14 mediciones. PASS. |
| Teclado | Desde la marca se avanzó con Tab por los siete canales, Reiniciar guion y Abrir WhatsApp. Los nueve controles reportaron `:focus-visible` y contorno sólido visible. Se comprobó también el foco en móvil. Valores exactos en `mediciones.json`. PASS. |
| Línea de tiempo | Admin mostró los eventos en orden, los cambios de canal y PacienteLlego al final; Call Center volvió a mostrar la ficha de solo lectura después de la continuación. PASS. |
| Cotización independiente y bandeja | Web mostró precio y código después de cotizar; el paso de la demo permaneció en clínica. Bandeja mostró SMS y correo ficticios. PASS. |
| Enlace directo | Se recargó `/wa`: la URL permaneció en `/wa` y la vista abrió directamente. El guion volvió al inicio porque vive en memoria, tal como documenta el README. PASS. |
| Consola mock | Las consultas de errores antes y después de los recorridos devolvieron `[]`; no se observaron errores de aplicación. PASS. |
| Modo real sin API | Servidor web en 5176, `VITE_API=real`, `VITE_API_URL=http://127.0.0.1:45999` (sin servicio). Admin mostró «No pudimos conectar con la API. Comprueba que esté encendida e intenta de nuevo.» y Reintentar. No hubo botón Reiniciar guion. La ficha sin consulta implementada mostró NO_DISPONIBLE. PASS. |

## Ejecución y capturas

- Mock: `$env:VITE_API='mock'; pnpm --filter @noki/web dev --host 127.0.0.1 --port 5175`.
- Real: `$env:VITE_API='real'; $env:VITE_API_URL='http://127.0.0.1:45999'; pnpm --filter @noki/web dev --host 127.0.0.1 --port 5176`.
- Se ejecutó el script Vite del paquete en puertos alternativos para no detener procesos existentes; `pnpm dev` raíz incluye el mismo script web, además de API y sd-mock, que este guion mock no requiere. El servidor fuera del sandbox resolvió el acceso local que había fallado en la sesión anterior.
- `movil-app-qr-visible.jpg`: captura de ventana tras desplazar la cita, con el QR íntegro visible y la barra de demo.
- `escritorio-app.jpg`: cita confirmada y QR a 1280 × 900.
- `real-sin-api.jpg`: mensaje público de conexión y consulta aún no disponible.
- Se descartaron las primeras capturas de página completa porque la composición del navegador recortaba el borde derecho e introducía artefactos de elementos fijos. No se usan como evidencia; se conservaron capturas de ventana inspeccionadas visualmente.
- `real-sin-api.json` conserva el resultado y los errores de transporte esperados de esta prueba negativa. Estos errores son intencionales y no forman parte de la comprobación de consola del modo mock.

Se restableció el tamaño normal del navegador al terminar. No se probaron el backend real, autenticación, firma/consumo de tokens, escaneo de cámara ni Socket.IO real, fuera del alcance de este cambio.
