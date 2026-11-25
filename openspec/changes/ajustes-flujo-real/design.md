# Design

## Context

Ver `proposal.md` (Why). Estado actual:

- `CallCenter.tsx` arma un botón por oferta de `catalogo` con el texto `Cotizar paquete en {oferta.sede}`. En el guion simulado había una sola oferta.
- `useContextoConsulta` (`cliente/ProveedorCliente.tsx`) consulta `contextoDemo` con `staleTime: Infinity`. Solo se vuelve a pedir si alguien lo invalida.
- `useAccion` invalida `['consulta']` al tener éxito, y `ProveedorCliente` invalida todo al recibir un evento de socket. Pero `/wa` envía por `HistorialWa` (`cliente/historialWa.ts`), que no invalida nada, y la vista `/wa` no se une a ninguna sala.

## Goals / Non-Goals

**Goals:** que el call center distinga cada oferta, y que el contexto de demo no se quede vacío en una pestaña que ya confirmó una cita.

**Non-Goals:** unir `/wa` a salas de tiempo real; cambiar la prioridad del contexto (D4 de `consolas-internas`).

## Decisions

### D1. Texto del botón de cotizar
El texto es `Cotizar {servicio} en {sede} · {precio}`, con `dinero(precioCentavos)` (el formato que ya usa la ficha). Se mantiene el orden del catálogo y la clave `servicioId:sedeId`.
- Alternativa: agrupar por servicio con una lista de sedes. Se descarta porque agrega estructura de UI que el spec no pide, y el texto completo basta para distinguir.

### D2. `contextoDemo` sin caducidad infinita
`staleTime` pasa a `0`, así que cada vista que monta `useContextoConsulta` en modo real vuelve a pedir el contexto. TanStack Query comparte la petición entre los consumidores montados a la vez, y el valor anterior se sigue mostrando mientras llega el nuevo.
- Alternativa: `refetchOnMount: 'always'` conservando `staleTime`. Es equivalente en la práctica; `0` es más simple de razonar.

### D3. Refresco tras las respuestas de WhatsApp
`HistorialWa` acepta un callback opcional `alResponder()`, sin argumentos, que llama después de guardar una respuesta exitosa. Nunca lo llama ante un error ni lleva contenido. `ProveedorCliente` lo conecta a `consultas.invalidateQueries({ queryKey: ['consulta'] })`.
- Alternativa: invalidar desde la vista `/wa`. Se descarta porque el envío por enlace (`continuar`) y el Flow también pasan por el almacén, y conviene un solo punto.

## Risks / Trade-offs

- [Más lecturas por mensaje y por navegación] → Es aceptable para la demo. Son las mismas consultas activas, que TanStack Query no duplica.
- [Un texto de botón largo en 375 px] → Los botones ya ajustan la línea (`styles.css` de `consolas-internas`), y se comprueba en el recorrido.
