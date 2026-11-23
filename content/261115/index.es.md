---
emoji: '🧭'
title: 'Dos años usando Biome: experiencia y resultados'
seoTitle: 'Dos años usando Biome y ESLint'
date: '2026-11-15'
categories: frontend JavaScript
description: 'Tras casi dos años con Biome, medí configuración y velocidad: fallos de ESLint, coste de reglas con tipos y cambios al migrar a Biome 2, con código.'
keywords: 'Biome, ESLint, Prettier, Biome 2, migración, frontend, análisis estático'
locale: es
translationOf: '261115'
sourceHash: feec0e755ce7548b6041920f4a0c6c5c69e93f2b62859ef17347e02523e41d8a
---

Para desarrolladores que usan ESLint y Prettier y están pensando en pasarse a Biome o actualizar de Biome 1 a 2, resumo las mediciones obtenidas con mi código y los resultados de la migración. Introduje Biome 1.9.4 en dos servicios frontend de mi empresa en noviembre de 2024 y enero de 2025. [¿Puede Biome sustituir a ESLint y Prettier?](/241201) es el artículo introductorio que escribí justo después de adoptarlo.

Empiezo por la conclusión: en los dos servicios, Biome reunió la configuración en un solo lugar y el análisis completo tardaba alrededor de 0,2 segundos, incluso después de que el número de archivos casi se duplicara. Durante el proceso perdí algunas comprobaciones de ESLint, y al actualizar a Biome 2 se produjo un diff grande que incluía la ordenación de imports. A partir de lo que comprobé, distinguiré las tareas que Biome puede asumir y las que no.

## Unificación de la configuración y velocidad de análisis

Antes de la migración, la configuración no se gestionaba en un solo lugar. La configuración de ESLint estaba tanto en `.eslintrc.js` como en `package.json` con `eslintConfig`, pero ESLint 8 solo leía un archivo de configuración de la misma carpeta. La configuración de `package.json` incluía la extensión de airbnb, pero airbnb ni siquiera estaba instalado. Las reglas que no se aplicaban estaban descritas como si sí lo hicieran.

Las opciones de Prettier también estaban repartidas entre `.prettierrc` y la regla `prettier/prettier` de ESLint, y la ordenación de imports tenía su propia configuración en ESLint. Biome permite definir lint, formato y ordenación de imports en un único `biome.json`. Las dependencias de desarrollo relacionadas con lint y formato se redujeron en los dos servicios, respectivamente, de 12 a 1 y de 10 a 1. Al haber una sola fuente que decide cómo se aplican las reglas, también disminuyó la posibilidad de que las reglas descritas difirieran de las que se aplicaban realmente.

Comparé la velocidad analizando, sin caché, los 751 archivos de `src` del código justo antes de la adopción, en un Apple M2 Max de 12 núcleos. La pila de ESLint 8.57 tardó entre 10,34 y 10,93 segundos; `check` de Biome 1.9.4 tardó entre 0,21 y 0,22 segundos e incluía lint, formato y ordenación de imports. Hice cinco mediciones de cada uno. Sin embargo, los conjuntos de reglas analizados no eran iguales.

Al desactivar la regla `prettier/prettier` en ESLint, el tiempo bajó a entre 5,31 y 5,35 segundos, aproximadamente la mitad. Ejecutar Prettier como regla de lint y volver a analizar cada archivo representaba la mitad del tiempo. Una vez llena la caché de `--cache` de ESLint, tardó entre 0,85 y 0,91 segundos. Al limitar Biome a un solo hilo, tardó 1,26 segundos.

A partir de estos resultados, inferí, desglosando los 0,22 segundos, que el procesamiento paralelo representaba aproximadamente un factor de 6 y que el resto —el binario nativo y la estructura en la que lint y formato comparten el árbol analizado una sola vez— representaba aproximadamente un factor de 8. No son resultados obtenidos controlando y midiendo cada elemento por separado, sino inferencias basadas en las mediciones anteriores.

A noviembre de 2026, el mismo servicio ya tenía 1.457 archivos en `src`. El tiempo que `check` de Biome 1.9.4 reportó por sí mismo fue de 220 a 275 ms, y el de Biome 2.6.8, de 215 a 236 ms. Hice tres mediciones de cada uno. Aunque el número de archivos casi se había duplicado, el tiempo de análisis reportado se mantuvo prácticamente igual. Para mí, poder ejecutar el análisis completo sin gestionar una caché aparte fue una ventaja práctica.

