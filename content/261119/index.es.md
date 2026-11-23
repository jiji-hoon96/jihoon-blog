---
emoji: '🛠️'
title: 'Índice de la serie sobre Chrome DevTools'
seoTitle: 'Índice de Chrome DevTools: 32 artículos y preguntas'
date: '2026-11-19'
categories: frontend DevTools
description: 'Explora Network, Elements y Sources de Chrome DevTools desde preguntas de lectores. Índice de 32 artículos, orden de lectura, alcance y métodos.'
keywords: 'Chrome DevTools, serie Chrome DevTools, panel Network, panel Elements, panel Performance, herramientas para desarrolladores del navegador, frontend'
locale: es
translationOf: '261119'
sourceHash: 702bba9ed249e486a86c7ef8f342eb15e8e15bf31740c2ac62f44abae34eb97d
---

Quienes abren el panel Network para examinar el rendimiento de una página pueden usar esta serie para encontrar otros paneles y funciones de DevTools según sus preguntas. Cada artículo plantea una pregunta y trata las funciones que sirven para responderla.

En mi trabajo en la empresa, abro el panel Network todos los días para analizar el rendimiento de las páginas. Cuando usamos las herramientas para desarrolladores del navegador, es fácil acabar recurriendo siempre a las mismas funciones. Por eso escribo esta serie para profundizar, una por una, en Elements, Sources, Console, Network, Performance, Memory, Application, Security, Lighthouse y Recorder. Me baso en la documentación oficial y en materiales especializados, e incluyo capturas de pantallas reales del navegador.

## 32 artículos organizados por preguntas

El índice de esta serie no se divide por nombres de pestañas, sino por las preguntas que llevan a los lectores a abrirlas. Un artículo que enumera funciones termina siendo un catálogo si su última sección no reúne las anteriores en una sola decisión. Cada artículo plantea una pregunta y reúne solo las funciones que ayudan a responderla. Las funciones que no caben en un artículo sobre una pestaña se tratan en el siguiente artículo de esa misma pestaña, a partir de otra pregunta.

Puedes leer cada artículo sin haber leído los anteriores. Si un panel no se puede cubrir con una sola pregunta, lo divido en una serie más pequeña. Comparé la documentación oficial con Chrome en funcionamiento, anoté todos los elementos de cada panel y decidí en qué artículo tratar cada uno. El índice tiene 32 artículos.

### Network

- **¿Qué y cuánto recibe la primera pantalla?**: lista de solicitudes, filtros, columnas, Size, Initiator. [42 MB rastreados con el panel Network](/261120)
- **¿En qué se emplea el tiempo de una solicitud?**: Waterfall, fases de Timing, Priority, Protocol, Connection ID
- **¿Qué circula dentro de una solicitud y una respuesta?**: pestañas de detalles, cookies, preflight, WebSocket, EventStream
- **Cómo acotar la causa cambiando las condiciones**: throttling, Request conditions, Overrides, Copy as, HAR

### Elements

- **¿Dónde está este elemento de la página en el DOM?**: árbol, insignias, búsqueda, edición, Break on
- **¿De dónde viene este estilo?**: Styles, Computed, cascade layer, editores
- **¿Cómo se comprueban el diseño y la accesibilidad?**: Layout, Accessibility, Properties, Event Listeners

### Console

- **¿Cómo filtrar y leer los mensajes de la consola?**: niveles, filtros, configuración, stack traces
- **¿Cómo inspeccionar una página desde la consola?**: Utilities, Live expressions, visualización de objetos

### Sources

- **¿Cómo leer un bundle minificado?**: árbol de archivos, pretty print, mapas de fuentes, ignore list
- **¿Cómo decidir cuándo detenerse?**: 11 tipos de breakpoint
- **¿Qué mirar después de detenerse?**: Scope, Watch, Call Stack, controles de ejecución, Threads
- **¿Cómo conservar el código corregido en DevTools?**: Snippets, Workspace, Overrides, Changes

### Performance

