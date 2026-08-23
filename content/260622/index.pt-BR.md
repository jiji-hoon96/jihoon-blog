---
emoji: 🧭
title: 'Engenharia de Harness (Sistemas)'
seoTitle: 'Agentes de IA depois do contexto: design de harness, eval e containment'
date: '2026-06-22'
categories: IA Agentes
description: 'Do prompt ao context engineering: o que vem depois? A partir das tendências recentes do blog de engenharia da Anthropic, este artigo conecta a economia de tokens a três direções: design de harness, eval e containment (isolamento).'
keywords: 'context engineering, design de harness, eval de agentes de IA, agent evaluation, containment, isolamento de agentes, tendências de IA 2026, prompt engineering, agentes LLM, depois da economia de tokens'
locale: pt-BR
translationOf: '260622'
sourceHash: '3a4496827fcd34537ded61f9925a57116fbf16b6d28eee9508f66417f6d2345b'
---

Neste artigo, quero falar sobre prompt engineering, context engineering e o que pode vir depois.

Enquanto concluía o artigo anterior sobre [como economizar tokens](/260611), uma pergunta não saía da minha cabeça. Acredito que o centro de gravidade está deixando o trabalho com prompts individuais e passando para a técnica de esvaziar e selecionar informações — context engineering. Quando terminei o texto, a pergunta seguinte surgiu naturalmente: então, o que vem depois do contexto?

![Arquitetura de 3 camadas para sistemas de IA confiáveis, composta por prompt, context e harness engineering](3.webp)

É preciso cautela ao falar sobre “a direção do futuro”. Há inúmeras possibilidades pela frente; por isso, o foco aqui é organizar **a mudança de ênfase que pode ser lida em fontes primárias já publicadas**. Embora haja inevitavelmente alguma inferência, espero que o texto seja considerado sob perspectivas diversas.

---

## Do prompt ao contexto

Comecemos esclarecendo os termos. Por algum tempo, o principal assunto do setor foi **prompt engineering**. A questão era como escrever bem uma única instrução enviada ao model, ou seja, como projetar orientações claras, bons exemplos e o formato de saída.

Depois, a unidade de trabalho cresceu. À medida que agentes que operam por dezenas de turnos se tornaram comuns, o mais importante deixou de ser um único prompt e passou a ser como compor **todo o contexto que o modelo vê em cada turno** (system prompt + definições de ferramentas + histórico da conversa + resultados de busca + memória). Isso é chamado de **context engineering**. A Anthropic organizou esse enquadramento no artigo “Effective context engineering for AI agents”, de setembro de 2025, e o estudo sobre context rot publicado no mesmo ano pela equipe da Chroma (Hong et al.) acrescentou evidências quantitativas. Com 18 modelos, incluindo GPT-4.1, Claude 4, Gemini 2.5 e Qwen3, eles mostraram que o desempenho se degrada de maneira desigual conforme a entrada aumenta, até em tarefas tão simples quanto copiar palavras literalmente. A suposição comum de que um modelo trata da mesma forma o 100º token e o 10,000º token não se sustenta na prática. A conclusão não foi “quanto maior o contexto, melhor”, mas “a forma como a informação é posicionada importa tanto quanto o que ela contém”. Isso reforçou a transição de preencher para selecionar e ajudou o termo a se firmar rapidamente.

Vale apontar um mal-entendido comum. Prompt engineering não foi **substituído** por context engineering. Escrever bons prompts continua sendo fundamental; context engineering se aproxima mais de um conceito superior construído sobre essa base. (O fato de o interesse passar de escrever bom código para projetar bons sistemas não torna coding desnecessário.) A descrição exata, portanto, não é “trocamos um pelo outro”, mas **“o escopo se ampliou incluindo o anterior”**.

Voltemos à pergunta: essa ampliação terminou no contexto? Não parece.

## O blog de engenharia da Anthropic

Acredito que a forma mais honesta de estimar a direção seja ler, em ordem cronológica, o que escrevem as organizações que de fato impulsionam a área. Ao acompanhar o blog de engenharia da Anthropic depois de “Effective context engineering” (setembro de 2025), os próprios títulos começam a desenhar para onde o centro de gravidade seguiu.

