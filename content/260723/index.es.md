---
emoji: 🗣️
title: 'Lenguaje compartido'
seoTitle: 'Comunicación entre disciplinas: ubiquitous language y grounding de requisitos'
date: '2026-07-23'
categories: colaboración dominio DDD comunicación
description: '¿Qué hacer cuando el product manager y el developer usan la misma palabra para cosas distintas? Con el ubiquitous language de Evans y la teoría del grounding de Clark, repaso la estructura del fallo de comunicación entre disciplinas y las herramientas prácticas para igualar la resolución.'
keywords: 'ubiquitous language, lenguaje compartido dominio, comunicación entre disciplinas, cómo definir requisitos, comunicación product manager developer, grounding common ground, Example Mapping, breadboarding, bounded context, seguridad psicológica equipo de desarrollo'
locale: es
translationOf: '260723'
sourceHash: 2577075c7c31a7debb0457c693d3c10157db4bbcf72d9bb033c5f58bdeb8e5a6
---

En este artículo quiero hablar de la comunicación con otras disciplinas.

Mientras desarrollo, dedico tanto tiempo a averiguar qué hay que construir como a escribir código. Intercambio requisitos con el product manager, ajusto pantallas con el diseñador y pregunto a quien conoce el dominio qué significa cada término. Y he comprobado varias veces que el coste de que ese proceso falle es mucho mayor que el coste de escribir mal el código.