## Análisis sintáctico y estructura de ejecución de Biome

El analizador sintáctico de Biome está diseñado para recuperarse incluso cuando hay errores de sintaxis. Según la documentación oficial de arquitectura, el resultado del análisis es un CST (concrete syntax tree) y se implementa el patrón de árbol green/red mediante una bifurcación interna de la biblioteca rowan. El CST conserva incluso los comentarios y espacios en blanco.

La sintaxis incorrecta se marca con nodos Bogus. Así se evita que las reglas y el formateador traten esa parte como si fuera sintaxis válida. La documentación oficial explica que el analizador de Biome es deliberadamente más estricto que el de Prettier, y que el formateador muestra los nodos Bogus tal cual, sin corregirlos. La configuración de mi equipo tiene `formatWithErrors: true`, por lo que también da formato a los archivos con errores de sintaxis.

Biome también tiene una estructura de servidor y cliente. Un daemon en segundo plano procesa las solicitudes del editor y de la CLI, y la extensión del editor transmite mensajes LSP al daemon mediante `biome lsp-proxy`. La documentación oficial también presenta el comando `biome inspect`, que permite examinar la representación intermedia (IR) del formateador. Este comando está disponible desde la versión 2.6.

scanner no se ejecuta siempre de forma predeterminada; es opt-in. Al activar las reglas de dominio project o las reglas con información de tipos, scanner busca archivos `biome.json` anidados y `.gitignore`, e indexa `package.json` y los archivos fuente. La FAQ oficial indica que, para unos 2.000 archivos, el análisis tarda unos 800 ms sin scanner y unos 2 segundos con scanner. Considero que las mediciones de `check` predeterminadas y las mediciones con reglas de información de tipos no miden el mismo alcance de ejecución.

## Alcance de las reglas y las correcciones

Las reglas de lint de Biome se dividen en ocho grupos: Accessibility, Complexity, Correctness, Nursery, Performance, Security, Style y Suspicious. Desde v2, todas las reglas tienen un nivel de severidad predeterminado, y el grupo Style genera advertencias de forma predeterminada. A diferencia de las reglas estables, las reglas Nursery deben activarse directamente en la configuración.

Las reglas no se limitan a emitir diagnósticos; algunas también corrigen el código. Las correcciones safe garantizan que no cambian el significado del código y se aplican con `--write`. Las correcciones unsafe pueden cambiarlo, por lo que requieren `--write --unsafe`. La corrección de `noFloatingPromises` es unsafe.

Los comentarios de supresión de Biome incluyen el motivo como parte de su sintaxis. Por ejemplo, se usa el formato `// biome-ignore lint/<그룹>/<규칙>: <이유>`. Para suprimir un archivo entero se usa `biome-ignore-all` al principio del archivo; para suprimir un rango concreto, `biome-ignore-start` y `biome-ignore-end`. Los comentarios de supresión que no se usan se señalan con el diagnóstico `suppression/unused`.

En mi código siguen pendientes 326 advertencias de la regla recommended `useExhaustiveDependencies`, que comprueba las matrices de dependencias de los hooks de React. El equipo las mantiene como advertencias, no como errores.

## Información de tipos y reglas project

Biome no es un verificador de tipos. Según la documentación oficial, su alcance es permitir el uso de reglas de lint basadas en información de tipos sin el paquete `typescript`. En mis dos servicios, `tsc`, dentro del comando de compilación, sigue encargándose de comprobar los tipos en CI.

Las reglas de Biome 1 solo examinaban la sintaxis de un archivo, por lo que no podían hacer comprobaciones que requirieran saber si la función llamada devolvía una Promise. Biome 2 introdujo reglas de lint con información de tipos que no dependen del compilador de TypeScript. Se indicó que la primera regla, `noFloatingPromises`, detectó en pruebas preliminares alrededor del 75 % de los casos que detecta typescript-eslint. En v2.1 se dijo que se había corregido la inferencia de tipos y que la proporción había subido a alrededor del 85 %, además de añadir siete reglas, incluida `noMisusedPromises`.

Al activar `noFloatingPromises` en mi código actual con la versión 2.6.8, obtuve 22 casos. Uno de ellos llamaba una función de confirmación que devolvía una Promise sin usar `await` y cerraba la ventana inmediatamente después. Esta regla sigue perteneciendo al grupo Nursery en la versión 2.6.8. La documentación oficial describe Nursery como experimental y señala que su comportamiento puede cambiar en cualquier momento. Su severidad predeterminada es info, y al activarla se ejecutan scanner, que examina los archivos del proyecto, y el motor de inferencia de tipos, por lo que aumenta el tiempo de análisis.

