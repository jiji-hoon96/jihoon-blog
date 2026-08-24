---
emoji: 🗣️
title: 'Linguagem compartilhada'
seoTitle: 'Comunicação entre áreas: ubiquitous language e grounding de requisitos'
date: '2026-07-23'
categories: colaboração domínio DDD comunicação
description: 'O que fazer quando product manager e developer usam a mesma palavra para coisas diferentes? Com a ubiquitous language de Evans e a teoria de grounding de Clark, examino a estrutura das falhas de comunicação entre áreas e as ferramentas práticas para alinhar a resolução.'
keywords: 'ubiquitous language, linguagem compartilhada domínio, comunicação entre áreas, como levantar requisitos, comunicação product manager developer, grounding common ground, Example Mapping, breadboarding, bounded context, segurança psicológica time de desenvolvimento'
locale: pt-BR
translationOf: '260723'
sourceHash: 1989680dd39ccc57941bfc61de1121dc3530540450048f9741bf0fc29267069a
---

Neste post, quero falar sobre a comunicação com outras áreas.

Enquanto desenvolvo, dedico tanto tempo a descobrir o que precisa ser construído quanto a escrever código. Troco requisitos com o product manager, alinho telas com o designer e pergunto a quem conhece o domínio o que cada termo significa. E já vivi algumas vezes que o custo de esse processo sair do lugar é muito maior do que o custo de escrever o código errado.