Hace poco leí [Las actividades diarias de un líder de ingeniería](https://softwareleads.substack.com/p/engineering-leaders-day-to-day-activities), escrito por James Samuel. El autor divide el trabajo de un líder en seis apartados y el primero que aborda es la recopilación de información. Su razón es que toda decisión, toda dirección y toda acción dependen de una comprensión precisa de lo que está ocurriendo ahora mismo.

Aunque quiero asumir un rol de liderazgo algún día, lo que pensé al leer ese pasaje fue algo distinto. **Si lo primero que aborda un líder es recopilar información, el equivalente para quien está en la ejecución es entender los requisitos.** La forma en que manejo hoy los requisitos será la forma en que maneje mañana la información de una organización.

No pretendo hablar de liderazgo en este artículo. Hablo de qué estaba haciendo mal al comunicarme con otras disciplinas desde mi puesto actual y de qué puedo usar como herramienta. Empezando por la conclusión: llegué a pensar que este problema no es solo una cuestión de actitud. Existe una formulación alternativa, llamada ubiquitous language, y vale la pena ver de qué se trata.

## La misma palabra, significados distintos

En su artículo sobre [Bounded Context](https://martinfowler.com/bliki/BoundedContext.html), Martin Fowler pone el ejemplo de una compañía eléctrica. Buena parte de los desajustes que he vivido tenían esta forma.

::::quote
:::translation
Aquí la palabra «meter» significaba cosas sutilmente distintas en diferentes partes de la organización: ¿era la conexión entre la red y una ubicación, entre la red y un cliente, o el contador físico en sí?
:::

:::original
here the word 'meter' meant subtly different things to different parts of the organization: was it the connection between the grid and a location, the grid and a customer, the physical meter itself
:::
::::

La misma palabra, «meter», significaba cosas sutilmente distintas según el departamento de la organización. Y Fowler añade que esa confusión no es una casualidad de ese caso concreto: dice haber visto repetirse la misma confusión con palabras polisémicas como Customer o Product.

**Esto no ocurrió porque los asistentes a la reunión fueran malos en las reuniones.** Cuando una organización contiene contextos distintos, es natural que la misma palabra se bifurque, y si se deja pasar, acaba bifurcando también el código.

El trasfondo técnico de esta historia lo traté una vez en [Modelo de dominio](/260418). Allí hablaba de cómo expresar el modelo dentro del código. En este artículo trato la etapa anterior a que ese modelo exista, la de la conversación entre personas.

## Una palabra con dos significados

Pero ¿por qué se repite esto de forma estructural? Hay dos líneas de explicación.

Una viene de la estructura organizativa. El artículo [How Do Committees Invent?](https://melconway.com/Home/Committees_Paper.html), que Mel Conway publicó en Datamation en 1968, sostiene que, en la medida en que una organización no puede cambiar con flexibilidad su estructura de comunicación, esa organización estampa su propia imagen en todos los diseños que produce. La única frase que suele citarse como ley de Conway es en realidad una formulación que el propio autor elaboró más tarde, y esta descripción del texto de 1968 me resulta más directa.

Lo que leí en clave práctica en esa frase es la expresión «estampa». Significa que la bifurcación de los términos no termina en la conversación, sino que **permanece en los artefactos**. El «meter» anterior es exactamente eso. Si cada uno construye manteniendo un entendimiento distinto del alcance de «meter», esa diferencia no queda en el acta de la reunión, sino en los nombres de las tablas, en los campos de la respuesta de la API y en los textos de la pantalla. Y a partir de ahí, el coste de arreglarlo no admite comparación con el de mantener una conversación más.

Aquí se separa lo que quien está en la ejecución puede hacer de lo que no. Cambiar la estructura de comunicación de la organización queda fuera de su alcance. Pero **hacer visibles los límites de los términos** sí se puede hacer desde el puesto actual. Consiste en anotar qué alcance tiene una palabra en este documento y en indicar explícitamente cuándo difiere de la palabra que usa otro equipo. Todas las herramientas que veremos después son dispositivos que facilitan ese trabajo.

La otra explicación es algo más de fondo. Desde la ciencia cognitiva, la colaboración solo se sostiene sobre un trasfondo compartido. [Grounding in Communication](https://web.stanford.edu/~clark/1990s/Clark,%20H.H.%20_%20Brennan,%20S.E.%20_Grounding%20in%20communication_%201991.pdf), escrito por Herbert Clark y Susan Brennan en 1991, arranca con el ejemplo de un dúo de piano. Los dos intérpretes no pueden ni empezar a coordinarse sin presuponer una cantidad enorme de información compartida, es decir, common ground. Aquí common ground significa conocimiento mutuo, creencias mutuas y supuestos mutuos. Y los autores afirman con rotundidad que toda acción colectiva se construye sobre el common ground y su acumulación.

La perspectiva a la que llegué tras poner ambas líneas una junto a otra es esta. **Que los términos se desajusten no es un accidente, es el estado por defecto.** Estar alineados es la excepción, el estado que hay que mantener pagando un coste. Entonces la pregunta práctica pasa a ser quién paga ese coste y cómo.

## La tarea del developer no es transcribir

La respuesta más clara que encontré a esa pregunta fue la de Eric Evans.

En Domain-Driven Design, publicado en 2003, Evans presenta un patrón llamado ubiquitous language. Suele resumirse como poco más que «que developers y expertos de dominio usen los mismos términos», pero al leer el libro original la receta es mucho más concreta. Pide que el equipo tome el modelo como columna vertebral del lenguaje y se comprometa a usar ese lenguaje con insistencia en toda la comunicación del equipo y en el código. Y la frase que viene a continuación fue la más importante para mí.

::::quote
:::translation
Los expertos de dominio objetan a los términos o estructuras que resultan torpes o inadecuados para transmitir el entendimiento del dominio, mientras que los developers vigilan la ambigüedad o la inconsistencia que hará tropezar al diseño.
:::

:::original
Domain experts object to terms or structures that are awkward or inadequate to convey domain understanding, while developers watch for ambiguity or inconsistency that will trip up design.
:::
::::

Los expertos de dominio objetan a los términos y estructuras torpes o insuficientes para transmitir el entendimiento del dominio, y **los developers vigilan la ambigüedad o inconsistencia que derribará el diseño**.

Al leer esa frase corregí mi comprensión de mi propio papel. Hasta entonces me consideraba un receptor en las reuniones de requisitos. Pensaba que mi trabajo era recibir con exactitud lo que se decidiera en producto e implementarlo. Pero la parte que Evans asigna al developer no era la recepción. **Es detectar la ambigüedad y devolverla.** Eso no es cooperación pasiva, es vigilancia activa.

(Por cierto, Fowler tradujo esta frase en su artículo como «Domain experts **should** object ... developers **should** watch». El libro original no lleva verbo modal. Es una diferencia menor, pero el original se lee de forma más categórica: el tono no es que convenga hacerlo, sino que hacerlo es la definición del patrón.)

¿Y cómo se detecta la ambigüedad? Evans también responde a eso: usar los términos repetidamente en la conversación es lo que revela las diferencias de interpretación. Yo leí esa frase así. La ambigüedad no se encuentra leyendo documentos con lupa. Por muy cuidadosamente que se lea una especificación, no aflora el hecho de que la palabra «socio» significa tres cosas distintas. Esa palabra tiene que usarse repetidamente contra casos concretos para que se bifurque. El momento en que surge una pregunta como «¿alguien que se dio de baja sigue siendo socio?» es justamente ese punto.

## ¿Y por qué esa conversación no funciona?

Hasta aquí, la receta. El problema es que hubo una época en la que conocía esta receta y aun así no la practicaba. ¿Por qué no preguntaba una y otra vez?

Volvamos al artículo de Clark y Brennan. Los autores dan el nombre de grounding al proceso de convertir lo dicho en parte del common ground. Y proponen un principio sobre cómo se comporta la gente durante ese proceso: el principio del mínimo esfuerzo colaborativo (the principle of least collaborative effort). Nace de la observación de que a la gente no le gusta trabajar más de lo necesario.

Aquí aparece el pasaje importante.

::::quote
:::translation
Según el principio del mínimo esfuerzo colaborativo, la gente debería intentar hacer grounding con el menor esfuerzo conjunto necesario. Pero qué es lo que cuesta esfuerzo cambia drásticamente según el medio de comunicación.
:::

:::original
By the principle of least collaborative effort, people should try to ground with as little combined effort as needed. But what takes effort changes dramatically with the communication medium.
:::
::::

**El punto donde recae el esfuerzo cambia drásticamente según el medio.** Una técnica de confirmación disponible en un medio puede ser directamente imposible en otro o, aun siendo posible, mucho más costosa. Los autores señalan en particular que, en los medios donde el interlocutor no recibe lo dicho de inmediato, el coste de confiar en que otro corrija el malentendido se vuelve muy alto, así que el hablante tiende a evitarlo.

Conviene precisar algo aquí. Este artículo se escribió en 1991 y los medios que compararon los autores son la conversación cara a cara, el teléfono, las cartas o el contestador automático. **No trata Slack ni Notion.** El marco de que el coste del grounding varía según el medio es de los autores; aplicarlo a los canales de trabajo asíncronos de hoy es interpretación mía.

Aplicado así, se explica por qué yo no preguntaba una y otra vez. En un entorno donde recibes la especificación como texto y la confirmas como texto, enviar un mensaje de confirmación en cada punto ambiguo es caro. No sabes cuándo llegará la respuesta y temes que preguntar varias veces te haga parecer alguien que no ha entendido. Así que uno se desliza de forma natural hacia su propia interpretación.

Conviene distinguir aquí dos fuerzas. Una es que el medio encarece la confirmación, y eso es lo que dicen Clark y Brennan. La otra es el temor a parecer incompetente por preguntar varias veces, y eso no es lo que predice su principio, sino que pertenece a la seguridad psicológica de la que hablaremos después. Con precisión: lo que predice el principio del mínimo esfuerzo colaborativo es que **se elegirá una forma más barata de confirmar**, no que se dejará de confirmar. Renunciar a confirmar y pasar a la suposición no es el principio operando, es el grounding fracasando. Y el hecho de que esa interpretación fuera errónea aflora cuando la implementación ya está terminada.

## ¿Hasta dónde hay que confirmar?

Entonces, ¿hay que preguntar por cada ambigüedad? No es realista y nunca he visto a nadie hacerlo. El artículo también ofrece un criterio para esta pregunta: el grounding criterion. Designa el estado en que ambas partes creen mutuamente que el oyente ha entendido lo que quería decir el hablante **hasta un nivel suficiente para el propósito actual**. Los autores lo preceden con la observación de que la comprensión perfecta es imposible de entrada.

La razón por la que este criterio me resultó práctico es que rebaja el objetivo. No hace falta entender los requisitos a la perfección. **Basta con poder confiar mutuamente en que se entienden lo suficiente para lo que se va a hacer.** Y los autores dicen que, si cambia el propósito, el criterio debe cambiar con él.

En la práctica, esto se convierte en el criterio para calibrar la intensidad de la confirmación. Si en una sesión que aún explora la dirección te enrocas en «¿alguien que se dio de baja sigue siendo socio?», la conversación no avanza. Lo que hace falta en esa etapa es acordar qué se quiere hacer y por qué, no fijar los valores límite. Al contrario, justo antes de entrar en implementación esa pregunta tiene que salir sí o sí. Ahí hay que poder confiar en que ambos están imaginando el mismo alcance para «socio»; si no, el código se apila sobre una premisa equivocada.

Por eso, ante la misma ambigüedad, **la trato de forma distinta según la etapa en la que estoy.** En la etapa de exploración la anoto en una lista y sigo; justo antes de implementar abro esa lista y voy cerrando los puntos uno a uno. Aplazar la confirmación y renunciar a ella son cosas distintas.

Hay una herramienta que combina bien en este punto. Team Topologies, de Matthew Skelton y Manuel Pais, distingue tres modos de interacción entre equipos: collaboration, cuando durante un periodo definido se descubre algo nuevo en conjunto; X-as-a-Service, cuando una parte provee y otra consume; y facilitation, cuando una parte ayuda y mentoriza a la otra.

En origen es una discusión sobre diseño organizativo, pero me pareció práctico reducirlo a la escala de una sola reunión. **Si cada parte cree que esta conversación está en un modo distinto, la reunión se descarrila.** Si el product manager cree que es una sesión para comunicar lo ya decidido mientras el developer cree que es una sesión para descubrir juntos, las preguntas del developer suenan a objeción y no a colaboración. También ocurre al revés. Si el developer vino a recibir una especificación cerrada y el product manager todavía estaba explorando, el developer se frustra porque no hay especificación.

Por eso últimamente confirmo esto al principio de la reunión: «¿Esto sigue abierto o es una sesión para confirmar lo que ya está decidido?». Esa sola pregunta cambia el carácter de todo lo que viene después. Es lo mismo que ajustar el grounding criterion al propósito.

## Cuando la resolución no coincide, la conversación gira en vacío

Aun con el modo alineado, queda un problema. Otro desajuste que he vivido a menudo es hablar con **resoluciones** distintas.

Los requisitos que el product manager entrega en prosa suelen ser demasiado abstractos. De una frase como «que el usuario pueda consultar cómodamente su historial de reservas» no se deduce cuántas pantallas hay ni qué lleva a dónde. Al contrario, la maqueta del diseñador es demasiado concreta. El color de los botones y los márgenes ya están decididos, así que resulta difícil discutir precisamente si este flujo es el correcto.

Shape Up, escrito por Ryan Singer en Basecamp, señala este problema con precisión: empezar por wireframes o por maquetas visuales concretas te encierra en detalles innecesarios e impide explorar tan ampliamente como haga falta. Por eso, [lo que propone Shape Up](https://basecamp.com/shapeup/1.3-chapter-04) es una representación intermedia. Se llama breadboarding y toma prestado el concepto de la ingeniería eléctrica. Una breadboard es un prototipo que tiene todas las piezas y el cableado del aparato real, pero ningún diseño industrial. Por eso solo se dibujan tres cosas: los lugares a los que se puede navegar (places), aquello que el usuario puede accionar (affordances) y las líneas de conexión que muestran a dónde lleva esa acción al usuario (connection lines).

![Los tres niveles de resolución de un requisito: las preguntas que pueden responder la prosa, la breadboard y la maqueta](1.png?w=720)

La razón por la que valoro esta técnica es que es un artefacto que puede producir el developer. En lugar de pedirle al product manager que escriba con más detalle o de esperar la maqueta del diseñador, puedes dibujar allí mismo el flujo tal como lo has entendido y devolverlo con un «lo he entendido así, ¿es correcto?». Es una forma concreta de ejecutar la vigilancia de la que hablaba Evans, la de devolver la ambigüedad. Y visto desde la sección anterior, es un dispositivo que abarata el grounding. Un dibujo sustituye varias rondas de confirmación por texto.

Pero esta resolución cuesta más de sostener de lo que parece. Mientras dibujas el flujo, acabas bajando de forma natural a cosas como «¿no sería mejor poner este botón abajo a la derecha?». A mí me ha pasado varias veces. Una vez que bajas así, la pregunta que se estaba discutiendo, es decir, si este flujo es el correcto, desaparece en silencio. Si decides la posición de los botones cuando el flujo todavía no está cerrado, toda esa discusión se tira por completo cuando el flujo cambie después.

Por eso en esta etapa intento mantener **un dibujo deliberadamente malo**. Si solo hay rectángulos, flechas y nombres, la otra persona ni se plantea señalar detalles y responde únicamente al flujo. Que el dibujo tenga poco acabado es, en esta herramienta, una función. (Contener las ganas de dibujarlo bonito cuesta más de lo que parece)

Que el propio nivel de abstracción pueda ser una herramienta de colaboración enlaza con lo que traté en [Abstracción](/260201). Allí hablaba del nivel de abstracción del código; en la conversación existe lo mismo.

## Separar reglas, ejemplos y preguntas

Otra manera de igualar la resolución es estructurar la propia discusión.

Es el caso de [Example Mapping](https://cucumber.io/blog/bdd/example-mapping-introduction/), presentado en 2015 por Matt Wynne, que lideró el proyecto Cucumber. Él diagnostica que la razón por la que a muchos equipos les cuesta discutir requisitos es que, al no haber estructura, la discusión se alarga y se vuelve aburrida. Y por eso dejan de hacerla con regularidad y con coherencia. A mí me pasaba exactamente eso: cuando una reunión de requisitos se alarga, la siguiente intentas acabarla rápido, y si la acabas rápido las ambigüedades se quedan tal cual.

Example Mapping divide la discusión en tarjetas de cuatro colores. La amarilla es la historia que se está tratando, la azul es la regla o criterio de aceptación, la verde es el ejemplo concreto que ilustra esa regla y la roja es la pregunta cuya respuesta nadie conoce.

De todas ellas, **creo que la tarjeta roja es la clave.** Las otras tres son técnicas de ordenación, pero la roja es el dispositivo que convierte el «no lo sé» en un producto oficial de la reunión. Decir que no se sabe deja de ser un acto que retrasa la reunión y pasa a ser un resultado que la reunión debe producir.

Por qué esto importa se ve claro al imaginar el caso contrario. En una reunión sin tarjetas rojas, encontrarse con un punto ambiguo deja dos opciones: enrocarse ahora y alargar la reunión, o seguir adelante e interpretarlo uno mismo más tarde. Como vimos en la sección anterior, la gente suele elegir lo segundo. Pero con una tarjeta a mano aparece una tercera opción. **Anotarlo y seguir, sin que desaparezca.** La reunión continúa y la ambigüedad se queda en una lista en vez de esfumarse.

La tarjeta verde cumple un papel parecido. Cuando solo se escribe la regla, todo el mundo asiente; en el momento en que alguien intenta escribir un ejemplo concreto que la ilustre, las interpretaciones se separan. Es el «usarlos repetidamente en la conversación revela las diferencias» de Evans trasladado al formato de reunión. Si pides que se añadan tres ejemplos por cada regla, en uno de ellos suele salir un «espera, ¿y en este caso qué pasa?». (Por mi experiencia, la reunión en la que esa pregunta no aparece no es una reunión en la que todos entendieron, sino una en la que cada uno entendió algo distinto)

Con una idea parecida existe también Three Amigos, usado desde hace tiempo en el ámbito de BDD. Consiste en que las tres perspectivas de negocio, desarrollo y pruebas plantean cada una una pregunta distinta, y el [glosario de Agile Alliance](https://www.agilealliance.org/glossary/three-amigos/) resume esas preguntas como qué problema se intenta resolver, cómo se construirá una solución para resolverlo y qué pasa con esto, qué podría llegar a ocurrir. Qué le sucede a una reunión donde la tercera pregunta nunca aparece probablemente no haga falta explicarlo.

## Crear una casilla para anotar lo que no se sabe

Ahora bien, ¿por qué nos cuesta tanto sacar la tarjeta roja? Aquí no hay manera de esquivar el tema de la seguridad psicológica.

El [artículo](https://web.mit.edu/curhan/www/docs/Articles/15341_Readings/Group_Performance/Edmondson%20Psychological%20safety.pdf) que Amy Edmondson publicó en Administrative Science Quarterly en 1999 es el estudio que estableció formalmente el concepto de seguridad psicológica de equipo. (El propio artículo señala como raíz el trabajo de Schein y Bennis de 1965.) Define la seguridad psicológica de equipo como la creencia compartida de que el equipo es un lugar seguro para asumir riesgos interpersonales. Decir que no se sabe, expresar desacuerdo y admitir un error entran ahí. El artículo estudió 51 equipos de una empresa manufacturera y mostró que la seguridad psicológica se asocia con el comportamiento de aprendizaje y que ese comportamiento media entre la seguridad psicológica y el rendimiento del equipo.

Pero la frase que me pareció más práctica de ese artículo no fue la definición, sino la que viene justo después.

::::quote
:::translation
En su mayor parte, esta creencia tiende a ser tácita: se da por sentada y ni los individuos ni el equipo en su conjunto le prestan atención directa.
:::

:::original
For the most part, this belief tends to be tacit—taken for granted and not given direct attention either by individuals or by the team as a whole.
:::
::::

Esta creencia suele ser **tácita** y ni los individuos ni el equipo le prestan atención directa.

A partir de aquí es una conjetura mía. Lo que dice el artículo llega hasta que la creencia es tácita; la receta de que por tanto basta con crear un formulario no está en el artículo. Dicho esto, he visto varias veces que lo tácito no cambia por declaración. Decir «somos un equipo donde se puede preguntar lo que no se sabe» no cambia gran cosa por sí solo. Por eso creo que la tarjeta roja de la sección anterior importa. **Si conviertes el «no lo sé» en una casilla dentro de un formulario, rellenarla pasa a ser procedimiento en lugar de valentía.**

Cabe una objeción, por supuesto. En un equipo que no es seguro, la casilla de la tarjeta roja se quedará simplemente vacía. Es una crítica justa y no pretendo afirmar que esta herramienta genere seguridad. Pero si la casilla existe, al menos **el hecho de que esté vacía se vuelve visible.** Aparece un lugar donde preguntar si está vacía porque nadie tiene dudas o porque cuesta decirlas.

La misma idea está incorporada en formatos de documento reales. Si miras el [Bounded Context Canvas](https://github.com/ddd-crew/bounded-context-canvas) creado por la comunidad DDD, es una herramienta colaborativa para diseñar y documentar un contexto, y su reparto de casillas resulta interesante. Nombre y propósito, clasificación estratégica, rol de dominio, comunicación entrante y saliente, y luego **Ubiquitous Language**, decisiones de negocio, **Assumptions**, métricas de verificación y **Open Questions**.

Hay una casilla aparte para escribir el lenguaje compartido, otra para los supuestos y otra para las preguntas abiertas. La descripción del canvas dice que el propio acto de escribir el propósito obliga a formular con claridad un pensamiento difuso y coloca a todo el equipo en la misma página.

Creo que este planteamiento es el enfoque más realista para los problemas de comunicación. En vez de intentar cambiar la actitud de las personas, **crear una casilla para aquello que cuesta decir.** Algo parecido sentí al escribir [Retrospectiva de la refactorización de Toss Frontend Fundamentals](/260328): una buena estructura no exige que la gente lo haga bien, sino que se lo pone fácil.

## Por qué esto no es una cuestión de gusto

Llegados aquí, cabe una reacción: está bien, pero al final esto es «comuniquémonos con empeño», ¿no? ¿Y eso no es cuestión de carácter?

Yo también lo pensé durante un tiempo. Pero sobre esta parte hay datos.

Cuando DORA aborda la cultura organizativa, toma la clasificación del sociólogo Ron Westrum: pathological, orientada al poder; bureaucratic, orientada a las reglas; y generative, orientada al resultado. Y [la documentación oficial de DORA](https://dora.dev/capabilities/generative-organizational-culture/) resume así sus hallazgos.

::::quote
:::translation
Una cultura organizativa de alta confianza que enfatiza el flujo de información es predictiva del rendimiento en la entrega de software.
:::

:::original
organizational culture that is high-trust and emphasizes information flow is predictive of software delivery performance
:::
::::

Una cultura organizativa de alta confianza que **enfatiza el flujo de información** predice el rendimiento en la entrega de software. No dice que los equipos que se comunican bien estén de mejor humor, sino que es una variable que se mueve junto al rendimiento.

Ahora bien, «predecir» no debe leerse aquí como causalidad. Los datos de DORA proceden de una encuesta en la que los mismos participantes respondieron sobre cultura y sobre rendimiento, y es una correlación a nivel organizativo. Queda la posibilidad de que quien está satisfecho con su organización puntuara alto en ambas cosas, y de una relación a nivel organizativo no se deriva de inmediato una receta sobre cómo debe comportarse un individuo. Así que hasta aquí llega lo que permite decir este material: el flujo de información no vive solo en el terreno del gusto, está en un lugar donde se mueve junto al rendimiento.

El mismo documento recoge también las tres propiedades de la buena información según Westrum: responde a la pregunta que necesita quien la recibe, llega en el momento oportuno y se presenta de forma que quien la recibe pueda usarla con eficacia. Merece la pena fijarse en que las tres sitúan el criterio en **quien recibe**. Compartir mucho no es lo que hace bueno un flujo de información.

El Project Aristotle de Google es otra fuente citada con frecuencia. Según [lo publicado en re:Work](https://rework.withgoogle.com/intl/en/guides/understand-team-effectiveness), estudiaron 180 equipos, aplicaron más de 35 modelos estadísticos a cientos de variables y propusieron cinco factores que influyen en la efectividad de un equipo: seguridad psicológica, fiabilidad, estructura y claridad, significado e impacto. Y la conclusión fue que importaba más cómo trabajaba junto ese equipo que quién estaba en él.

Aun así, quiero señalar una cosa. La página oficial declara que enumera los cinco factores por orden de importancia y coloca la seguridad psicológica en primer lugar. Pero las expresiones de magnitud del tipo «primero de forma abrumadora», que aparecen a menudo en artículos que citan esta investigación, no están en esa página. Que exista un orden y que uno arrase sobre los demás son cosas distintas. Por eso en este artículo no afirmo nada sobre la magnitud. Para argumentar la importancia de la seguridad psicológica, lo preciso es apoyarse en el artículo original de Edmondson de la sección anterior.

## De vuelta al tema del liderazgo

Volvamos al artículo citado al principio.

Al abordar en primer lugar la recopilación de información, James Samuel dice que los métodos de la etapa de ejecución dejan de funcionar. Como colaborador individual tienes la imagen completa de tu propio trabajo, pero cuando asumes responsabilidad sobre personas ya no puedes usar el método anterior. Por eso señala como capacidad necesaria la de filtrar el ruido y sintetizar la información en una imagen coherente de la realidad, porque ningún manager puede procesarlo todo.

Sentí que esto es lo mismo que las tres propiedades de la buena información de Westrum que vimos antes. No se trata de recopilar mucho, sino de convertirlo en algo utilizable. Y eso no se diferencia de lo que estoy haciendo ahora al trabajar con requisitos. Extraer las partes ambiguas de las frases de una especificación, redibujarlas como breadboard para confirmarlas y dejar lo que no se sabe como tarjeta roja es exactamente el ejercicio de filtrar el ruido y construir una imagen coherente.

También se me quedó lo que el autor dice sobre la toma de decisiones: esperar a tener certeza es en sí mismo una decisión y conlleva un coste. Esperar a que los requisitos sean del todo claros es igual. Por eso el grounding criterion, suficiente para el propósito actual en vez de comprensión perfecta, se convierte en el criterio práctico.

## Para terminar

En resumen.

El fallo de comunicación con otras disciplinas no suele ser solo una cuestión de actitud. Cuando una organización contiene contextos distintos, que la misma palabra se bifurque es el estado por defecto, y estar alineados es la excepción que hay que mantener pagando un coste. La forma de pagar ese coste es el lenguaje compartido, y dentro de él la parte del developer no es transcribir los requisitos, sino vigilar la ambigüedad y devolverla.

Pero devolverla exige esfuerzo, y la gente intenta minimizarlo. Así que, en lugar de apoyarme en la voluntad, decidí usar tres cosas: confirmar primero en qué modo está esta conversación, dibujar el flujo en la resolución intermedia entre la prosa y la maqueta y devolverlo, y crear dentro del formato de reunión una casilla para anotar lo que no se sabe. Ninguna de las tres exige corregir la actitud; las tres facilitan hacerlo.

Todavía no soy líder y nada de lo que he escrito aquí lo he verificado desde ese puesto. Con otro tamaño de equipo u otra cultura organizativa habrá cosas que no funcionen. Pero hay algo de lo que creo poder estar seguro ahora. La manera en que maneje la información más adelante no será algo que aprenda de nuevo, sino el hábito con el que hoy manejo los requisitos, crecido a otra escala. Por eso últimamente intento avergonzarme menos que antes de preguntar en una reunión «¿qué quieres decir con eso?».

Si a quien lee esto le viene a la cabeza alguna palabra de una reunión reciente ante la que asintió sin estar realmente seguro, le recomiendo usar esa palabra una vez más la próxima vez. Al usarla repetidamente, aflora.

:::ref
- [article] [Martin Fowler, Ubiquitous Language](https://martinfowler.com/bliki/UbiquitousLanguage.html)
- [docs] [Eric Evans, Domain-Driven Design Reference](https://www.domainlanguage.com/ddd/reference/)
- [docs] [Team Topologies, Key Concepts](https://teamtopologies.com/key-concepts)
- [docs] [Basecamp, Shape Up: Set Boundaries](https://basecamp.com/shapeup/1.2-chapter-03)
- [article] [Alberto Brandolini, EventStorming](https://www.eventstorming.com/book/)
- [article] [Stefan Hofer, Henning Schwentner, Domain Storytelling](https://domainstorytelling.org/)
- [article] [Gojko Adzic, Specification by Example](https://gojko.net/books/specification-by-example/)
:::