Las reglas de dominio project activan automáticamente conjuntos de reglas según las dependencias de `package.json`. Por ejemplo, activan reglas relacionadas con React 16 o posterior, Next 14 o posterior y herramientas de pruebas como Vitest. Hice una medición directa con la versión 2.6.8 en un Apple M2 Max, con 1.438 archivos `src` del código actual. Con la configuración actual, ejecutar solo lint tardó entre 122 y 160 ms; al activar únicamente `noFloatingPromises`, que usa inferencia de tipos, tardó entre 225 y 262 ms.

`noImportCycles` es una regla del grupo Suspicious cuya severidad predeterminada es advertencia. La documentación oficial explica que tiene un coste de cálculo elevado. Al activar esta regla en mi código, la ejecución tardó entre 253 y 264 ms y generó 88 advertencias.

`noUnresolvedImports` es una regla del grupo Correctness que comprueba si los nombres importados se exportan realmente, y su severidad predeterminada es error. No comprueba `import()` dinámico ni `require()`. Con `node_modules` real enlazado, la ejecución tardó entre 243 y 253 ms y produjo 553 errores. Este código supera la compilación y las pruebas, pero ninguno de esos 553 casos era un error real.

De ellos, 499 eran nombres importados desde Vitest, como `describe`, `it`, `expect` y `vi`; 28 eran `Fragment` y `Suspense` de React; y 25 eran imports de Vite con los sufijos `?url` y `?worker`. El caso restante correspondía a un paquete. El archivo de entrada del paquete React exporta mediante `module.exports` de CommonJS. Que Biome no haya podido encontrar estáticamente esas exportaciones es una inferencia mía.

Al ejecutar la misma regla sin enlazar `node_modules`, se obtuvieron 4.136 casos en unos 700 ms. A partir de este resultado, concluí que en mi código actual es difícil recuperar mediante las reglas de dominio project la comprobación `import/no-unresolved` de la época de ESLint. Esta conclusión se limita a los resultados obtenidos con mi código.

Comprobé el tiempo de cada regla con `--profile-rules`, disponible desde v2.4. El método suma el tiempo de ejecución de las reglas de cada hilo, excluyendo el tiempo de preprocesamiento. En mis mediciones, `useExhaustiveDependencies` fue la regla más lenta, con 54,6 ms y 24.086 ejecuciones. Le siguieron `noFallthroughSwitchClause`, con 13,0 ms; `noUnusedVariables`, con 9,3 ms; y `useImportType`, con 8,7 ms. El `check` completo tardó entre 215 y 236 ms, e incluía formato y ordenación de imports. Que la diferencia con los 122 a 160 ms de ejecutar solo lint se deba al formato y a assist es una inferencia mía. También intenté medir oxlint con el mismo código, pero esta vez no pude hacerlo, así que no lo incluyo en la comparación de velocidad.

## Funcionalidad añadida en dos años

La versión 1.9.4 que adopté se publicó en npm el 17 de octubre de 2024. v2.0.0 salió el 17 de junio de 2025 y v2.6.8, el 15 de noviembre de 2026. Durante ese tiempo, Biome amplió su cobertura y sus herramientas de ejecución, además de añadir lint con información de tipos.

v2 añadió plugins GritQL y compatibilidad con monorepos que contienen varios archivos de configuración.

v2.3 añadió compatibilidad experimental con Vue, Svelte y Astro, una nueva sintaxis de exclusión con `!` y el análisis sintáctico de directivas Tailwind v4. v2.4 analiza CSS y fragmentos GraphQL dentro de JavaScript y añadió 15 reglas de accesibilidad para HTML. Esta versión también incorporó `--profile-rules`, que mide el tiempo de cada regla.

En v2.5 las reglas de lint superaron las 500 y se añadió el modo `--watch`. Los plugins GritQL también pasaron a poder proponer cambios en el código. v2.6 añadió compatibilidad con Markdown, SCSS y YAML, y presentó los plugins JavaScript como developer preview.

