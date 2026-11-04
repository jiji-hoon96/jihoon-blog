---
emoji: 🧠
title: '[Tradução] Pensamento crítico na era dos agentes'
seoTitle: 'Addy Osmani: pensamento crítico e cognitive surrender com IA'
date: '2026-11-04'
categories: IA Ferramentas-de-desenvolvimento Claude
description: 'Tradução do artigo de Addy Osmani sobre manter o próprio julgamento com agentes de IA: o que se perguntar, desconfiar do check verde e práticas semanais.'
keywords: 'Addy Osmani, pensamento crítico e IA, cognitive surrender, rendição cognitiva, agentes de programação com IA, agentic workflow, Claude Code, revisar código gerado por IA'
locale: pt-BR
translationOf: '261104'
sourceHash: 26591e56156e613f37332d39b3618e56e6fcfc88f69f45ecb4530731e5e44ed3
---

Neste post, quero traduzir o artigo de Addy Osmani [Critical thinking when agents do the work](https://x.com/addyosmani/status/2117512471930167377).

Ele é para desenvolvedores que passam cada vez mais código e documentos para agentes, mas não têm certeza de que realmente leem o que volta. O texto não defende delegar menos. Ele trata das seis perguntas que o autor faz a si mesmo para não perder o julgamento enquanto delega, de um hábito de verificação que não aceita o check verde ao pé da letra e de práticas que você pode fazer toda semana e todo mês.

Addy Osmani trabalhou mais de 14 anos no Google, onde liderou a experiência de desenvolvedor do Chrome, do DevTools, do Lighthouse e dos Core Web Vitals, e é autor de "Learning JavaScript Design Patterns". Hoje ele constrói o Claude Code na Anthropic. O original foi publicado como artigo no X em 3 de novembro de 2026.

Mantive os termos no idioma original. Para conceitos que o autor toma emprestados de outros pesquisadores, como cognitive surrender, acrescentei uma explicação só na primeira aparição. Mantive os links do original e coloquei cada destino uma única vez. Conferi de novo na fonte a redação de cada frase citada. Daqui para baixo vem a tradução do original, e o "eu" do texto é o autor.

## Por que o pensamento crítico ficou mais difícil

Antigamente, pensamento crítico era ensinado assim: encarar informações novas com curiosidade humilde e uma dose saudável de ceticismo, ouvir pontos de vista diferentes e formar a própria opinião. Continua valendo. Mas **agora que boa parte do meu trabalho passa por agentes, cada vez menos coisas no meu dia a dia me obrigam a pensar criticamente.** Para os engenheiros e o pessoal de produto que embarcaram de vez nos agentic workflows (os que rodam várias sessões em paralelo e esperam que os modelos continuem melhorando), quero dizer uma coisa logo de início: eu adoro essas ferramentas. Não estou escrevendo isto para defender que a gente use menos agentes.

Meu objetivo é ajudar você a manter o pensamento crítico num mundo em que é fácil passar qualquer coisa para um agente.

No passado, a maior parte do nosso processamento cognitivo e estético acontecia no espaço entre a pergunta e a resposta. Esse espaço agora se mede em segundos. Quanto mais você usa agentic workflows, mais difícil isso fica (embora eu ache que não do jeito que as pessoas esperavam). À medida que os modelos melhoram, a porcentagem de erros óbvios cai. Muitos (a maioria?) dos resultados vão estar bem escritos e corretos no essencial. Mas não vão pedir uma segunda olhada.

Mesmo que você rode muitos agentes ao mesmo tempo, continua tendo um único par de olhos para o que eles produzem.

**Você precisa colocar o pensamento crítico dentro do seu dia, porque, por padrão, nada vai fazer isso por você.** Parte do motivo de ser difícil corrigir isso por conta própria é que os agentic workflows são agradáveis. Receber respostas rápidas, cômodas e muitas vezes corretas num dia corrido é revigorante. E é justamente por isso que fica fácil baixar a guarda.

## Delegar, ceder o julgamento e se render

Quando converso sobre isso com as pessoas, descrevo como um espectro.

No topo está cognitive offloading (delegação cognitiva): você entrega tarefas à IA, mas continua dono do resultado. Eu trabalho assim o dia inteiro, e recomendo que você também trabalhe. No meio está deferral (ceder o julgamento): a saída da ferramenta vira diretamente a sua próxima entrada, e o resultado deixa de ser tratado como hipótese. Na base está [cognitive surrender (rendição cognitiva)](https://addyosmani.com/blog/cognitive-surrender/): a saída da IA vira silenciosamente o seu próprio pensamento, e você nem sente necessidade de conferir.

Cognitive surrender é um termo cunhado por [Steven Shaw e Gideon Nave](https://ssrn.com/abstract_id=6097646), da Wharton. Ele se encaixa perfeitamente no que eu venho vendo. Conforme a confiança (ou a preguiça) aumenta, as pessoas escorregam para baixo no espectro. Essa transição raramente é percebida, porque cada passo é gradual e parece razoável. Você leu bem a última resposta, então só passa os olhos na próxima. Da seguinte, olha só o esqueleto. Aí alguém pergunta sobre uma linha e você não consegue explicar, nem com a ajuda do seu agente.

Isso é rendição cognitiva. É assim que a cognitive debt (dívida cognitiva) se acumula. Em geral ela é descoberta quando você tenta usar um modelo mental do sistema e percebe que ele não existe. [Margaret-Anne Storey](https://margaretstorey.com/blog/2026/02/09/cognitive-debt/) escreveu que, nas equipes, isso aparece como a erosão da teoria que todos construíram juntos sobre o sistema (shared system theory). Eu escrevi sobre o equivalente no código com o nome de [comprehension debt](https://addyosmani.com/blog/comprehension-debt/) (dívida de compreensão, termo cunhado por Jeremy Twei). No momento, ela é completamente invisível. A base de código parece impecável e os testes passam. Só quando você precisa mudar o sistema percebe que ninguém mais o entende. O mesmo vale quando você leu apenas o sumário de um documento de estratégia ou de uma especificação e deu o aval.

Para deixar claro, não estou pedindo o impossível. É impossível manter na cabeça o modelo mental completo de uma base de código grande e moderna. [O time do Claude Code já disse publicamente que reconstrói o entendimento quando precisa](https://claude.dev/blog/solving-code-review-at-anthropic/): quando precisam entender uma parte, em vez de manter o modelo inteiro na cabeça, pedem ao Claude que explique aquele pedaço. [Como já escrevi antes](https://addyosmani.com/blog/intent-debt/), esse tipo de dívida é mais recuperável do que a maioria dos engenheiros espera. Você não precisa manter o modelo completo, desde que consiga reconstruir localmente a parte de que precisa. Só precisa saber o que você não tem.

**Quando há pouco em jogo, fique à vontade para delegar por completo. Quando você não consegue explicar a resposta a uma pergunta, nem por meio do seu agente, você abriu mão de ser o dono.** E isso nem sempre é um problema. Há pouco tempo, gravando um curso, tive que escolher um entre três hotéis com avaliações parecidas para usar como locação. Não tinha tempo de ler todas as avaliações, então deleguei a decisão a uma IA. Deu certo, e eu faria de novo. Mas não faria isso para decidir como investir o nosso dinheiro, como aconselhar nossos filhos sobre a carreira ou, no trabalho, o que devemos construir, quais mudanças afetam quais usuários, se é seguro publicar. Passe adiante o que sai barato se der errado, e fique com o raciocínio onde outras pessoas vão ter que lidar com as consequências.

## As perguntas que faço a mim mesmo

Quando eu não sabia o que pensava, costumava voltar a uma lista básica de perguntas como estas. Como sei que estou trabalhando no problema certo? Como sei que estou resolvendo do jeito certo? Existe evidência que sustente a minha conclusão? Como sei que terminei? Na maioria das vezes, isso se resume a [quem, o quê, onde, por quê, quando e como](https://addyo.substack.com/p/critical-thinking-during-the-age). Escrito assim, parece absurdamente infantil, mas obriga você a pensar em categorias que de outro modo ignoraria. Hoje em dia é fácil demais pular tudo isso e perguntar ao agente o que ele acha que você deveria fazer. Estas são as novas versões dessas perguntas que faço a mim mesmo agora.

**Formulei uma hipótese antes de perguntar?** Antes de colocar um agente em qualquer tarefa que não seja trivial, anoto, nem que seja só na cabeça, qual acho que pode ser a resposta. Tudo bem se for um palpite ruim. Mudar de ideia diante de informação nova é sempre bem-vindo. Mas, depois que você lê uma resposta bem escrita, fica difícil imaginar qualquer outra possibilidade. Se você não tem pista nenhuma, peça o que Thariq Shihipar chama de [blind spot pass](https://claude.com/blog/a-field-guide-to-claude-fable-finding-your-unknowns) (revisão de pontos cegos): dê ao modelo o que você sabe e faça com que ele encontre aquilo que você nem sabe que não sabe.

**Estou pedindo que ele me ajude a pensar ou que pense no meu lugar?** As duas coisas estão bem, desde que você saiba qual delas está fazendo.

**O que teria que ser verdade para isto estar errado?** E então vá descobrir. A confiança que um modelo atribui a si mesmo vale muito menos do que um teste real que você pode executar. Então dê um teste a ele.

**Ouvi o argumento contrário por outro ângulo?** Quando assumo uma posição firme sobre algo mais ou menos em aberto, peço a mais de um modelo que defenda o lado oposto, reviso o que produzem e formo minha própria opinião. Leva mais tempo, mas acabo sabendo muito mais sobre o assunto.

**Eu apostaria nisto na frente da pessoa que vai ter que manter?** Vale para código e para qualquer outra coisa que você entrega. Acredito que essa é a régua para poder responder pelo próprio trabalho.

**O que deixei de praticar?** Talvez parte da depuração rotineira. Tudo bem abrir mão de um pouco disso, mas quero que seja intencional.

## Verificação como hábito

Ultimamente tenho escrito muito sobre verificação porque acredito que [o gargalo saiu de escrever código e foi para ter certeza de que você está certo](https://addyo.substack.com/p/agentic-verification). Quando você dá a um agente os meios de verificar o que está fazendo (sejam testes end-to-end, testes de propriedade ou interações reais com o app), ele pode fazer uma mudança, rodar a verificação, ler a saída e tentar de novo, tudo antes de você olhar para qualquer coisa. É o que Boris Cherny chama de ["dar ao Claude uma forma de verificar o próprio trabalho"](https://x.com/bcherny/status/2007179861115511237), e acredito que esse é um dos componentes mais importantes para chegar a bons resultados. Em vez de ler cada linha, você vai construir esses loops e revisar a evidência.

Você também pode se render na verificação. "Existe evidência que sustente a minha conclusão?" vira "O check ficou verde?". Os agentes deixam tão barato criar testes que você vai ver muito verde, e pode ter um teste passando que não pega uma funcionalidade quebrada. Se o teste foi escrito com o mesmo erro da funcionalidade, ele passa. E um check verde só transmite uma propriedade. Mas é fácil demais imaginar que ele cobre tudo.

**Quando um check fica verde, pergunte o que ele provou. Depois pergunte o que ele não provou.** Defina "verificado" de antemão, porque, se fizer isso depois, você vai racionalizar qualquer resultado.

A linha de chegada do trabalho de um agente deve ser algo tangível: um teste passando, uma captura de tela, um log ou uma trace. Assim o critério para dar o trabalho por terminado é um fato, e não fica sujeito a interpretações (nem à rendição) do tipo "parece que está pronto". Quando receber a notificação de que um agente terminou, antes de olhar o resumo, confira primeiro o código do comando executado e a saída dele.

O Claude Code também pode fazer uma autocrítica do próprio trabalho (por meio de um subagent num contexto novo) como checagem básica, e vale a pena colocar isso dentro do loop para rodar sempre, não só quando você lembrar. Eu ainda pergunto no fim: "Deixei passar alguma coisa?". Parece bobo, mas com muita frequência, quando termino uma funcionalidade complexa usando um modelo frontier, olho, reviso e depois pergunto "Deixei passar alguma coisa?", ele volta com mais duas ou três coisas. Por isso eu sempre pergunto.

Claro que nada disso precisa ser a regra. Saber quando se aprofundar também é uma habilidade. Minha regra prática favorita do nosso texto sobre como o time do Claude Code faz code review é esta: "Se você não consegue dizer o que os checks deixariam passar, peça uma revisão de verdade em vez de uma aprovação rápida".

Isso vale também fora do código. Se um agente sintetizou para você cinquenta ligações com clientes ou uma análise da concorrência, abra alguns dos documentos originais para garantir que o resumo está correto. Confira um número do qual a sua recomendação depende para garantir que foi calculado direito. **Os agentes deixaram barato montar a verificação. O difícil para você é saber como é uma boa verificação.**

## Prestar atenção de verdade no que foi gerado

Digamos que um agente entregue a você um PR de 600 linhas. Você olha a estrutura por cima. Não lê cada linha. Os nomes das variáveis parecem razoáveis e os testes passam, então você aprova. Mas em algum lugar no meio há uma mudança sutil de ordem numa fronteira de transação, ou um valor padrão invertido num edge case em que você nunca pensou. Você revisou, vá lá. Mas só procurando o que já sabia que ia encontrar.

Escrever código e revisá-lo são habilidades diferentes, e [existe um ponto em que revisar vira rubber stamping (aprovação pro forma)](https://addyo.substack.com/p/the-80-problem-in-agentic-coding). Então leia o diff como se não tivesse sido escrito por uma IA, e depois olhe além do diff para o que o agente decidiu. Ao longo de uma sessão longa, ele toma muitas pequenas decisões por você: os valores padrão, o que fica fora do escopo, qual requisito ele reinterpreta quando dois deles entram em conflito.

Nada disso aparece num resumo dizendo que tudo correu bem, então peça a ele que liste as decisões e suposições que tomou. Depois teste a si mesmo. Escolha algumas linhas ao acaso e pergunte: e esta linha? E aquela? Se for um documento, feche-o e tente escrever de memória o argumento principal. Há um hábito que algumas pessoas usam em sessões longas e de que eu gosto: pedir ao Claude que escreva um relatório sobre a mudança e que, no fim, aplique um quiz, com a regra de "só faço merge depois de gabaritar o quiz". **Entenda o que você publica bem o bastante para defender. Porque em algum momento alguém pode perguntar.**

Os agentes também podem proteger a sua atenção. Por exemplo, tenho um projeto open source que recebe muitos pull requests. Uso agentes para me ajudar a ver o que está chegando, o que contraria as nossas diretrizes e onde provavelmente a minha atenção é necessária. Raramente deixo os agentes decidirem isso sozinhos, mas eles podem estreitar onde devo concentrar a atenção, e aí consigo pensar de verdade se essas mudanças resolvem o problema certo do jeito certo.

E aí vem o volume, e nisso você precisa ser honesto consigo mesmo. Chamei isso de [orchestration tax](https://addyosmani.com/blog/orchestration-tax/) (custo de orquestração). É a distância entre o que seus agentes geram e aquilo em que você se sentiria confortável colocando o seu nome. Se o trabalho pronto está se acumulando mais rápido do que você consegue absorver, abrir mais uma sessão não vai ajudar até você resolver isso: aperte os checks para que menos coisa dependa de você, ou desacelere. **Quando você produz mais do que consegue sustentar, já não está revisando. Está torcendo.**

## Entrada boa, saída boa

O modelo mental humano continua envolvido, mas, em vez de ficar no meio, fica no começo e no fim. Você coloca sua energia na ponta da frente, na descrição da tarefa e no contexto, e na ponta de trás, na revisão da saída. Por isso uma boa entrada é tão importante para a qualidade da saída, e vejo escrever bons prompts como uma habilidade de pensamento crítico.

Antes, se você fazia um pedido vago, alguém questionava, e você talvez percebesse: "Ah, espera, na verdade eu não tinha pensado nisso direito". Muitas vezes um agente não segura você ali. Ele preenche o que você deixou de fora e devolve algo que parece pronto, mesmo que a ideia por trás continue nebulosa. Escrevi sobre isso com o nome de [intent debt](https://oreillyradar.substack.com/p/the-intent-debt) (dívida de intenção): os objetivos, restrições e justificativas implícitos que podem existir em artefatos que não foi você que escreveu. Diferente de outras dívidas, ninguém pode quitar esta por você. A intenção tem que vir de você.

**O seu prompt reflete o quanto você entende o problema. Se você não consegue expressá-lo com clareza, talvez ele também não esteja claro na sua cabeça.** Antes de pedir ajuda, escreva com suas próprias palavras um resumo do pedido. Descreva o público, o que fica fora do escopo e a definição de pronto. Se a segunda rodada de correções não levou você aonde queria, pare de ajustar e reescreva o prompt.

Você também pode pedir ajuda ao agente nisso. Gosto da distinção que Andy Clark faz entre delegar a um sistema de IA e [colaborar](https://pubmed.ncbi.nlm.nih.gov/40389440/) com ele. Na colaboração, você entra num ciclo virtuoso de amplificação mútua: seus prompts refinam a saída, essa saída refina o próximo prompt e também o seu modelo mental do problema. Se não estiver claro, peça ao agente que entreviste você sobre o que ele não entende. Se você fechar a sessão com o seu modelo mental mais refinado, é sinal de sucesso.

Tome cuidado também com a entrada. É fácil cada agente receber como contexto só o resumo do agente anterior. E, quando você vê, o terceiro agente nunca leu o documento original.

Você também precisa dos seus próprios padrões para a saída. Já brinquei com IA em muitos meios criativos diferentes, e a maior parte nunca mostrei a ninguém porque não atinge o meu padrão. Tudo sai bem formatado e com tom confiante, então o acabamento já não é um sinal útil. **A IA pode ter deixado mais rápido produzir. Mas, se eu não me sentiria à vontade em assumir o resultado como meu, não publico.**

Quando algo não atinge o seu padrão, anote o porquê numa configuração compartilhada, num hook ou num teste, para que não aconteça de novo. É assim que o bom gosto se acumula. E anotar por que algo não passou no corte é, por si só, um bom exercício.

## "Mas os modelos vão fazer isso melhor do que eu"

Se você é tão otimista quanto muita gente ao meu redor sobre o futuro dessa área, provavelmente teve este pensamento ao longo das últimas seções. Daqui a um ou dois anos o modelo vai conseguir detectar o que eu conseguiria detectar, então para que me dar ao trabalho de manter essa habilidade?

Talvez você tenha razão em boa parte dessa detecção, e eu mesmo venho defendendo passar cada vez mais detecção para os agentes. Mas eis por que acho que isso ainda importa: no fim das contas, alguém é responsável pelo que vai para produção. Não importa o quanto a IA tenha ajudado, [uma pessoa tem que assumir a responsabilidade](https://addyo.substack.com/p/code-review-in-the-age-of-ai).

Quanto confiar num agente para uma tarefa específica já é, em si, uma questão de julgamento. Parte de manter esse julgamento calibrado é revisar o trabalho, porque os pontos em que os modelos erram não param de mudar. A própria pesquisa da Anthropic com seus engenheiros e pesquisadores [aponta essa armadilha](https://www.anthropic.com/research/how-ai-is-transforming-work-at-anthropic) e a chama de paradox of supervision (paradoxo da supervisão): "supervisionar o Claude exige justamente as habilidades de programação que podem se atrofiar com o uso excessivo de IA".

Há coisas que são as mais importantes para mim e que um modelo melhor não vai resolver: o que você está construindo, por que vale a pena, quem isso afeta e do que você está disposto a abrir mão. Todas são perguntas que você precisa responder. Um agente pode ajudar a trabalhá-las, e eu gostaria que ajudasse, mas no fim elas continuam sendo suas. **Você pode delegar o trabalho e boa parte da revisão. Mas não a responsabilidade.**

## Práticas para o dia a dia

Você não precisa fazer tudo isso com rigor. Basta encaixar o que funciona no seu jeito de trabalhar.

Uma vez por semana, escreva um pouco de código sem agente, ou faça você mesmo uma coisa real que seria ruim esquecer como se faz (chamei isso de calibration exercise (exercício de calibração), mas não digo isso em tom de sermão). Uma vez por mês, anote o que você deixou de fazer e decida quais dessas coisas tudo bem não fazer. [Uma pergunta de um post antigo do meu blog](https://addyo.substack.com/p/avoiding-skill-atrophy-in-the-age) continua tão válida quanto sempre: o quanto você ficaria perdido se a IA não existisse?

Se algo está acima da sua compreensão, vá aprender. Se estou escrevendo e esbarro numa expressão que nunca vi, poderia buscar no Google uma explicação de uma linha e incluir. Prefiro pesquisar um pouco para entender direito. Assim vejo onde aquilo se encaixa.

Conferir direito o que a máquina fez é trabalho de verdade, e fingir que não é o caminho pelo qual as equipes acabam não fazendo. Não é de graça, então coloque isso na agenda como um item. Assim você vai fazer de fato.

As habilidades que você para de exercitar vão embora, provavelmente mais rápido do que você imagina. Continue praticando as que você não está disposto a largar.

## O que levar com você

- **Seja intencional**: Um agente pode aplicar um quiz, entrevistar você e mostrar a evidência dele, mas só se você configurar isso. Então configure.
- **Seja honesto sobre o seu lugar no espectro**: Se você não consegue explicar a resposta, nem com a ajuda de um agente, você se rendeu a ela.
- **Tenha uma hipótese**: Formule uma antes de perguntar, mesmo que seja ruim.
- **Um check verde significa uma coisa só**: O que ele verificou? O que ele não verificou?
- **Procure a evidência**: Leia o que ele executou e o que retornou antes de ler o resumo.
- **Leia para saber que decisões ele tomou**: O que ele decidiu por você?
- **Capriche no prompt**: O jeito como você escreve o prompt mostra o quanto você entendeu o problema.
- **Defina uma régua e mantenha**: Se você não colocaria o seu nome, não sai.

Continue no jogo aplicando você mesmo as habilidades que importam. Uma coisa que você pode experimentar: antes de perguntar, anote o que acha que vai acontecer e, quando o agente terminar, anote uma coisa que ele não verificou. Me conte se isso muda o jeito como você lê a saída. Pense de forma independente. Faça perguntas melhores. Assuma a responsabilidade pelo resultado.

## Minha opinião

Está claro que a IA importa. Mesmo assim, o que quero escolher primeiro agora não é ampliar o meu stack de tecnologia, e sim desenvolver a capacidade de pensar e os critérios com que julgo.

A cognitive surrender contra a qual o autor alerta é entregar o próprio julgamento a um agente. Eu também uso IA e ferramentas de automação ativamente, mas quero usá-las para tornar o meu pensamento mais produtivo, e não para delegar o pensamento em si. Escrevi à parte por que defini essa prioridade em [O processo de provar meu pensamento](/261103).
