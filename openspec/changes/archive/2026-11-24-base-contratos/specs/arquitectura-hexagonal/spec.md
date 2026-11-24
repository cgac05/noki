# Spec Delta

## Purpose

Garantiza que las fronteras de la arquitectura hexagonal y el determinismo del núcleo se verifiquen automáticamente, de modo que ninguna rama pueda integrar código que las rompa sin que un comando lo detecte.

## ADDED Requirements

### Requirement: El dominio no depende de nada externo
El paquete de dominio SHALL carecer de dependencias de ejecución declaradas y SHALL NOT importar módulos de `node_modules`, de la capa de aplicación ni de ningún adaptador o aplicación. `pnpm lint:deps` MUST fallar con código distinto de cero si existe una importación así.

#### Scenario: Importación prohibida en el dominio
- **WHEN** un archivo del dominio importa un paquete externo o un módulo de aplicación o de adaptadores y se ejecuta `pnpm lint:deps`
- **THEN** el comando termina con error y nombra el archivo y la regla violada

#### Scenario: Dominio limpio
- **WHEN** el dominio solo importa módulos propios y se ejecuta `pnpm lint:deps`
- **THEN** el comando no reporta violaciones para el dominio

### Requirement: La aplicación solo depende del dominio
La capa de aplicación SHALL NOT importar adaptadores ni aplicaciones. `pnpm lint:deps` MUST fallar si lo hace.

#### Scenario: Aplicación importa un adaptador
- **WHEN** un archivo de aplicación importa un módulo de `packages/adapters` y se ejecuta `pnpm lint:deps`
- **THEN** el comando termina con error

### Requirement: Los adaptadores no se importan entre sí
Ningún adaptador SHALL importar otro adaptador; solo las aplicaciones (composition root) los combinan. `pnpm lint:deps` MUST fallar si un adaptador importa otro.

#### Scenario: Adaptador importa otro adaptador
- **WHEN** un archivo de un adaptador importa un módulo de un adaptador distinto y se ejecuta `pnpm lint:deps`
- **THEN** el comando termina con error

#### Scenario: La aplicación api combina adaptadores
- **WHEN** `apps/api` importa varios adaptadores y se ejecuta `pnpm lint:deps`
- **THEN** el comando no reporta violaciones por esas importaciones

### Requirement: Contratos de API aislados del núcleo
El paquete de contratos SHALL depender solo de su biblioteca de esquemas. El dominio y la aplicación MUST NOT importarlo, y el frontend MUST NOT importar dominio, aplicación ni adaptadores. `pnpm lint:deps` MUST fallar si ocurre alguna de esas importaciones.

#### Scenario: Dominio importa contratos
- **WHEN** un archivo del dominio o de la aplicación importa el paquete de contratos y se ejecuta `pnpm lint:deps`
- **THEN** el comando termina con error

#### Scenario: Frontend importa el núcleo
- **WHEN** `apps/web` importa el dominio, la aplicación o un adaptador y se ejecuta `pnpm lint:deps`
- **THEN** el comando termina con error

#### Scenario: Consumidores válidos de contratos
- **WHEN** `apps/web` y el adaptador HTTP importan el paquete de contratos y se ejecuta `pnpm lint:deps`
- **THEN** el comando no reporta violaciones por esas importaciones

### Requirement: Sin escapes del sistema de tipos
En todo el repositorio `pnpm lint` MUST fallar ante `any` explícito (incluido `as any`), `@ts-ignore` y `@ts-nocheck`. Solo SHALL admitirse `@ts-expect-error` acompañado de una descripción.

#### Scenario: Escape prohibido
- **WHEN** un archivo contiene `as any`, `// @ts-ignore` o `// @ts-nocheck` y se ejecuta `pnpm lint`
- **THEN** el comando termina con error y señala la línea

#### Scenario: Expect-error sin descripción
- **WHEN** un archivo contiene `// @ts-expect-error` sin texto explicativo y se ejecuta `pnpm lint`
- **THEN** el comando termina con error

#### Scenario: Expect-error descrito
- **WHEN** una prueba de tipos usa `// @ts-expect-error: no admite un cuarto botón`
- **THEN** `pnpm lint` no reporta esa línea

### Requirement: Sin fuentes no deterministas en dominio y aplicación
El código de dominio y de aplicación SHALL NOT usar `Date.now()`, `new Date()` sin argumentos, `Math.random()`, `crypto.randomUUID()` ni `performance.now()`. El tiempo y los identificadores MUST obtenerse de los puertos `Reloj` y `GeneradorId`. `pnpm lint` MUST fallar si aparece alguno de esos usos.

#### Scenario: Uso de reloj del sistema en el dominio
- **WHEN** un archivo del dominio o de la aplicación contiene `new Date()` sin argumentos, `Date.now()` o `performance.now()` y se ejecuta `pnpm lint`
- **THEN** el comando termina con error y señala la línea

#### Scenario: Aleatoriedad prohibida
- **WHEN** un archivo del dominio o de la aplicación contiene `Math.random()` o `crypto.randomUUID()` y se ejecuta `pnpm lint`
- **THEN** el comando termina con error y señala la línea

#### Scenario: Construir una fecha a partir de un valor sí está permitido
- **WHEN** un archivo del dominio contiene `new Date(valorIso)` con un argumento y se ejecuta `pnpm lint`
- **THEN** el comando no reporta esa línea

#### Scenario: Reloj falso controlable
- **WHEN** una prueba crea el reloj en memoria con una fecha fija y lo adelanta una cantidad de minutos
- **THEN** el reloj devuelve exactamente la fecha inicial más ese intervalo, sin depender de la hora real

### Requirement: Identificadores ordenables por tiempo
El generador real de identificadores SHALL producir UUID versión 7. El generador en memoria SHALL producir una secuencia determinista y reproducible para pruebas.

#### Scenario: UUID v7 válido
- **WHEN** el generador real produce dos identificadores consecutivos
- **THEN** ambos tienen el formato UUID con versión 7 y el segundo es mayor o igual al primero en orden lexicográfico

#### Scenario: Secuencia reproducible en pruebas
- **WHEN** dos instancias nuevas del generador en memoria producen tres identificadores cada una
- **THEN** ambas secuencias son idénticas