Recentemente li [As atividades cotidianas de um líder de engenharia](https://softwareleads.substack.com/p/engineering-leaders-day-to-day-activities), escrito por James Samuel. O autor divide o trabalho de um líder em seis frentes, e a primeira que ele trata é a coleta de informação. A razão é que toda decisão, toda direção e toda ação dependem de um entendimento preciso do que está acontecendo agora.

![1.png](1.png)

Eu quero assumir um papel de liderança algum dia, mas o que me ocorreu ao ler essa passagem foi um pouco diferente. **Se a primeira coisa que um líder trata é coletar informação, o correspondente disso para quem está na execução é entender requisitos.** O jeito como lido com requisitos hoje será o jeito como vou lidar com a informação de uma organização depois.

Não é minha intenção falar de liderança neste texto. Falo do que eu vinha fazendo errado ao me comunicar com outras áreas na posição em que estou e do que posso usar como ferramenta. Começando pela conclusão: passei a achar que esse problema não é só uma questão de atitude. Existe uma formulação alternativa disponível, chamada ubiquitous language, e vale a pena ver do que se trata.

## A mesma palavra, significados diferentes

No artigo sobre [Bounded Context](https://martinfowler.com/bliki/BoundedContext.html), Martin Fowler dá o exemplo de uma companhia elétrica. Boa parte dos desalinhamentos que vivi tinha esse formato.

::::quote
:::translation
Aqui a palavra “meter” significava coisas sutilmente diferentes em partes distintas da organização: era a conexão entre a rede e um local, entre a rede e um cliente, ou o medidor físico em si?
:::

:::original
here the word 'meter' meant subtly different things to different parts of the organization: was it the connection between the grid and a location, the grid and a customer, the physical meter itself
:::
::::

A mesma palavra, “meter”, significava coisas sutilmente diferentes conforme a área da organização. E Fowler acrescenta que essa confusão não é um acaso daquele caso específico: diz ter visto a mesma confusão se repetir com palavras polissêmicas como Customer e Product.

**Isso não aconteceu porque os participantes eram ruins de reunião.** Quando uma organização contém contextos diferentes, é natural que a mesma palavra se divida, e deixar isso correr acaba dividindo também o código.

O pano de fundo técnico dessa história eu tratei uma vez em [Modelo de domínio](/260418). Naquele texto falei de como expressar o modelo dentro do código. Neste, trato da etapa anterior à existência desse modelo, a da conversa entre pessoas.

## Uma palavra com dois significados

Mas por que isso se repete de forma estrutural? Há duas linhas de explicação.

Uma vem da estrutura organizacional. O artigo [How Do Committees Invent?](https://melconway.com/Home/Committees_Paper.html), que Mel Conway publicou na Datamation em 1968, afirma que, na medida em que uma organização não consegue mudar com flexibilidade sua estrutura de comunicação, essa organização carimba a própria imagem em todos os artefatos de design que produz. A frase única normalmente citada como lei de Conway é, na verdade, uma formulação que o próprio autor elaborou mais tarde, e essa descrição do texto de 1968 me parece mais direta.

O que li em chave prática nessa frase é a expressão “carimba”. Significa que a divisão dos termos não termina na conversa, mas **permanece nos artefatos**. O “meter” acima é exatamente isso. Se cada um constrói mantendo um entendimento diferente do escopo de “meter”, essa diferença não fica na ata da reunião, e sim nos nomes de tabela, nos campos da resposta da API e nos textos da tela. E a partir daí o custo de corrigir não tem comparação com o custo de ter mais uma conversa.

É aqui que se separa o que quem está na execução pode e não pode fazer. Mudar a estrutura de comunicação da organização foge ao alcance de quem executa. Mas **tornar visíveis as fronteiras dos termos** é possível a partir do lugar em que você está hoje. Consiste em anotar qual é o escopo de uma palavra neste documento e explicitar quando ela difere da palavra usada por outro time. Todas as ferramentas que veremos adiante são dispositivos que facilitam esse trabalho.

A outra explicação é um pouco mais fundamental. Do ponto de vista da ciência cognitiva, a colaboração só se sustenta sobre um pano de fundo compartilhado. [Grounding in Communication](https://web.stanford.edu/~clark/1990s/Clark,%20H.H.%20_%20Brennan,%20S.E.%20_Grounding%20in%20communication_%201991.pdf), escrito por Herbert Clark e Susan Brennan em 1991, começa com o exemplo de um dueto de piano. Os dois instrumentistas não conseguem nem começar a se coordenar sem pressupor uma quantidade enorme de informação compartilhada, ou seja, common ground. Aqui common ground significa conhecimento mútuo, crenças mútuas e pressupostos mútuos. E os autores afirmam com firmeza que toda ação coletiva é construída sobre o common ground e sobre seu acúmulo.

A perspectiva a que cheguei depois de colocar essas duas linhas lado a lado é esta. **Os termos divergirem não é acidente, é o estado padrão.** Estar alinhado é a exceção, o estado que precisa ser mantido a um custo. Então a pergunta prática passa a ser quem paga esse custo e como.

## Vigilância ativa

Em Domain-Driven Design, publicado em 2003, Evans apresenta um padrão chamado ubiquitous language, ou **linguagem compartilhada**. Costuma ser resumido como pouco mais que “developers e especialistas de domínio devem usar os mesmos termos”, mas, lendo o livro original, a prescrição é bem mais concreta. Ele pede que o time tome o modelo como espinha dorsal da linguagem e se comprometa a usar essa linguagem de forma persistente em toda a comunicação do time e no código. E a frase que vem em seguida foi a mais importante para mim.

::::quote
:::translation
Os especialistas de domínio contestam termos ou estruturas que sejam desajeitados ou inadequados para transmitir o entendimento do domínio, enquanto os developers ficam atentos a ambiguidades ou inconsistências que vão derrubar o design.
:::

:::original
Domain experts object to terms or structures that are awkward or inadequate to convey domain understanding, while developers watch for ambiguity or inconsistency that will trip up design.
:::
::::

Os especialistas de domínio contestam termos e estruturas desajeitados ou insuficientes para transmitir o entendimento do domínio, e **os developers vigiam a ambiguidade ou inconsistência que vai derrubar o design**.

Ao ler essa frase, corrigi meu entendimento do próprio papel. Até então eu me via como receptor nas reuniões de requisitos. Achava que meu trabalho era receber com exatidão o que o produto decidisse e implementar. Mas a parte que Evans atribui ao developer não era a recepção. **É encontrar a ambiguidade e devolvê-la.** Isso não é cooperação passiva, é vigilância ativa.

(A propósito, Fowler traduziu essa frase no próprio artigo como “Domain experts **should** object ... developers **should** watch”. O livro original não tem verbo modal. É uma diferença pequena, mas o original se lê de forma mais categórica: o tom não é que seria bom fazer assim, e sim que fazer assim é a definição do padrão.)

Então como se encontra a ambiguidade? Evans também responde: usar os termos repetidamente na conversa é o que revela as diferenças de interpretação. Eu li essa frase assim. A ambiguidade não é algo que se acha lendo documentos com lupa. Por mais cuidadosa que seja a leitura de uma especificação, o fato de “meter” ter vários significados não aparece. Essa palavra precisa ser usada repetidamente contra casos concretos para se dividir. O momento em que surge uma pergunta como “o que as outras pessoas entendem por meter?” é exatamente esse ponto.

## O princípio do mínimo esforço colaborativo

Podemos conhecer esse método e ainda assim não praticá-lo. Então por que não perguntamos repetidamente?

Voltemos ao artigo de Clark e Brennan. Os autores dão o nome de grounding ao processo de transformar o que foi dito em parte do common ground. E propõem um princípio sobre como as pessoas se comportam nesse processo: o princípio do mínimo esforço colaborativo (the principle of least collaborative effort). Ele nasce da observação de que as pessoas não gostam de trabalhar mais do que o necessário.

Aqui vem a passagem importante.

::::quote
:::translation
Pelo princípio do mínimo esforço colaborativo, as pessoas deveriam tentar fazer grounding com o menor esforço conjunto necessário. Mas o que exige esforço muda dramaticamente conforme o meio de comunicação.
:::

:::original
By the principle of least collaborative effort, people should try to ground with as little combined effort as needed. But what takes effort changes dramatically with the communication medium.
:::
::::

**O ponto em que o esforço recai muda dramaticamente conforme o meio.** Uma técnica de confirmação disponível em um meio pode ser simplesmente impossível em outro ou, sendo possível, muito mais cara. Os autores apontam em especial que, em meios nos quais o interlocutor não recebe o que foi dito de imediato, o custo de contar que outra pessoa corrija o mal-entendido fica muito alto, então quem fala tende a evitá-lo.

Vale registrar uma coisa aqui. Esse artigo foi escrito em 1991, e os meios comparados pelos autores são a conversa presencial, o telefone, cartas e secretária eletrônica. **Ele não trata de Slack nem de Notion.** O arcabouço de que o custo de grounding varia conforme o meio é dos autores; aplicá-lo aos canais de trabalho assíncronos de hoje é interpretação minha.

Aplicando assim, fica explicado por que eu não perguntava repetidamente. Num ambiente em que você recebe a especificação como texto e confirma como texto, mandar uma mensagem de confirmação a cada ponto ambíguo é caro. Você não sabe quando virá a resposta e teme que perguntar várias vezes faça você parecer alguém que não entendeu. Então a pessoa naturalmente escorrega para a própria interpretação.

Convém separar duas forças aqui. Uma é que o meio encarece a confirmação, e isso é o que dizem Clark e Brennan. A outra é o receio de parecer incompetente por perguntar várias vezes, e isso não é o que o princípio deles prevê, mas pertence à discussão sobre segurança psicológica que vem adiante. Com precisão: o que o princípio do mínimo esforço colaborativo prevê é que **você escolherá um jeito mais barato de confirmar**, não que deixará de confirmar. Abandonar a confirmação e partir para o palpite não é o princípio operando, é o grounding falhando. E o fato de que aquela interpretação estava errada aparece só depois que a implementação termina.

## Chegar a um nível suficiente

Então é preciso perguntar sobre cada ambiguidade? Não é realista, e nunca vi ninguém fazer isso. O artigo também oferece um critério para essa pergunta: o grounding criterion. Ele designa o estado em que ambas as partes acreditam mutuamente que o ouvinte entendeu o que o falante quis dizer **num nível suficiente para o propósito atual**. Os autores o antecedem com a observação de que a compreensão perfeita é impossível desde o início.

O motivo de esse critério ter me parecido prático é que ele baixa a meta. Não é preciso entender os requisitos perfeitamente. **Basta poder confiar mutuamente que vocês se entendem o suficiente para o que estão prestes a fazer.** E os autores dizem que, se o propósito muda, o critério precisa mudar junto.

Na prática, isso vira o critério para calibrar a intensidade da confirmação. Se numa sessão que ainda explora direção você fica preso em “o que meter significa aqui?”, a conversa não anda. O que se precisa nessa etapa é acordo sobre o que se quer fazer e por quê, não a definição dos valores de fronteira. Ao contrário, pouco antes de entrar na implementação essa pergunta tem obrigatoriamente que surgir. Aí é preciso poder confiar que os dois lados estão imaginando o mesmo escopo para “meter”; se não, o código se acumula sobre uma premissa errada.

Por isso, diante da mesma ambiguidade, **eu a trato de forma diferente conforme a etapa em que estou.** Na etapa de exploração eu anoto numa lista e sigo; pouco antes de implementar eu abro essa lista e fecho os itens um a um. Adiar a confirmação e abandonar a confirmação são coisas distintas.

Há uma ferramenta que combina bem neste ponto. Team Topologies, de Matthew Skelton e Manuel Pais, distingue três modos de interação entre times: collaboration, quando por um período definido se descobre algo novo em conjunto; X-as-a-Service, quando um lado provê e o outro consome; e facilitation, quando um lado ajuda e mentora o outro.

Na origem é uma discussão sobre design organizacional, mas achei prático reduzi-la à escala de uma reunião. **Se cada um acredita que esta conversa está num modo diferente, a reunião sai dos trilhos.** Se o product manager acha que é uma sessão para comunicar o que já foi decidido enquanto o developer acha que é uma sessão para descobrir junto, as perguntas do developer soam como implicância, não como colaboração. O contrário também acontece. Se o developer veio receber uma especificação fechada e o product manager ainda estava explorando, o developer se frustra porque não há especificação.

Por isso, ultimamente eu confirmo isso logo no começo da reunião: “isto ainda está aberto ou é uma sessão para confirmar o que já foi decidido?”. Essa única pergunta muda o caráter de tudo o que vem depois. É a mesma coisa que ajustar o grounding criterion ao propósito.

## Quando a resolução não bate, a conversa gira em falso

Mesmo com o modo alinhado, um problema permanece. Outro desalinhamento que vivi com frequência foi falar em **resoluções** diferentes.

Requisitos entregues em prosa pelo product manager costumam ser abstratos demais. De uma frase como “para que o usuário consiga conferir com facilidade o histórico de reservas” não se extrai quantas telas existem nem o que leva a onde. Ao contrário, o layout do designer é concreto demais. Cor de botão e espaçamento já estão definidos, o que torna difícil discutir justamente se este fluxo está certo.

![2.png](2.png)

Shape Up, escrito por Ryan Singer na Basecamp, aponta esse problema com precisão: começar por wireframes ou layouts visuais concretos prende você em detalhes desnecessários e impede explorar tão amplamente quanto é preciso. Por isso [o que Shape Up propõe](https://basecamp.com/shapeup/1.3-chapter-04) é uma representação intermediária. Chama-se breadboarding e toma o conceito emprestado da engenharia elétrica. Um breadboard é um protótipo que tem todas as peças e a fiação do aparelho real, mas nenhum design industrial. Por isso se desenham exatamente três coisas: os lugares para onde se pode navegar (places), aquilo que o usuário pode acionar (affordances) e as linhas de conexão que mostram para onde essa ação leva o usuário (connection lines).

O motivo de eu ter gostado dessa técnica é que ela é um artefato que o developer consegue produzir. Em vez de pedir ao product manager que escreva com mais detalhe ou de esperar o layout do designer, você desenha ali mesmo o fluxo como o entendeu e devolve com um “entendi assim, está certo?”. É um jeito concreto de executar a vigilância de que Evans falava, a de devolver a ambiguidade. E, pela lente da seção anterior, é um dispositivo que barateia o grounding. Um desenho substitui várias rodadas de confirmação por texto.

Mas essa resolução é mais difícil de sustentar do que parece. Ao desenhar o fluxo, você desce naturalmente para coisas como “não seria melhor colocar este botão embaixo à direita?”. Comigo aconteceu algumas vezes. Uma vez que você desce assim, a pergunta que estava em discussão, ou seja, se este fluxo está certo, some em silêncio. Se você define a posição dos botões enquanto o fluxo ainda não está fechado, toda aquela discussão é jogada fora por inteiro quando o fluxo mudar depois.

Por isso, nesta etapa, tento manter **um desenho deliberadamente ruim**. Se há apenas retângulos, setas e nomes, a outra pessoa nem cogita apontar detalhes e responde só ao fluxo. O baixo acabamento do desenho é, nesta ferramenta, uma funcionalidade. (Segurar a vontade de desenhar bonito é mais difícil do que parece)

Que o próprio nível de abstração possa ser uma ferramenta de colaboração se conecta ao que tratei em [Abstração](/260201). Lá eu falava do nível de abstração do código; na conversa existe a mesma coisa.

## Separar regras, exemplos e perguntas

Outra maneira de alinhar a resolução é estruturar a própria discussão.

Vejamos o [Example Mapping](https://cucumber.io/blog/bdd/example-mapping-introduction/), apresentado em 2015 por Matt Wynne, que liderou o projeto Cucumber. Ele diagnostica que a razão de muitos times terem dificuldade com discussões de requisitos é a falta de estrutura, que as torna longas e entediantes. E por isso os times deixam de fazê-las com regularidade e com consistência. Comigo era exatamente assim: quando uma reunião de requisitos se alonga, na próxima você tenta terminar rápido, e terminando rápido as ambiguidades ficam como estavam.

O Example Mapping divide a discussão em cartões de quatro cores. O amarelo é a história em pauta, o azul é a regra ou critério de aceitação, o verde é o exemplo concreto que ilustra essa regra e o vermelho é a pergunta cuja resposta ninguém sabe.

Entre eles, **acho que o cartão vermelho é o essencial.** Os outros três são técnicas de organização, mas o vermelho é o dispositivo que transforma o “não sei” em um produto oficial da reunião. Dizer que não sabe deixa de ser um ato que atrasa a reunião e passa a ser um resultado que a reunião deve produzir.

Por que isso importa fica claro ao imaginar o caso oposto. Numa reunião sem cartões vermelhos, esbarrar num ponto ambíguo deixa duas opções: insistir agora e esticar a reunião, ou seguir em frente e interpretar sozinho depois. Como vimos na seção anterior, as pessoas em geral escolhem a segunda. Mas com um cartão à mão surge uma terceira opção. **Anotar e seguir, sem deixar que aquilo desapareça.** A reunião continua andando, e a ambiguidade fica numa lista em vez de sumir.

O cartão verde cumpre papel parecido. Quando só a regra é escrita, todo mundo concorda; no momento em que alguém tenta escrever um exemplo concreto que a ilustre, as interpretações se separam. É o “usar os termos repetidamente na conversa revela as diferenças”, de Evans, transposto para o formato de reunião. Se você pede três exemplos por regra, em um deles costuma aparecer um “peraí, e neste caso, como fica?”. (Pela minha experiência, a reunião em que essa pergunta não aparece não é uma reunião em que todos entenderam, e sim uma em que cada um entendeu de um jeito)

Com uma ideia parecida existe também o Three Amigos, usado há tempos no meio de BDD. A proposta é que as três perspectivas de negócio, desenvolvimento e teste façam cada uma uma pergunta diferente, e o [glossário da Agile Alliance](https://www.agilealliance.org/glossary/three-amigos/) organiza essas perguntas como qual problema se está tentando resolver, como construir uma solução para resolvê-lo e, quanto a isto, o que poderia acontecer. O que acontece com uma reunião em que a terceira pergunta nunca aparece provavelmente não precisa de explicação.

## Crie um processo para verificar o que não se sabe

Mas por que temos tanta dificuldade de puxar o cartão vermelho? Aqui não dá para desviar do assunto da segurança psicológica.

O [artigo](https://web.mit.edu/curhan/www/docs/Articles/15341_Readings/Group_Performance/Edmondson%20Psychological%20safety.pdf) que Amy Edmondson publicou na Administrative Science Quarterly em 1999 é o estudo que estabeleceu formalmente o conceito de segurança psicológica de time. (O próprio artigo aponta como raiz o trabalho de Schein e Bennis de 1965.) Ele define segurança psicológica de time como a crença compartilhada de que o time é um lugar seguro para assumir riscos interpessoais. Dizer que não sabe, discordar e admitir um erro entram aí. O artigo pesquisou 51 times de uma empresa industrial e mostrou que a segurança psicológica se associa ao comportamento de aprendizado e que esse comportamento medeia a relação entre segurança psicológica e desempenho do time.

Mas a frase que achei mais prática nesse artigo não foi a definição, e sim a que vem logo depois.

::::quote
:::translation
Na maior parte das vezes, essa crença tende a ser tácita: é tomada como dada e não recebe atenção direta nem dos indivíduos nem do time como um todo.
:::

:::original
For the most part, this belief tends to be tacit—taken for granted and not given direct attention either by individuals or by the team as a whole.
:::
::::

Essa crença costuma ser **tácita**, e nem os indivíduos nem o time lhe dão atenção direta.

Daqui em diante é conjectura minha. O que o artigo diz vai até a crença ser tácita; a prescrição de que, portanto, basta criar um formulário não está no artigo. Dito isso, já vi várias vezes que o tácito não muda por declaração. Dizer “nosso time é um time em que dá para perguntar o que você não sabe” não muda grande coisa sozinho. Por isso acho que o cartão vermelho da seção anterior importa. **Se você transforma o “não sei” em um campo dentro de um formulário, preenchê-lo vira procedimento em vez de coragem.**

Cabe uma objeção, claro. Num time que não é seguro, o campo do cartão vermelho vai simplesmente ficar vazio. É uma crítica justa, e não pretendo afirmar que esta ferramenta cria segurança. Mas, se o campo existe, ao menos **o fato de estar vazio se torna visível.** Cria-se um lugar para perguntar se está vazio porque ninguém tem dúvida ou porque é difícil falar.

![3.jpg](3.jpg)

A mesma ideia está incorporada em formatos de documento reais. Olhando o [Bounded Context Canvas](https://github.com/ddd-crew/bounded-context-canvas) criado pela comunidade de DDD, é uma ferramenta colaborativa para projetar e documentar um contexto, e a composição dos campos é interessante. Nome e propósito, classificação estratégica, papel no domínio, comunicação de entrada e de saída, e então **Ubiquitous Language**, decisões de negócio, **Assumptions**, métricas de verificação e **Open Questions**.

Há um campo separado para escrever a linguagem compartilhada, outro para os pressupostos e outro para as perguntas em aberto. A descrição do canvas diz que o próprio ato de escrever o propósito força um pensamento nebuloso a ser dito com clareza e coloca o time inteiro na mesma página.

Acho que essa é a abordagem mais realista para problemas de comunicação. Em vez de tentar mudar a atitude das pessoas, **criar um campo para aquilo que é difícil de dizer.** Uma boa estrutura não exige que as pessoas façam bem, ela torna fácil fazer bem.

## Por que isso não é questão de gosto

Chegando aqui, cabe uma reação: bonito, mas no fim das contas é “vamos nos comunicar com empenho”, não? E isso não é traço de personalidade?

Também pensei assim por um tempo. Mas sobre essa parte existem dados.

![4.png](4.png)

Quando a DORA trata de cultura organizacional, ela toma emprestada a classificação do sociólogo Ron Westrum: pathological, orientada a poder; bureaucratic, orientada a regras; e generative, orientada a resultado. E [a documentação oficial da DORA](https://dora.dev/capabilities/generative-organizational-culture/) resume assim os próprios achados.

::::quote
:::translation
Uma cultura organizacional de alta confiança que enfatiza o fluxo de informação é preditiva do desempenho de entrega de software.
:::

:::original
organizational culture that is high-trust and emphasizes information flow is predictive of software delivery performance
:::
::::

Uma cultura organizacional de alta confiança que **enfatiza o fluxo de informação** prediz o desempenho de entrega de software. Não é dizer que times que se comunicam bem ficam de bom humor, e sim que essa é uma variável que se move junto com o desempenho.

Dito isso, “predizer” não deve ser lido aqui como causalidade. Os dados da DORA vêm de uma pesquisa em que os mesmos respondentes responderam sobre cultura e sobre desempenho, e é uma correlação em nível organizacional. Permanece a possibilidade de quem está satisfeito com a organização ter avaliado bem os dois lados, e de uma relação em nível organizacional não decorre imediatamente uma prescrição de como um indivíduo deve agir. Então o material permite dizer até aqui: o fluxo de informação não mora só no terreno do gosto, ele está num lugar em que se move junto com o desempenho.

O mesmo documento também organiza as três propriedades da boa informação segundo Westrum: ela responde à pergunta de que quem recebe precisa, chega no momento adequado e é apresentada de um jeito que quem recebe consegue usar com eficácia. Vale reparar que as três colocam o critério em **quem recebe**. Compartilhar muito não é o que faz um fluxo de informação ser bom.

O Project Aristotle do Google é outra fonte citada com frequência. Segundo [o que foi publicado no reWork](https://rework.withgoogle.com/intl/en/guides/understand-team-effectiveness), foram estudados 180 times, rodados mais de 35 modelos estatísticos sobre centenas de variáveis, e apresentados cinco fatores que influenciam a efetividade do time: segurança psicológica, confiabilidade, estrutura e clareza, significado e impacto. E a conclusão foi que importou mais como aquele time trabalhou junto do que quem estava nele.

Ainda assim, quero registrar uma coisa. A página oficial declara que lista os cinco fatores em ordem de importância e coloca a segurança psicológica em primeiro. Mas expressões de magnitude do tipo “primeiro de forma esmagadora”, que aparecem com frequência em textos que citam essa pesquisa, não estão naquela página. Haver uma ordem e um fator dominar os demais são coisas diferentes. Por isso este texto não afirma nada sobre magnitude. Para defender a importância da segurança psicológica, o preciso é se apoiar no artigo original de Edmondson, da seção anterior.

## De volta ao assunto da liderança

Voltemos ao artigo citado no começo.

Ao tratar da coleta de informação em primeiro lugar, James Samuel diz que os métodos da fase de execução deixam de funcionar. Como contribuidor individual você tem o quadro completo do próprio trabalho, mas, ao assumir responsabilidade sobre pessoas, não dá mais para usar o método anterior. Por isso ele aponta como capacidade necessária a de filtrar o ruído e sintetizar a informação num quadro coerente da realidade, porque nenhum gestor consegue processar tudo.

Senti que isso é o mesmo que as três propriedades da boa informação de Westrum que vimos antes. Não se trata de coletar muito, e sim de transformar em algo utilizável. E isso não é diferente do que estou fazendo agora ao lidar com requisitos. Separar as partes ambíguas das frases de uma especificação, redesenhá-las como breadboard para confirmar e deixar o que não se sabe como cartão vermelho é exatamente o exercício de filtrar ruído e montar um quadro coerente.

O que o autor deixou sobre tomada de decisão também ficou comigo: esperar por certeza é, em si, uma decisão e carrega um custo. Esperar até que os requisitos fiquem completamente claros é a mesma coisa. Por isso o grounding criterion, suficiente para o propósito atual em vez de compreensão perfeita, se torna o critério prático.

## Conclusão

Resumindo.

A falha de comunicação com outras áreas em geral não é só uma questão de atitude. Quando uma organização contém contextos diferentes, a mesma palavra se dividir é o estado padrão, e estar alinhado é a exceção que precisa ser mantida a um custo. A forma de pagar esse custo é a linguagem compartilhada, e dentro dela o papel do developer não é transcrever requisitos, e sim vigiar a ambiguidade e devolvê-la.

Mas devolver dá trabalho, e as pessoas tentam minimizar esse trabalho. Então, em vez de me apoiar na força de vontade, decidi usar três coisas: confirmar primeiro em que modo está esta conversa, desenhar o fluxo na resolução entre a prosa e o layout e devolvê-lo, e criar dentro do formato de reunião um campo para anotar o que não se sabe. Nenhuma das três exige corrigir a atitude; as três tornam a coisa certa mais fácil de fazer.

Ainda não sou líder, e nada do que escrevi aqui foi verificado a partir daquele lugar. Com outro tamanho de time ou outra cultura organizacional, algumas coisas não vão funcionar. Mas há uma de que acho que posso ter certeza agora. O jeito como vou lidar com informação depois não será algo aprendido do zero, e sim o hábito com que hoje lido com requisitos, crescido em escala. Por isso ultimamente tento ter menos vergonha do que antes de perguntar numa reunião “o que você quer dizer com isso?”.

Se para quem lê este texto vier à cabeça alguma palavra de uma reunião recente com a qual você concordou balançando a cabeça sem estar realmente certo, recomendo usar essa palavra mais uma vez na próxima. Usando repetidamente, ela aparece.

:::ref
- [article] [Martin Fowler, Ubiquitous Language](https://martinfowler.com/bliki/UbiquitousLanguage.html)
- [docs] [Eric Evans, Domain-Driven Design Reference](https://www.domainlanguage.com/ddd/reference/)
- [docs] [Team Topologies, Key Concepts](https://teamtopologies.com/key-concepts)
- [docs] [Basecamp, Shape Up: Set Boundaries](https://basecamp.com/shapeup/1.2-chapter-03)
- [article] [Alberto Brandolini, EventStorming](https://www.eventstorming.com/book/)
- [article] [Stefan Hofer, Henning Schwentner, Domain Storytelling](https://domainstorytelling.org/)
- [article] [Gojko Adzic, Specification by Example](https://gojko.net/books/specification-by-example/)
:::