No se puede trasladar tal cual el ecosistema de plugins de ESLint. Los plugins GritQL no pueden acceder al semantic model que usan las reglas Rust de Biome. Los plugins JavaScript están en developer preview y pueden cambiar incluso en versiones de parche. Por tanto, no hay motivos para concluir que se puedan importar tal cual los plugins existentes de ESLint.

Según la página oficial a fecha de 15 de noviembre de 2026, Biome es un 97 % compatible con Prettier y tiene 816 reglas de lint. La documentación oficial no indica cómo se calculó el 97 %.

También aumentaron las descargas de Biome. Al comparar las descargas semanales de npm entre el 11 y el 17 de noviembre de 2024 y el 9 y el 15 de noviembre de 2026, Biome pasó de 1,24 millones a 27,39 millones. En el mismo periodo, ESLint pasó de 48,06 millones a 207,05 millones, Prettier de 43,79 millones a 184,72 millones, y oxlint de 90.000 a 4,828 millones.

También hay casos concretos en los que el formato difiere del de Prettier. Al quitar las comillas de las propiedades de objetos y clases, Prettier solo lo hace con identificadores ES5, mientras que Biome también las quita de los identificadores posteriores a ES2015. En las expresiones de asignación dentro de claves calculadas, Biome quita los paréntesis.

## Comprobaciones que se perdieron al dejar ESLint

Al pasar a Biome, algunas comprobaciones se perdieron de verdad. `import/no-unresolved` y `import/named` no estaban en Biome 1.9, por lo que no podían comprobar rutas ni nombres de imports; en mis servicios, `tsc` se encarga de hacerlo en su lugar. Sin embargo, a partir de los diagnósticos que no eran errores reales en la medición de `noUnresolvedImports` de la sección anterior, concluí que es difícil sustituirlas con reglas de dominio project.

También se perdió la comprobación de la ubicación de las llamadas a hooks. En ESLint era un error, pero cuando adoptamos Biome dejamos desactivada `useHookAtTopLevel`. También se perdieron las reglas para nombres de archivos y carpetas. En aquel momento, `check-file` de ESLint detectaba 336 casos, pero Biome solo tiene `useFilenamingConvention` para nombres de archivos, sin reglas para los de carpetas.

Biome 1 tampoco tenía una comprobación de Promise sin gestionar. Para saber si el valor devuelto por una función es una Promise hace falta información de tipos, pero las reglas de Biome 1 solo examinaban la sintaxis de un archivo. La monitorización de errores que recibe `unhandledrejection` del navegador era una red de seguridad que solo detectaba algunos casos. Biome 2 incorporó `noFloatingPromises`, pero esta regla pertenece al grupo Nursery y aumenta el tiempo de ejecución cuando se activa.

## Migración a Biome 2

Los dos servicios aún usan Biome 1.9.4. Ejecuté `biome migrate --write` en una copia del código actual para comprobar los cambios de configuración y las diferencias en los diagnósticos. `files.include` e `ignore` se combinan en una sola opción, `includes`, y los patrones de exclusión empiezan con `!`. `organizeImports` pasa a `assist.actions.source.organizeImports`. También cambian los nombres o los grupos de algunas reglas. Por ejemplo, `noMultipleSpacesInRegularExpressionLiterals` pasa a llamarse `noAdjacentSpacesInRegex`, y `noWith` y `noVar` se trasladan al grupo Suspicious.

Según la guía oficial de actualización, el método de ordenación de imports ha cambiado y no se puede obtener exactamente el mismo orden que en 1.x. También cambia el uso de `**/` delante de los glob. Después de migrar la configuración con `biome migrate --write` y ejecutar el análisis, aparecieron diagnósticos por diferencias en la ordenación de imports en 322 archivos y diferencias de formato en 15. Para actualizar a Biome 2 hace falta un commit que corrija todas estas diferencias de una vez.

`biome migrate eslint --write` migra reglas de ESLint, globals, overrides y patrones ignore. Lee tanto el antiguo eslintrc como flat config y sigue extends. Deja el preset de reglas en none y activa solo las reglas migradas. La configuración predeterminada migra las reglas que coinciden; si se añade `--include-inspired`, también migra reglas similares. La guía oficial recomienda revisar el resultado antes de usarlo.

`biome migrate prettier --write` declara explícitamente todas las opciones de Prettier para conservar la salida actual.

## Decisiones en CI

En mi flujo de desarrollo, Biome corrige el código al guardar desde el editor y justo antes del commit. En la CI de los pull requests y de la canalización de despliegue se ejecuta `biome ci` para comprobar el formato, lint y assist sin modificar archivos. Como se pueden omitir los hooks de commit, la CI determina si los cambios pasan.