- Outubro de 2025, Equipando agentes com Agent Skills
- Novembro de 2025, Code execution with MCP: agentes mais eficientes
- Novembro de 2025, Effective harnesses for long-running agents
- Janeiro de 2026, Demystifying evals for AI agents
- Janeiro de 2026, Projetando avaliações técnicas AI-resistant
- Fevereiro de 2026, Quantificando o ruído de infraestrutura em avaliações de agentic coding
- Março de 2026, Harness design for long-running application development
- Abril de 2026, Scaling Managed Agents: separando cérebro e mãos
- Maio de 2026, Como conter Claude em todos os produtos

Olhando a lista com certa distância, as palavras-chave se agrupam em três ramos: **harness**, **eval** e **containment**. Minha leitura é que a discussão subiu um nível: de como preencher e esvaziar o contexto para como projetar, medir e controlar todo o sistema de agentes. (Naturalmente, há a limitação de serem as prioridades de uma única empresa. Ainda assim, considerando o peso dela no ecossistema de coding agents, é difícil tratá-las apenas como interesses de um vendor.)

Vamos examinar cada ramo.

## harness

A palavra harness talvez seja pouco familiar. Literalmente, é o arreio colocado em um cavalo para dirigir sua força. Em um agente de IA, harness é **toda a estrutura externa que envolve o model e o coloca para trabalhar**: quais tools ele pode usar e em que ordem, como se recupera de uma falha, até onde vão suas permissões e quando o loop termina.

Se context engineering pergunta “o que mostrar ao model?”, o design de harness pergunta “como fazer o model se mover dentro desse ambiente?”. Ele está uma camada mais para fora. Se o model fosse uma pessoa recém-contratada e muito capaz, o contexto seriam os materiais de trabalho entregues a ela, enquanto o harness seria o ambiente e o manual de procedimentos. A mesma pessoa pode apresentar resultados instáveis em um ambiente caótico e ir muito mais longe, com as mesmas habilidades, sobre um processo bem projetado.

A importância disso aparece claramente em [uma falha enfrentada diretamente pela equipe de engenharia da Anthropic](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents). Eles colocaram seu principal coding model, Opus 4.5, sobre o Claude Agent SDK, forneceram apenas instruções de alto nível, como “crie um clone do claude.ai”, e o executaram em várias sessões. Embora o model fosse inteligente, não produziu um app de nível production. As falhas se repetiam de duas formas. Em uma, a sessão tentava concluir tudo de uma vez, esgotava o contexto no meio da implementação e deixava para a próxima uma funcionalidade inacabada. Na outra, uma sessão posterior percebia que “já houve bastante progresso” e declarava o trabalho concluído apesar das tarefas restantes. (Imagine um trabalho longo passado entre pessoas em turnos, em que cada substituto não tem memória alguma do anterior.)

A solução não foi tornar o model mais inteligente, mas mudar a estrutura. A primeira sessão recebeu um prompt específico para preparar o ambiente (initializer agent), desdobrou mais de 200 especificações funcionais em `feature_list.json` e criou `init.sh` para iniciar o servidor de desenvolvimento, além de um log de progresso (`claude-progress.txt`). Cada sessão seguinte (coding agent) tratava exatamente de uma funcionalidade, deixava um estado limpo por meio de um git commit e notas de progresso, e então terminava. A próxima lia primeiro esse progress file e o git log para entender “até onde chegou o turno anterior” antes de continuar. Era o mesmo model, mas o resultado mudou sobre essa estrutura. O harness, e não o model, decidiu o sucesso. (Curiosamente, as soluções da Anthropic não são novas. Listas de funcionalidades, commits pequenos, notas de progresso e smoke tests executados sempre são exatamente o que uma pessoa experiente em desenvolvimento faz todos os dias. Uma boa estrutura para um agente é, no fim, semelhante a incorporar bons hábitos de engineering ao ambiente.)

A conexão com a economia de tokens também é clara. O isolamento de subagentes, a redução das definições de tools e o model routing abordados no artigo anterior parecem técnicas independentes quando vistos separadamente. Juntos, porém, são partes de **como se projeta um único harness**. Decidir qual model lane recebe cada tarefa, quais tools continuam ativas e onde a exploração verbose é isolada compõe o design de harness. A economia se parece mais com um efeito colateral desse design.