- **¿Qué mirar antes de grabar?**: Local metrics, Field metrics, Environment settings
- **¿Cómo leer las pistas de una grabación?**: descripción general, Main flame chart, Network, Frames, Interactions, Layout shifts
- **¿Cómo acotar la causa de la lentitud?**: Summary, Bottom-up, Call tree, Event log, Insights
- **Cómo medir con más detalle**: Capture settings, Layers, Selector stats, Annotations, API de extensiones

### Memory

- **¿Qué está ocupando memoria?**: 4 vistas de heap snapshot, retainers
- **¿Cuándo aumenta el uso de memoria?**: Allocations on timeline, sampling, Detached elements, Performance monitor

### Application

- **¿Qué guarda Toss en el navegador?**: cookies, storage, IndexedDB, Cache storage, Storage buckets
- **Lo que sigue funcionando aunque se cierre la página**: Service worker, Manifest, Background services
- **Funciones para acelerar el regreso y la página siguiente**: bfcache, Speculative loads, Frames

### Security, Issues

- **¿Dónde se leen las advertencias del navegador?**: Security, Issues

### Lighthouse

- **¿Qué leer además de la puntuación?**: 3 modos, métodos de throttling, resultados

### Recorder

- **Grabar un flujo de usuario y convertirlo en una prueba**: Recorder

### Coverage

- **¿Cuánto del código recibido se ejecutó realmente?**: Coverage

### Rendering

- **Ver qué zonas de la pantalla se vuelven a dibujar y simular media queries**: Rendering

### Layers, Animations

- **Capas de composición y animaciones**: Layers, Animations

### Performance monitor

- **Examinar una página que lleva mucho tiempo abierta con métricas en tiempo real**: Performance monitor

### Device mode, Sensors

- **Simular un entorno móvil y sus limitaciones**: Device mode, Sensors

### Agentes, IA

- **Dar acceso a DevTools a agentes de IA**: DevTools for agents, AI assistance

### Atajos

- **¿Cómo usar DevTools más rápido?**: Command menu, Search, Quick source, atajos de teclado, Settings

## Temas que no cubre la serie

- No cubre los paneles Media, WebAudio, WebAuthn y Autofill, ni CSS overview, que aún está en fase de vista previa
- Memory inspector se trata en un párrafo del artículo sobre Memory, y Developer resources, en un párrafo del primer artículo sobre Sources

Cuando termine esta serie, escribiré aparte un artículo sobre móviles para desarrollo nativo.

## Alcance de la observación y método de medición

El objeto de observación son las páginas públicas de Toss Bank y Toss Securities. Las examino sin iniciar sesión y con un perfil nuevo; no capturo la pantalla de inicio de sesión ni datos de cuentas. No puedo saber por qué los servicios están diseñados así, por lo que no emitiré juicios al respecto. Me centraré en las cifras que muestran los paneles y en cómo se generan.

Las páginas de los servicios reales pueden cambiar con cada despliegue, incluso el mismo día. Por eso indicaré la fecha de medición y la versión de Chrome para cada cifra, y solo usaré cifras y capturas que haya medido seguidas en una misma sesión para cada artículo. En los artículos sobre breakpoints y heap snapshots usaré código local para que los lectores puedan seguir los pasos. Los bundles del servicio están minificados, así que los lectores no podrían reproducir el proceso de detenerse en una línea y ver un valor. Cuando haga falta, también crearé y mediré una pequeña demo que reproduzca la misma estructura.

## Orden de lectura

Primero escribiré los cuatro artículos sobre Network. Saber leer Network facilita examinar la pista Network de Performance y Application. Después escribiré, en este orden, sobre Elements, Console, el primer artículo sobre Sources y Performance. A continuación escribiré los tres artículos restantes sobre Sources que necesitan código local y los dos sobre Memory. Aún no he decidido el orden de los paneles restantes.

Añadiré enlaces a este índice cada vez que publique un artículo. Si quieres saber qué paneles y funciones cubre cada artículo, puedes consultar los apartados de arriba.

:::ref
- [docs] [Chrome for Developers, Chrome DevTools](https://developer.chrome.com/docs/devtools)
:::