`biome ci --changed` comprueba solo los archivos modificados que se han incluido en el commit, comparándolos con la rama predeterminada o con la referencia indicada mediante `--since`; está pensado para CI. `--staged` comprueba solo los archivos en staging y está pensado para uso local. Se puede elegir entre los reporters github, gitlab, junit, checkstyle, sarif, rdjson y summary; json es experimental.

## Preguntas frecuentes y respuestas

- **¿Biome sustituye la comprobación de tipos?**: No. Se pueden usar reglas de lint basadas en información de tipos, pero en mis dos servicios `tsc` en CI se encarga de comprobarlos.
- **¿`noFloatingPromises` de Biome 2 es una regla estable?**: No. Incluso en la versión 2.6.8 pertenece al grupo Nursery y la documentación oficial explica que su comportamiento puede cambiar porque es experimental.
- **¿Cuánto aumentó el tiempo de análisis al activar `noFloatingPromises`?**: En mi código actual, solo lint tardaba entre 122 y 160 ms; al añadir esta regla, tardó entre 225 y 262 ms.
- **¿Se puede sustituir la comprobación de ESLint por `noUnresolvedImports` de Biome?**: Concluí que es difícil en mi código. Incluso con `node_modules` enlazado, los 553 casos fueron diagnósticos que no eran errores reales; sin enlazarlo, aparecieron 4.136 casos en unos 700 ms.
- **¿Actualizar a Biome 2 provoca cambios grandes en el código?**: En mi código, aparecieron diagnósticos de ordenación de imports en 322 archivos y diferencias de formato en 15.
- **¿Todas las correcciones automáticas de Biome conservan el significado?**: No. Las correcciones safe garantizan que no cambia, pero las unsafe pueden cambiarlo y requieren `--write --unsafe`.
- **¿`biome ci` corrige el código?**: No. Comprueba formato, lint y assist, pero no modifica los archivos.
- **¿Se pueden usar tal cual los plugins existentes de ESLint?**: Los plugins GritQL no pueden acceder al semantic model que usan las reglas Rust de Biome, y los plugins JavaScript están en developer preview. No se puede trasladar tal cual el ecosistema de plugins existente de ESLint.

## Conclusión

En mis dos servicios, Biome reunió en un solo lugar la configuración que se aplica realmente, y el análisis completo siguió tardando alrededor de 0,2 segundos incluso después de que el número de archivos casi se duplicara. Eso no significa que el conjunto de reglas sea igual al de ESLint. Hay que tener en cuenta tanto las comprobaciones que se pierden durante la migración, como las comprobaciones de imports, la ubicación de las llamadas a hooks y las reglas para nombres de carpetas, como los diagnósticos que no eran errores reales y que encontré en las reglas project de Biome 2.

Biome 2 amplió las reglas con información de tipos y su cobertura, pero en mi código la migración produjo cambios en la ordenación de imports en 322 archivos y diferencias de formato en 15. Si estás pensando en migrar, te recomiendo revisar conjuntamente la velocidad y la unificación de la configuración, las reglas que aplicas ahora, las comprobaciones que perderías y el diff real de la conversión.

:::ref
- [docs] [Biome, Biome v2](https://biomejs.dev/blog/biome-v2/)
- [docs] [Biome, Migra a Biome v2](https://biomejs.dev/guides/upgrade-to-biome-v2/)
- [docs] [Biome, Migra desde ESLint y Prettier](https://biomejs.dev/guides/migrate-eslint-prettier/)
- [docs] [Biome, Arquitectura](https://biomejs.dev/internals/architecture/)
- [docs] [Biome, Linter](https://biomejs.dev/linter/)
- [docs] [Biome, Dominios del linter](https://biomejs.dev/linter/domains/)
- [docs] [Biome, noFloatingPromises](https://biomejs.dev/linter/rules/no-floating-promises/)
- [docs] [Biome, noUnresolvedImports](https://biomejs.dev/linter/rules/no-unresolved-imports/)
- [docs] [Biome, Supresiones](https://biomejs.dev/analyzer/suppressions/)
- [docs] [Biome, CLI](https://biomejs.dev/reference/cli/)
- [docs] [Biome, Diferencias con Prettier](https://biomejs.dev/formatter/differences-with-prettier/)
:::