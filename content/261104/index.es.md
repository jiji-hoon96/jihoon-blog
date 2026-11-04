---
emoji: 🧠
title: '[Traducción] Pensamiento crítico en la era de los agentes'
seoTitle: 'Addy Osmani: IA, pensamiento crítico y cognitive surrender'
date: '2026-11-04'
categories: IA Herramientas-de-desarrollo Claude
description: 'Traducción del artículo de Addy Osmani sobre conservar tu criterio con agentes de IA: qué preguntarte, desconfiar del check verde y prácticas semanales.'
keywords: 'Addy Osmani, pensamiento crítico e IA, cognitive surrender, rendición cognitiva, agentes de programación con IA, agentic workflow, Claude Code, revisar código generado por IA'
locale: es
translationOf: '261104'
sourceHash: 26591e56156e613f37332d39b3618e56e6fcfc88f69f45ecb4530731e5e44ed3
---

En esta publicación quiero traducir el artículo de Addy Osmani [Critical thinking when agents do the work](https://x.com/addyosmani/status/2117512471930167377).

Es para desarrolladores que cada vez delegan más código y documentos en agentes, pero no están seguros de leer de verdad lo que les devuelven. No defiende delegar menos. Trata las seis preguntas que el autor se hace para no perder el criterio mientras delega, un hábito de verificación que no toma el check verde al pie de la letra y prácticas que puedes hacer cada semana y cada mes.

Addy Osmani trabajó más de 14 años en Google, donde lideró la experiencia de desarrollador de Chrome, DevTools, Lighthouse y Core Web Vitals, y es autor de "Learning JavaScript Design Patterns". Hoy construye Claude Code en Anthropic. El original se publicó como artículo de X el 3 de noviembre de 2026.

Mantuve los términos en su idioma original. A los conceptos que el autor toma de otros investigadores, como cognitive surrender, solo les añadí una explicación la primera vez que aparecen. Conservé los enlaces del original y enlacé cada destino una sola vez. Volví a comprobar en su fuente la redacción de cada frase citada. A partir de aquí va la traducción del original, y el "yo" del texto es el autor.

## Por qué el pensamiento crítico se volvió más difícil

Antes, el pensamiento crítico se enseñaba así: abordar la información nueva con una curiosidad humilde y una dosis sana de escepticismo, escuchar distintos puntos de vista y formarse una opinión propia. Sigue siendo cierto. Pero **ahora que buena parte de mi trabajo pasa por agentes, cada vez hay menos cosas en mi día a día que me obliguen a pensar críticamente.** A los ingenieros y a la gente de producto que se han subido por completo a los agentic workflows (los que ejecutan varias sesiones en paralelo y esperan que los modelos sigan mejorando) quiero decirles algo primero: me encantan estas herramientas. No escribo esto para defender que usemos menos agentes.

Mi objetivo es ayudarte a mantener el pensamiento crítico en un mundo donde es fácil delegar cualquier cosa en un agente.

Antes, la mayor parte de nuestro procesamiento cognitivo y estético ocurría en el espacio entre la pregunta y la respuesta. Ese espacio ahora se mide en segundos. Cuanto más usas agentic workflows, más difícil se vuelve esto (aunque creo que no de la manera que la gente esperaba). A medida que los modelos mejoran, el porcentaje de errores evidentes baja. Muchos (¿la mayoría?) de los resultados estarán bien escritos y serán correctos en lo esencial. Pero no te pedirán una segunda mirada.

Aunque tengas muchos agentes funcionando a la vez, sigues teniendo un solo par de ojos para revisar lo que producen.

**Tienes que meter el pensamiento crítico en tu jornada, porque por defecto nada lo hará por ti.** Parte de lo que hace difícil corregir esto por tu cuenta es que los agentic workflows resultan agradables. Recibir respuestas rápidas, cómodas y a menudo correctas en un día ajetreado es refrescante. Y justo por eso es fácil bajar la guardia.

## Delegar, ceder el juicio y rendirse

Cuando hablo de esto con la gente, lo describo como un espectro.

Arriba está cognitive offloading (delegación cognitiva): le encargas tareas a la IA, pero sigues siendo el dueño del resultado. Yo trabajo así todo el día, y te recomiendo que tú también lo hagas. En el medio está deferral (ceder el juicio): la salida de la herramienta se convierte directamente en tu siguiente entrada y el resultado deja de tratarse como una hipótesis. Abajo está [cognitive surrender (rendición cognitiva)](https://addyosmani.com/blog/cognitive-surrender/): la salida de la IA se convierte en silencio en tu propio pensamiento y ni siquiera sientes la necesidad de comprobarla.

Cognitive surrender es un término acuñado por [Steven Shaw y Gideon Nave](https://ssrn.com/abstract_id=6097646), de Wharton. Encaja perfectamente con lo que he estado viendo. A medida que aumenta la confianza (o la pereza), la gente se desliza hacia abajo en el espectro. Esa transición rara vez se nota, porque cada paso es gradual y parece razonable. Leíste bien la última respuesta, así que a la siguiente le echas un vistazo. De la que viene después solo miras el esqueleto. Y luego alguien te pregunta por una línea y no sabes explicarla, ni siquiera con ayuda de tu agente.

Eso es rendición cognitiva. Así se acumula la cognitive debt (deuda cognitiva). Normalmente se descubre cuando intentas usar un modelo mental del sistema y resulta que no existe. [Margaret-Anne Storey](https://margaretstorey.com/blog/2026/02/09/cognitive-debt/) ha escrito que en los equipos esto se manifiesta como la erosión de la teoría que todos habían construido juntos sobre el sistema (shared system theory). Yo he escrito sobre el equivalente en el código con el nombre de [comprehension debt](https://addyosmani.com/blog/comprehension-debt/) (deuda de comprensión, término acuñado por Jeremy Twei). En el momento es completamente invisible. El código se ve impecable y los tests pasan. Solo cuando tienes que cambiar el sistema te das cuenta de que ya nadie lo entiende. Lo mismo pasa cuando has leído solo el índice de un documento de estrategia o de una especificación y le has dado el visto bueno.

Para que quede claro, no estoy pidiendo lo imposible. Es imposible mantener en la cabeza el modelo mental completo de un código base grande y moderno. [El equipo de Claude Code ha dicho públicamente que reconstruye la comprensión cuando la necesita](https://claude.dev/blog/solving-code-review-at-anthropic/): cuando necesitan entender una parte, en lugar de tener todo el modelo en la cabeza, le piden a Claude que les explique ese trozo. [Como escribí antes](https://addyosmani.com/blog/intent-debt/), este tipo de deuda es más recuperable de lo que la mayoría de los ingenieros espera. No necesitas mantener el modelo completo mientras puedas reconstruir localmente la parte que te haga falta. Solo necesitas saber qué es lo que no tienes.

**Cuando hay poco en juego, puedes delegar por completo sin problema. Cuando no puedes explicar la respuesta a una pregunta, ni siquiera a través de tu agente, has cedido la propiedad.** Y eso tampoco es siempre un problema. Hace poco, mientras grababa un curso, tuve que elegir uno de tres hoteles con valoraciones parecidas como lugar de grabación. No tenía tiempo de leer todas las reseñas, así que delegué la decisión en una IA. Funcionó, y volvería a hacerlo. Pero no lo haría al decidir cómo invertir nuestro dinero, cómo aconsejar a nuestros hijos sobre su carrera o, en el trabajo, qué deberíamos construir, qué cambios afectan a qué usuarios o si es seguro publicar. Suelta lo que sale barato si te equivocas, y quédate con el razonamiento allí donde otros tendrán que cargar con las consecuencias.

## Las preguntas que me hago

Cuando no sabía qué pensaba, solía volver a una lista básica de preguntas como estas. ¿Cómo sé que estoy trabajando en el problema correcto? ¿Cómo sé que lo estoy resolviendo de la manera correcta? ¿Hay evidencia que respalde mi conclusión? ¿Cómo sé que he terminado? La mayoría de las veces se reduce a [quién, qué, dónde, por qué, cuándo y cómo](https://addyo.substack.com/p/critical-thinking-during-the-age). Escrito así parece absurdamente infantil, pero te obliga a pensar en categorías que de otro modo pasarías por alto. Hoy en día es demasiado fácil saltarse todo esto y preguntarle al agente qué cree que deberías hacer. Estas son las nuevas versiones de esas preguntas que me hago ahora.

**¿Formulé una hipótesis antes de preguntar?** Antes de poner a un agente con cualquier tarea que no sea trivial, anoto, aunque sea mentalmente, cuál creo que puede ser la respuesta. No pasa nada si es una mala suposición. Siempre puedes cambiar de opinión a la luz de información nueva. Pero una vez que has leído una respuesta bien escrita, cuesta imaginar cualquier otra posibilidad. Si no tienes ninguna pista, pide lo que Thariq Shihipar llama un [blind spot pass](https://claude.com/blog/a-field-guide-to-claude-fable-finding-your-unknowns) (revisión de puntos ciegos): dale al modelo lo que sabes y haz que encuentre lo que ni siquiera sabes que no sabes.

**¿Le pido que me ayude a pensar o que piense por mí?** Las dos cosas están bien, siempre que sepas cuál de ellas estás haciendo.

**¿Qué tendría que ser cierto para que esto estuviera mal?** Y luego ve a comprobarlo. La confianza que un modelo se asigna a sí mismo vale mucho menos que un test real que puedas ejecutar. Así que dale uno.

**¿He escuchado el argumento contrario desde otro ángulo?** Cuando he tomado una postura firme sobre algo más bien abierto, le pido a más de un modelo que defienda el lado opuesto, reviso lo que producen y me formo mi propia opinión. Lleva más tiempo, pero acabo sabiendo mucho más del tema.

**¿Apostaría por esto delante de la persona que tendrá que mantenerlo?** Vale para el código y para cualquier otra cosa que entregues. Creo que ese es el listón para poder responder por tu trabajo.

**¿Qué he dejado de practicar?** Quizá parte de la depuración rutinaria. Me parece bien soltar algo de eso, pero quiero que sea intencional.

## La verificación como hábito

Últimamente escribo mucho sobre verificación porque creo que [el cuello de botella se ha desplazado de escribir código a estar seguro de que tienes razón](https://addyo.substack.com/p/agentic-verification). Cuando le das a un agente los medios para verificar lo que hace (ya sean tests end-to-end, tests de propiedades o interacciones reales con la aplicación), puede hacer un cambio, ejecutar la verificación, leer la salida y volver a intentarlo, todo antes de que hayas mirado nada. Es lo que Boris Cherny llama ["darle a Claude una forma de verificar su trabajo"](https://x.com/bcherny/status/2007179861115511237), y creo que es uno de los componentes más importantes para lograr buenos resultados. En lugar de leer cada línea, construirás estos bucles y revisarás la evidencia.

También puedes rendirte en la verificación. "¿Hay evidencia que respalde mi conclusión?" se convierte en "¿Se puso verde el check?". Los agentes abaratan tanto crear tests que verás mucho verde, y podrías tener un test que pasa y no detecta una funcionalidad rota. Si el test se escribió con el mismo error que la funcionalidad, pasará. Y un check verde solo transmite una propiedad. Pero es demasiado fácil imaginar que lo cubre todo.

**Cuando un check se pone verde, pregunta qué demostró. Después pregunta qué no demostró.** Define "verificado" de antemano, porque si lo haces a posteriori, racionalizarás cualquier resultado.

La línea de meta del trabajo de un agente debería ser algo tangible: un test que pasa, una captura de pantalla, un log o una trace. Así el criterio para dar el trabajo por terminado es un hecho, y no queda sujeto a interpretaciones (ni a la rendición) del tipo "parece que ya está". Cuando recibas la notificación de que un agente terminó, antes de mirar el resumen, revisa primero el código del comando que se ejecutó y su salida.

Claude Code también puede autocriticar su propio trabajo (mediante un subagent en un contexto nuevo) como comprobación básica, y vale la pena meter eso en el bucle para que se ejecute siempre, no solo cuando te acuerdes. Yo sigo preguntando al final "¿Se me pasó algo?". Parece una tontería, pero muy a menudo, cuando termino una funcionalidad compleja con un modelo frontier, la miro, la reviso y luego pregunto "¿Se me pasó algo?", me devuelve dos o tres cosas más. Por eso siempre lo pregunto.

Por supuesto, nada de esto tiene que ser la norma. Saber cuándo profundizar también es una habilidad. Mi regla práctica favorita de nuestro texto sobre cómo hace code review el equipo de Claude Code es esta: "Si no puedes decir qué se les escaparía a los checks, pide una revisión de verdad en lugar de una aprobación rápida".

Esto también aplica fuera del código. Si un agente te ha sintetizado cincuenta llamadas con clientes o un análisis de la competencia, abre un par de los documentos originales para asegurarte de que el resumen es preciso. Comprueba un número del que dependa tu recomendación para asegurarte de que se calculó bien. **Los agentes han abaratado montar la verificación. Lo difícil para ti es saber qué aspecto tiene una buena verificación.**

## Fijarse de verdad en lo generado

Supón que un agente te entrega un PR de 600 líneas. Miras la estructura por encima. No lees cada línea. Los nombres de las variables parecen razonables y los tests pasan, así que lo apruebas. Pero en algún punto del medio hay un cambio sutil en el orden dentro de una frontera de transacción, o un valor por defecto invertido en un edge case en el que nunca pensaste. Lo revisaste, supongo. Pero solo buscando lo que ya sabías que ibas a encontrar.

Escribir código y revisarlo son habilidades distintas, y [hay un punto en el que revisar se convierte en rubber stamping (aprobar por inercia)](https://addyo.substack.com/p/the-80-problem-in-agentic-coding). Así que lee el diff como si no lo hubiera escrito una IA, y luego mira más allá del diff qué decidió el agente. A lo largo de una sesión larga toma muchas decisiones pequeñas por ti: los valores por defecto, qué queda fuera del alcance, qué requisito reinterpreta cuando dos de ellos chocan.

Nada de eso lo verás en un resumen que dice que todo salió bien, así que pídele que enumere las decisiones y suposiciones que tomó. Luego ponte a prueba. Elige unas cuantas líneas al azar y pregúntate: ¿y esta línea? ¿Y aquella? Si es un documento, ciérralo e intenta escribir de memoria el argumento principal. Hay un hábito que algunos usan en sesiones largas y que me gusta: pedirle a Claude que escriba un informe sobre el cambio y que al final te ponga un cuestionario, con la regla de "solo hago merge después de sacar la nota perfecta en el cuestionario". **Entiende lo que publicas lo bastante bien como para defenderlo. Porque en algún momento alguien podría preguntar.**

Los agentes también pueden proteger tu atención. Por ejemplo, tengo un proyecto open source que recibe muchos pull requests. Uso agentes para que me ayuden a ver qué está entrando, qué va en contra de nuestras pautas y dónde es probable que haga falta mi atención. Rara vez dejo que los agentes decidan esto solos, pero pueden acotar dónde debo concentrarme, y entonces puedo pensar de verdad si esos cambios resuelven el problema correcto de la manera correcta.

Y luego está el volumen, y ahí tienes que ser honesto contigo mismo. Lo he llamado [orchestration tax](https://addyosmani.com/blog/orchestration-tax/) (coste de orquestación). Es la brecha entre lo que generan tus agentes y aquello en lo que te sentirías cómodo poniendo tu nombre. Si el trabajo terminado se acumula más rápido de lo que puedes asimilarlo, abrir otra sesión no ayudará hasta que lo arregles: ajusta los checks para que menos cosas requieran tu atención, o ve más despacio. **Cuando produces más de lo que puedes respaldar, ya no estás revisando. Estás esperando que salga bien.**

## Buena entrada, buena salida

El modelo mental humano sigue participando, pero en lugar de estar en el medio, está al principio y al final. Pones tu energía en la parte delantera, en la descripción de la tarea y el contexto, y en la parte trasera, en revisar la salida. Por eso una buena entrada es tan importante para la calidad de la salida, y considero que escribir buenos prompts es una habilidad de pensamiento crítico.

Antes, si hacías una petición poco concreta, alguien la cuestionaba y quizá te dabas cuenta de que "ah, espera, en realidad no tenía esto resuelto". Un agente muchas veces no te frena ahí. Rellena lo que dejaste fuera y te devuelve algo que parece terminado, aunque la idea de fondo siga siendo difusa. He escrito sobre esto con el nombre de [intent debt](https://oreillyradar.substack.com/p/the-intent-debt) (deuda de intención): los objetivos, restricciones y razones implícitos que pueden existir en artefactos que no escribiste tú. A diferencia de otras deudas, esta nadie puede saldarla por ti. La intención tiene que salir de ti.

**Tu prompt refleja cuánto entiendes el problema. Si no puedes expresarlo con claridad, puede que tampoco esté claro en tu cabeza.** Antes de pedir ayuda, escribe con tus propias palabras un resumen de la petición. Describe el público, lo que queda fuera del alcance y la definición de terminado. Si tu segunda ronda de correcciones no te ha llevado adonde querías, deja de retocar y reescribe el prompt.

También puedes pedirle ayuda al agente para esto. Me gusta la distinción que hace Andy Clark entre delegar en un sistema de IA y [colaborar](https://pubmed.ncbi.nlm.nih.gov/40389440/) con él. En la colaboración entras en un círculo virtuoso de amplificación mutua: tus prompts afinan la salida, esa salida afina tu siguiente prompt y también tu modelo mental del problema. Si no lo tienes claro, pídele al agente que te entreviste sobre lo que no entiende. Si cierras la sesión con tu modelo mental más afinado, es señal de éxito.

Ten cuidado también con la entrada. Es fácil que cada agente reciba como contexto solo el resumen del agente anterior. Y antes de que te des cuenta, el tercer agente no ha leído nunca el documento original.

También necesitas tus propios estándares para la salida. He experimentado con la IA en muchos medios creativos distintos, y la mayor parte nunca se la he enseñado a nadie porque no alcanza mi nivel. Todo sale con un formato pulido y un tono seguro, así que el acabado ya no es una señal útil. **Puede que la IA haya hecho más rápido producir. Pero si no me sentiría cómodo atribuyéndome el resultado, no lo publico.**

Cuando algo no alcanza tu nivel, anota por qué en una configuración compartida, un hook o un test para que no vuelva a pasar. Así es como se acumula el buen gusto. Y anotar por qué algo no pasó el corte es, en sí mismo, una buena práctica.

## "Pero los modelos lo harán mejor que yo"

Si eres tan optimista sobre el futuro de este campo como mucha gente a mi alrededor, probablemente hayas tenido este pensamiento durante las últimas secciones. Dentro de un año o dos, el modelo podrá detectar lo que yo sería capaz de detectar, así que ¿para qué molestarme en mantener esa habilidad?

Puede que tengas razón en buena parte de esa detección, y yo mismo he defendido pasar cada vez más detección a los agentes. Pero esta es la razón por la que creo que sigue importando: al final del día, alguien es responsable de lo que se publica. Por mucho que haya ayudado la IA, [una persona tiene que asumir la responsabilidad](https://addyo.substack.com/p/code-review-in-the-age-of-ai).

Cuánto confiar en un agente para una tarea concreta es, en sí mismo, una cuestión de criterio. Parte de mantener ese criterio calibrado es revisar el trabajo, porque los puntos en los que se equivocan los modelos no dejan de cambiar. La propia investigación de Anthropic sobre sus ingenieros e investigadores [señala esta trampa](https://www.anthropic.com/research/how-ai-is-transforming-work-at-anthropic) y la llama paradox of supervision (paradoja de la supervisión): "supervisar a Claude requiere precisamente las habilidades de programación que pueden atrofiarse por el uso excesivo de la IA".

Hay cosas que para mí son lo más importante y que un modelo mejor no va a resolver: qué estás construyendo, por qué vale la pena, a quién afecta y qué estás dispuesto a sacrificar. Todas son preguntas que tienes que responder tú. Un agente puede ayudarte a trabajarlas, y me gustaría que lo hiciera, pero al final siguen siendo tuyas. **Puedes delegar el trabajo y gran parte de la revisión. Pero no la responsabilidad.**

## Prácticas para el día a día

No necesitas hacer todo esto con rigor. Basta con incorporar lo que encaje en tu forma de trabajar.

Una vez a la semana, escribe un poco de código sin agente, o haz tú mismo algo real que sería un problema olvidar cómo se hace (lo he llamado calibration exercise (ejercicio de calibración), pero no lo digo en tono de sermón). Una vez al mes, anota lo que has dejado de hacer y decide cuáles de esas cosas te parece bien no hacer. [Una pregunta de una entrada antigua de mi blog](https://addyo.substack.com/p/avoiding-skill-atrophy-in-the-age) sigue tan vigente como siempre: ¿cuán perdido estarías si la IA no existiera?

Si algo está por encima de tu comprensión, ve a aprenderlo. Si estoy escribiendo y me encuentro con una expresión que no había visto antes, podría buscar en Google una explicación de una línea e incluirla. Prefiero investigar un poco para entenderla bien. Así veo dónde encaja.

Comprobar bien lo que hizo la máquina es trabajo real, y fingir lo contrario es la forma en que los equipos acaban por no hacerlo. No es gratis, así que agéndalo como una partida más. Así lo harás de verdad.

Las habilidades que dejas de ejercitar desaparecen, probablemente más rápido de lo que crees. Sigue practicando las que no estás dispuesto a soltar.

## Qué llevarte

- **Sé intencional**: Un agente puede ponerte a prueba, entrevistarte y mostrarte su evidencia, pero solo si lo configuras así. Así que configúralo.
- **Sé honesto sobre tu lugar en el espectro**: Si no puedes explicar la respuesta, ni siquiera con ayuda de un agente, te has rendido ante ella.
- **Ten una hipótesis**: Formula una antes de preguntar, aunque sea mala.
- **Un check verde significa una sola cosa**: ¿Qué comprobó? ¿Qué no comprobó?
- **Busca la evidencia**: Lee qué ejecutó y qué devolvió antes de leer el resumen.
- **Lee para saber qué decisiones tomó**: ¿Qué decidió por ti?
- **Cuida tu prompt**: Cómo escribes el prompt muestra cuánto entendiste el problema.
- **Pon un listón y mantenlo**: Si no pondrías tu nombre en ello, no sale.

Sigue en el juego aplicando tú mismo las habilidades que importan. Algo que podrías probar: antes de preguntar, anota qué crees que va a pasar y, cuando el agente termine, anota una cosa que no comprobó. Cuéntame si eso cambia tu forma de leer la salida. Piensa de forma independiente. Haz mejores preguntas. Responsabilízate del resultado.

## Mi opinión

Está claro que la IA importa. Aun así, lo que quiero elegir primero ahora no es ampliar mi stack tecnológico, sino desarrollar la capacidad de pensar y los criterios con los que juzgo.

La cognitive surrender de la que advierte el autor consiste en entregarle tu juicio a un agente. Yo también uso activamente la IA y las herramientas de automatización, pero quiero usarlas para que mi pensamiento sea más productivo, no para delegar el pensamiento en sí. Escribí aparte por qué fijé esta prioridad en [El proceso de demostrar mi forma de pensar](/261103).