No entanto, o design de harness tem uma armadilha peculiar: **quanto melhor a estrutura, mais provável é que ela envelheça quando o model melhora.** Um harness é, em essência, um conjunto de suposições sobre “o que o model não consegue fazer sozinho”. No momento em que o model passa a fazer essas coisas, as suposições viram excesso de bagagem. Um [caso da Anthropic](https://www.anthropic.com/engineering/managed-agents) ilustra isso exatamente. O Sonnet 4.5 tinha o hábito de se apressar para terminar ao se aproximar do limite de contexto — context anxiety —, então a estrutura incorporou um mecanismo de context reset. Quando a mesma estrutura foi usada com o Opus 4.5, esse hábito havia desaparecido, e o reset cuidadosamente adicionado virou peso morto. Cada vez que o model fica um pouco mais capaz, alguma parte da estrutura pode vencer.

Daí surge uma ideia adicional: em vez de aperfeiçoar uma estrutura específica, **projetar interfaces que permaneçam estáveis mesmo quando a estrutura muda**. Managed Agents, da Anthropic, segue essa direção, cujas raízes estão, surpreendentemente, nos sistemas operacionais. O OS sobreviveu por décadas porque virtualizou o hardware em abstrações como processos e arquivos, criando antecipadamente um recipiente para programas que ainda nem existiam. Uma linha de `read()` funciona da mesma maneira com um disco dos anos 1970 ou um SSD atual. Aplicando o mesmo raciocínio, o agente é dividido em três partes: o **cérebro** que decide (Claude e o harness), as **mãos** que agem (sandbox de execução de código e tools) e o **session log** que registra tudo por append. Com as três partes separadas, se o container morrer, o cérebro pode tratar o evento como um erro de tool call; se o harness morrer, pode despertar novamente a partir do último ponto no session log. Como efeito colateral, custo e latência também caíram. Ao iniciar containers apenas quando realmente necessários, a Anthropic relata que o time to first token (TTFT) caiu cerca de 60% na mediana e, no p95, mais de 90%. (Aqui voltamos ao artigo sobre economia de tokens. Ele recomendava colocar as partes estáticas primeiro para aproveitar prompt caching; decidir “como organizar o contexto para elevar o cache hit rate” é justamente o trabalho do harness ao lado desse cérebro.)

## eval

O segundo ramo foi o mais interessante para mim. Como se houvesse um acordo, os artigos do início de 2026 convergem para a **avaliação (eval)**.

O motivo é intuitivo. **Como verificamos** se o contexto foi bem composto, o harness bem projetado ou o custo realmente reduzido? Quanto mais longas e complexas são as tarefas que um agente executa de forma autônoma, mais difícil se torna inspecionar cada uma e decidir “isso realmente funcionou bem?”. A base da confiança acaba migrando para a medição. Por isso, questões como “como projetar avaliações de agentes?”, “como remover o ruído da própria avaliação?” e “como lidar com eval awareness, quando o model percebe a avaliação e muda o comportamento?” foram para o primeiro plano.

![4.png](4.png)

Avaliar agentes é difícil porque isso difere de uma pergunta e resposta pontual. Um agente chama tools e altera estados ao longo de vários turnos; assim, um erro se propaga e se acumula. Além disso, os resultados variam entre execuções mesmo com a mesma entrada. A [Anthropic](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) divide essa não determinação em duas métricas. **pass@k** é a probabilidade de sucesso pelo menos uma vez em k tentativas, por isso aumenta com mais tentativas. **pass^k** é a probabilidade de sucesso em todas as k tentativas, por isso diminui. Para geração de código que só precisa acertar uma vez, pass@1 importa; para um agente de atendimento que precisa funcionar sempre de modo confiável, pass^k é essencial. (Com taxa de sucesso per-trial de 75%, a probabilidade de três sucessos consecutivos é 0.75³, cerca de 42%. A distância entre “geralmente funciona” e “funciona sempre” é tão grande assim.)

Então, como pontuar uma tentativa? O mesmo artigo divide os graders em três tipos. Os **code-based** (resultado de tests, static analysis e validação de tool calls) são rápidos, baratos e objetivos, mas fracos em tarefas abertas com várias respostas válidas. Os **model-based** (LLM-as-judge e pontuação por rubric) capturam nuances de qualidade, mas não são determinísticos e precisam de calibração periódica com avaliações humanas. Os **human-based** são os mais precisos, porém lentos e caros. Na prática, os três são combinados, de preferência com avaliação determinística como base e avaliação do model como apoio. Há outra distinção. Um **capability eval** pergunta “o que este agente consegue realizar?”, portanto começa com uma pontuação baixa e oferece uma subida. Um **regression eval** pergunta “ele ainda faz o que fazia antes?”, por isso deve permanecer perto de 100%; uma queda indica que algo quebrou.

Aqui há uma armadilha surpreendentemente ignorada: **a pontuação baixa pode ser culpa da avaliação, não do agente.** A Anthropic relata que o Opus 4.5 obteve inicialmente 42% no CORE-Bench. A investigação encontrou pontuação rígida que esperava “96.124991…” e marcava “96.12” como errado, especificações ambíguas e tarefas estocásticas impossíveis de reproduzir. Depois de corrigir bugs e repetir com um scaffold de restrições mais flexíveis, a pontuação saltou para 95%. Por isso, eles enfatizam um princípio: **não aceite a pontuação pelo valor de face; leia você mesmo o transcript (registro de execução).** Se um frontier model fizer 100 tentativas e obtiver 0%, geralmente o problema está quebrado, e não o model incapaz.

Também é interessante que, conforme a medição avança, a própria linha de base se move depressa. No SWE-bench Verified — benchmark de referência para coding agents que fornece issues reais do GitHub e pontua se os tests passam —, os frontier models subiram da faixa de 30% para mais de 80% em 1 ano. Nesse ponto, todos os problemas fáceis estão resolvidos, a pontuação toca o teto (saturation) e surge um paradoxo: grandes avanços de capacidade aparecem apenas como pequenas diferenças. Segundo relatos, uma startup de code review inicialmente desprezou um model novo olhando apenas para avaliações one-shot; só percebeu corretamente a melhoria depois de migrar para avaliações de agentes com tarefas mais longas e complexas. Um eval, portanto, não é criado uma vez e encerrado: torna-se um ativo vivo que precisa ser continuamente substituído por versões mais difíceis. (A Anthropic compara isso ao “Swiss cheese model” da engenharia de segurança. Uma fatia cheia de buracos não basta, mas, ao sobrepor avaliação automática, production monitoring e revisão humana de transcripts, uma falha que atravessa uma camada fica presa na próxima.)

## containment

O terceiro ramo tem um caráter um pouco diferente. Não trata de custo ou desempenho, mas de **segurança e controle**.

Quanto mais ferramentas um agente recebe e quanto mais autonomia tem, maior é o alcance de um único erro — o blast radius. Para um agente que pode apagar arquivos, enviar solicitações externas e executar ações privilegiadas em nome de alguém, “onde interromper o dano quando algo dá errado?” importa tanto quanto “quão bem ele executa?”. Nesse contexto pode ser lido o destaque dado pela Anthropic, em maio de 2026, ao artigo sobre [containment em todos os seus produtos](https://www.anthropic.com/engineering/how-we-contain-claude). Ele divide o risco dos agentes em três ramos: **user misuse**, quando o usuário pede algo nocivo por malícia ou descuido; **model misbehavior**, quando o modelo age sozinho sem solicitação; e **external attacks** que chegam por ferramentas, arquivos ou redes. Uma observação interessante é que tornar o modelo mais inteligente não reduz apenas o risco. Modelos menos capazes interpretam mal situações e cometem erros óbvios; os mais capazes erram menos, mas encontram melhor caminhos inesperados para contornar restrições que ninguém escreveu explicitamente.

O ponto central enfatizado é o limite de “ter uma pessoa supervisionando cada ação”. Claude Code inicialmente buscava segurança pedindo aprovação para cada escrita, execução e acesso à rede, mas a telemetria mostrou que os usuários simplesmente aprovavam cerca de 93% das solicitações. Quanto mais janelas aparecem, menos atenção cada uma recebe: surge a **approval fatigue**. Uma defesa probabilística dependente de cliques humanos sempre conserva brechas. O centro de gravidade passa de “monitorar o que o agente está fazendo” para “limitar o que ele pode fazer desde o início”. As defesas são empilhadas em três camadas: a **camada de ambiente**, com sandbox, VM e controle de egress; a **camada do model**, com system prompts e classifiers; e a **camada de conteúdo externo**, com MCP, plugins e resultados de busca. O princípio central é **instalar primeiro a camada de ambiente, que bloqueia de forma determinística**. Não porque as defesas do model sejam fracas. De fato, no benchmark da Gray Swan para prompt injection, a taxa de sucesso de um ataque único é de cerca de 0.1%, um resultado de primeira linha. Porém, com 100 tentativas adaptativas, ela sobe para 5–6%, e uma defesa probabilística não consegue, por natureza, atingir 100% de acerto. Por isso, coloca-se no fim uma fronteira rígida. (A introdução de sandbox no nível do OS reduziu as solicitações de aprovação em 84%. O mecanismo de segurança diminuiu a fricção.)

![Defesa de containment em 3 camadas: as camadas do model e de conteúdo externo (probabilísticas) ficam sobre a camada de ambiente (determinística, última linha de defesa)](2.png?w=720)

Embora pareça distante da economia de tokens, ambos compartilham a mesma raiz. Os dois perguntam: **“o que dar ao agente e até onde?”** A Anthropic mostra bem essa conexão com dois casos. Em um, o red team interno fez phishing com um funcionário para que ele executasse Claude Code com um prompt malicioso. Uma instrução discretamente inserida fez o sistema ler `~/.aws/credentials` e enviar o conteúdo para fora via POST; de 25 tentativas, funcionou 24 vezes. Como o usuário digitou diretamente a instrução, o classifier do model não viu nada suspeito. O que impediu o ataque não foi um model inteligente, mas a fronteira ambiental que mantinha as credenciais fora do sandbox e o controle de egress. O segundo caso é mais sutil. Uma allowlist de egress permitiu corretamente `api.anthropic.com`, mas um arquivo plantado pelo invasor usou a própria API key dele para chamar a API de upload de arquivos da Anthropic, e os dados saíram para a conta do invasor. O sandbox funcionou perfeitamente, mas os dados ainda vazaram. A lição foi entender a allowlist não como “filtro de destinos”, mas como “permissão para todas as capacidades disponíveis naquele domínio”. (A Anthropic repete este princípio: hypervisors, filtros de syscall e runtimes de containers já verificados resistiram; **o que realmente quebrou foram os componentes construídos por eles sobre essa base**.) Remover tools de MCP não utilizadas pertence ao mesmo contexto: economiza custo e reduz a attack surface. Manter um design leve o torna não apenas mais barato e preciso, mas também mais seguro.

## Em resumo

Os três ramos podem ser condensados em uma frase. A unidade de atenção se expande um nível de cada vez: **do prompt (uma instrução), para o contexto (o que mostrar em cada turno), e então para todo o sistema de agentes (como operá-lo, medi-lo e contê-lo)**. Harness responde a “como fazê-lo funcionar?”, eval a “como saber se funcionou bem?” e containment a “como detê-lo quando funciona mal?”.

![Expansão em 3 estágios do foco, do prompt ao contexto e então a todo o sistema de agentes, com os ramos harness, eval e containment](1.png?w=720)

Vale reforçar: esses três ramos são **uma mudança de ênfase que o autor infere de materiais já publicados**, não uma previsão como “isso será o padrão no segundo semestre de 2026”. Algumas correntes crescerão, enquanto outras serão absorvidas sob nomes diferentes. O que está claro é que nem o prompt nem o contexto desaparecerão: continuarão como partes de uma estrutura maior. A área avançou acrescentando uma camada sobre as anteriores, e não apagando palavras antigas com novas, e provavelmente continuará assim.

Começamos falando de custos e chegamos até aqui. O artigo anterior recomendava abrir o livro de contas de tokens; este sugere ir um passo além. Vale examinar em conjunto **como verificar** a economia (eval), **sobre qual estrutura ela pode ser repetida** (harness) e **até onde essa estrutura é segura** (containment). No fim, o que deve durar mais não é uma técnica específica de economia, mas o hábito de medir e controlar o próprio sistema.

:::ref
- [article] [Anthropic, Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [article] [Anthropic, Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [article] [Chroma Research, Context Rot](https://research.trychroma.com/context-rot)
:::
