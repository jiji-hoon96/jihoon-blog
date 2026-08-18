---
emoji: 🤖
title: 'Engenheiro frontend na era da IA'
seoTitle: 'Como sobreviver como engenheiro frontend na era da IA: novas competências em validação, especificação e discernimento'
date: '2026-03-02'
categories: 프론트엔드 커리어 AI
locale: pt-BR
translationOf: '260302'
sourceHash: 8622877ee90352b24b0ec5131450def442d07449b2b669894ba2f674c2508509
description: 'Em uma era em que a IA escreve código por nós, como engenheiros frontend podem crescer e sobreviver? Com base em fontes verificadas, como o agentic engineering de Karpathy, o v0 da Vercel, a pesquisa do Stack Overflow e os estudos da METR, este artigo apresenta novas competências e estratégias de aprendizado centradas em validação, especificação e discernimento.'
keywords: 'frontend na era da IA, desenvolvedor na era da IA, vibe coding, agentic engineering, ferramentas de programação com IA, Product Engineer, plano de carreira para frontend'
---

Neste post, quero falar, a partir de uma perspectiva pessoal, sobre **como engenheiros podem crescer e sobreviver na era da IA**.

Um dos textos que mais me marcaram no início da carreira foi [“Plano de carreira para engenheiros frontend: três trilhas de especialização para profissionais juniores”, de Hwidong Bae](https://kr.linkedin.com/posts/hwidongbae_%ED%94%84%EB%A1%A0%ED%8A%B8%EC%97%94%EB%93%9C-%EC%97%94%EC%A7%80%EB%8B%88%EC%96%B4-%EC%BB%A4%EB%A6%AC%EC%96%B4-%EB%A1%9C%EB%93%9C%EB%A7%B5-%EC%A3%BC%EB%8B%88%EC%96%B4%EB%A5%BC-%EC%9C%84%ED%95%9C-3%EA%B0%80%EC%A7%80-%EC%A0%84%EB%AC%B8%EC%84%B1-%ED%8A%B8%EB%9E%99-activity-7013888624140189696-XiIz). O artigo organiza a carreira de engenharia frontend em três trilhas — **especialização em web (Software Engineer) / especialização em produto (Product Engineer) / especialização em operações (Full-Stack Engineer)** — e ainda aborda as “cinco competências fundamentais de um engenheiro excepcional” e os “três pontos para se tornar sênior”. Naquela época, a grande questão era decidir quais competências desenvolver em cada trilha. Mas, menos de dois anos depois de eu ler o texto, a própria questão mudou por completo.

Hoje, quando converso com colegas de engenharia, percebo que as preocupações têm um tom um pouco diferente das que eu vinha ouvindo nos últimos anos.

- “A empresa adotou IA e, quando entregamos um layout, ela faz quase tudo. É prático, mas...”
- “O mercado de contratação está muito frio.”
- “Dá medo de simplesmente fazer merge do código escrito pela IA, mas revisar tudo um por um reduz a eficiência. Não sei bem como equilibrar isso.”

Passei — e ainda passo — por uma fase parecida. Há apenas um ou dois anos, eu via a IA como “uma boa ferramenta de apoio”; hoje, chegamos a um ambiente em que é difícil até imaginar desenvolver sem ela (inclusive pedi ao Claude que fizesse pesquisas enquanto escrevia este texto). Este artigo funciona como uma espécie de continuação do texto de Hwidong Bae: quero organizar, do meu ponto de vista, como o cenário mudou nesse intervalo e quais outras competências precisamos desenvolver como engenheiros frontend diante dessa nova realidade.

Mais uma vez, procurei consultar e verificar o máximo possível de fontes. Ainda assim, como esta é uma área que muda muito rápido, peço desde já a compreensão de vocês caso parte do conteúdo já esteja desatualizada quando este texto for publicado. Se houver contrapontos ou assuntos que mereçam debate, fiquem à vontade para deixar um comentário.


## “Agora a IA não faz tudo?”

Antes de tudo, precisamos esclarecer uma coisa. A frase “a IA faz tudo” é verdadeira? Até que ponto ela é verdade e a partir de onde passa a ser fantasia?

Em fevereiro de 2025, [Andrej Karpathy](https://x.com/karpathy/status/1886192184808149383), cofundador da OpenAI e ex-diretor de IA da Tesla, publicou a seguinte frase no Twitter:

::::quote
:::translation
Existe um novo tipo de programação que chamo de “vibe coding”: você se entrega completamente à vibe, abraça o crescimento exponencial e esquece até que o código existe.
:::

:::original
There's a new kind of coding I call 'vibe coding', where you fully give in to the vibes, embrace exponentials, and forget that the code even exists.
:::
::::

Em poucas palavras, **vibe coding** é “uma forma de programar em que você entrega o teclado à IA e apenas descreve, em linguagem natural, o que deseja”. Não há documentação de arquitetura, boilerplate nem busca por ponto e vírgula. O código simplesmente funciona na vibe. Em menos de um ano, o termo entrou no vocabulário corrente das comunidades de desenvolvimento de língua inglesa.

Exatamente um ano depois, em fevereiro de 2026, o mesmo Karpathy [recuou um pouco](https://thenewstack.io/vibe-coding-is-passe/). Ele propôs substituir o termo vibe coding por **“agentic engineering”**. A diferença entre os dois é clara.

- **Vibe coding**: descrever o que se deseja e aceitar o resultado
- **Agentic engineering**: projetar o sistema, especificar as restrições e usar a IA para acelerar uma implementação cujo raciocínio já foi concluído mentalmente

Se, um ano atrás, a premissa era “é só pedir que ela faz tudo”, agora “a capacidade de planejar o que pedir à IA e como pedir” se consolidou como uma competência de engenharia. E essa tendência não se resume ao tweet de uma única pessoa. Na mesma época, o engenheiro do Google [Addy Osmani](https://addyosmani.com/) publicou o livro [Beyond Vibe Coding: From Coder to AI-Era Developer](https://www.amazon.com/Beyond-Vibe-Coding-AI-Era-Developer/dp/B0F6S5425Y), afirmando categoricamente: “A IA é apenas uma assistente, não uma programadora em quem se possa confiar de forma autônoma. Você é o desenvolvedor sênior, e o LLM existe para acelerar o seu julgamento.”


### As ferramentas estão avançando sem freio

O ecossistema de ferramentas também evolui rapidamente para acompanhar essa tendência. Em maio de 2026, as ferramentas de programação mais mencionadas são Cursor, Claude Code, GitHub Copilot, Windsurf, v0 by Vercel, Bolt.new e Devin.

A transformação do v0 é especialmente emblemática. A Vercel usa a expressão [“90% problem”](https://venturebeat.com/infrastructure/vercel-rebuilt-v0-to-tackle-the-90-problem-connecting-ai-generated-code-to), que significa que 90% do desenvolvimento no mundo real acontece dentro de bases de código e infraestruturas existentes. No início, bastava ao v0 criar bons protótipos greenfield; agora, ele importa diretamente repositórios do GitHub para trabalhar, impõe o uso do design system e obtém automaticamente as variáveis de ambiente de implantação. É a resposta direta do ecossistema de ferramentas ao contraponto dos profissionais seniores: “A IA não serve apenas para criar demos que parecem brinquedos?”

As bases de código das big techs são a melhor demonstração dessa mudança.

Sundar Pichai, do Google, [anunciou na teleconferência de resultados do terceiro trimestre, em outubro de 2024, que “mais de 25% do código novo era gerado por IA e depois revisado e aprovado por engenheiros”](https://fortune.com/2024/10/30/googles-code-ai-sundar-pichai/); em abril de 2025, afirmou que a proporção havia superado 30%. Satya Nadella, da Microsoft, [revelou na LlamaCon, em abril de 2025, que “até 30% do nosso código é escrito por IA”](https://www.cnbc.com/2025/04/29/satya-nadella-says-as-much-as-30percent-of-microsoft-code-is-written-by-ai.html). Na Meta, a meta interna chegou ao ponto de “até o primeiro semestre de 2026, 65% dos engenheiros gerarem com IA pelo menos 75% dos próprios commits”.

Na Coreia do Sul, a tendência não é diferente. A [Toss](https://toss.tech/article/toss-frontend-ai-docs) criou um sistema de documentação baseado em IA para melhorar a DX e eliminar a necessidade de desenvolvedores procurarem documentos, e foi além ao abordar temas como [“O que aconteceu quando eliminamos os designers na era da IA”](https://toss.tech/article/removing_designers_in_ai_era). A Danggeun compartilha experimentos de cada equipe toda terça-feira no [AI Show & Tell](https://medium.com/daangn) e passou a usar o [slogan de recrutamento](https://about.daangn.com/blog/archive/%EB%8B%B9%EA%B7%BC-%ED%95%B4%EC%BB%A4%ED%86%A4-%EC%97%94%EC%A7%80%EB%8B%88%EC%96%B4-%EC%B1%84%EC%9A%A9/) “de engenheiro a builder”. Já a Woowa Brothers vem publicando textos como [“Na era em que a IA escreve código, você ainda quer ser desenvolvedor?”](https://techblog.woowahan.com/22828/), com a mensagem de que “a essência do trabalho de desenvolvimento não está no código, mas na capacidade de definir e resolver problemas”.


### Mas os números contam uma história um pouco diferente

Vendo apenas isso, é fácil chegar à conclusão de que “agora basta pedir que tudo fica pronto”. Mas os dados reais contam uma história um pouco diferente.

Comecemos pelos números da [**2025 Stack Overflow Developer Survey**](https://survey.stackoverflow.co/2025/ai), uma análise abrangente do estado do desenvolvimento de software.

- 84% dos desenvolvedores disseram que usam ou pretendem usar ferramentas de IA. (Um aumento em relação aos 76% de 2024.)
- Entre os desenvolvedores profissionais, 51% usam ferramentas de IA todos os dias.
- No entanto, **a percepção positiva sobre as ferramentas de IA caiu**. Depois de superar 70% em 2023 e 2024, chegou a 60% em 2025.
- Desenvolvedores seniores com mais de dez anos de experiência são os que menos confiam nos resultados produzidos por IA.

Em resumo: **“Todo mundo usa, mas confia cada vez menos.”**

Um experimento realizado em 2025 pela organização sem fins lucrativos [**METR**](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/) evidencia de forma ainda mais dramática a distância entre essa percepção e a realidade. Foi um experimento controlado com 16 desenvolvedores open source experientes — em média, cinco anos de experiência e 1.500 commits —, aos quais foram atribuídas 246 tarefas, com a permissão para usar IA definida aleatoriamente. Os resultados foram os seguintes.

- Antes de começar, os desenvolvedores previram que “seriam 24% mais rápidos usando IA”.
- Logo após concluir as tarefas, ainda avaliaram que “parecia ter sido cerca de 20% mais rápido”.
- Mas a medição real mostrou que eles ficaram **19% mais lentos**.

As causas apontadas pelos pesquisadores são interessantes. A taxa de aceitação do código gerado pela IA ficou abaixo de 44%; mesmo o código rejeitado exigiu tempo de revisão e testes; e até o código aceito demandou um tempo considerável de revisão e ajustes. Essa ilusão de ter ficado mais rápido mesmo ficando mais lento — essa lacuna — é uma das razões pelas quais desenvolvedores seniores têm se tornado cada vez mais céticos em relação à IA.

Além disso, a própria “qualidade do código escrito pela IA” está longe de ser impecável. Vejamos o experimento da [**Veracode**](https://www.veracode.com/blog/genai-code-security-report/), que pediu a mais de cem modelos de IA que escrevessem código.

- **45% do código gerado por IA continha vulnerabilidades do OWASP Top 10**.
- **A taxa de falha na proteção contra XSS (cross-site scripting) foi de 86%**.
- A taxa de falha na proteção contra injeção de logs (Log Injection) foi de 88%.
- Outro estudo relatou que a densidade de vulnerabilidades do código de IA era **2,7 vezes maior** que a do código humano.

Em particular, a taxa de 86% de falha em XSS — um tema diretamente ligado ao frontend — merece ser levada ainda mais a sério. Esse número mostra bem o que significa fazer merge, sem alterações, de um form input escrito pela IA. (Quem tem experiência com auditoria de segurança de frontend já se sente desconfortável e preocupado até ao escrever `dangerouslySetInnerHTML` com as próprias mãos; quando a IA o insere discretamente, parece ainda mais assustador.)

Os sinais são semelhantes quanto à qualidade. A [**GitClear**](https://www.gitclear.com/ai_assistant_code_quality_2025_research) analisou 211 milhões de linhas alteradas entre 2020 e 2024 e chegou aos seguintes resultados.

- Proporção de código revertido em até duas semanas após ser escrito (Code Churn): 5,5% em 2020 → **7,9%** em 2024
- Proporção correspondente a refatoração: 25% em 2021 → **menos de 10%** em 2024
- Proporção de copiar e colar (clones): 8,3% em 2021 → **12,3%** em 2024 (em 2025, houve um aumento de nada menos que quatro vezes)

A interpretação não é tão difícil. A capacidade de produzir código rapidamente aumentou, mas a capacidade de escrever código que valha a pena aprimorar diminuiu. Os [dados da Apiiro](https://www.softwareseni.com/ai-generated-code-security-risks-why-vulnerabilities-increase-2-74x-and-how-to-prevent-them/), baseados em empresas da Fortune 50, são ainda mais contundentes. Desenvolvedores que usam assistência de IA produzem de três a quatro vezes mais commits que seus colegas, mas também geram dez vezes mais findings de segurança. Os caminhos de escalada de privilégios (privilege escalation) dispararam 322%, e as falhas de projeto arquitetural, 153%.


## O que a IA substituiu e o que não conseguiu substituir

As ferramentas avançam sem freio, mas os números são ambíguos. Então, o que exatamente a IA substituiu e o que ainda não conseguiu substituir? Só com essa distinção clara conseguimos enxergar onde devemos investir nosso tempo.

O que foi substituído foi parte do trabalho de digitação manual dos desenvolvedores. Há menos situações em que precisamos escrever boilerplate ou código repetitivo; com apenas um layout, uma tela que respeita as convenções pode ficar pronta em poucos minutos; e tanto o tempo gasto pesquisando sintaxe e APIs quanto a curva de aprendizado caíram drasticamente. Em suma, a IA **nivelou a “velocidade de produção”**.

Mas, no campo do “julgamento”, ela ainda não nos substituiu. (Para ser mais preciso, seria melhor dizer que “ainda não correspondeu às expectativas”. Embora a capacidade de usar IA varie de pessoa para pessoa, aqui parto da experiência média de uso.)

O primeiro obstáculo é **traduzir requisitos em especificações**. Transformar necessidades de negócio ambíguas em casos de borda precisos e máquinas de estado ainda exige uma intervenção humana mais profunda. O mesmo vale para **compreender impactos no sistema como um todo**: mesmo quando a IA oferece respostas plausíveis para perguntas como o impacto de um componente no bundle, se uma dependência permite tree shaking ou como um padrão de data fetching afeta, nos [Core Web Vitals](https://web.dev/articles/vitals), a pontuação de [INP (Interaction to Next Paint)](https://web.dev/articles/inp), só ficamos tranquilos depois que uma pessoa confere mais uma vez.

Também não podemos deixar de lado **segurança e avaliação de riscos**, como mostra o problema dos 45% de vulnerabilidades do OWASP visto acima. O mesmo se aplica à **manutenção do design system e da consistência**, que exige verificar se um novo componente está alinhado aos tokens, às regras de acessibilidade e aos padrões de interação do sistema existente, e à **compreensão do contexto do cliente e do mercado**, que demanda perguntar por que uma funcionalidade é necessária e em qual fluxo do usuário ela deve ser inserida.

Por fim, tomando emprestada a expressão usada no texto de [yceffort](https://yceffort.kr/2026/02/frontend-engineering-in-ai-era), se chamarmos de “diferença entre a complexidade do sistema e o grau em que a equipe o compreende”, a **gestão da dívida cognitiva (Cognitive Debt)** é uma área em que essa distância se amplia ainda mais rapidamente após a adoção da IA. Portanto, reduzir essa lacuna continua sendo responsabilidade das pessoas.

> Não são os desenvolvedores que desaparecem, mas a forma do trabalho que eles faziam. O gargalo passou da “velocidade de criação” para a “velocidade de decisão”.

No mesmo contexto, [“Os desenvolvedores serão substituídos pela IA?”, da Toss](https://toss.tech/article/will-ai-replace-developers), oferece um diagnóstico mais contundente. A ideia central é a seguinte: a IA não está substituindo toda a força de trabalho; está eliminando a escada de aprendizagem (apprenticeship ladder). Daqui a dez ou vinte anos, quando os atuais profissionais seniores se aposentarem, faltarão pessoas da próxima geração capazes de projetar sistemas complexos. Não é um problema da ordem de “o que faremos com as contratações da nossa empresa no ano que vem?”, mas uma espécie de bomba-relógio com efeito retardado para todo o setor. (Acho que é um texto realmente bem escrito para um período de tantas incertezas.)

A “primeira versão que funciona” criada pela IA corresponde a 70%. Os 30% necessários para chegar a uma “versão que pode ser entregue a usuários reais” são território humano. E a capacidade de preencher esses 30% não surge da noite para o dia. Essa é a essência do problema da escada de aprendizagem. Se desaparece o tempo de “pôr a mão na massa” escrevendo boilerplate e componentes simples, também desaparecem as pessoas capazes de completar esses 30%.

O texto original de Hwidong Bae apontava como “cinco competências fundamentais de um engenheiro excepcional” a **escrita de bom código, a maximização do valor atual (equilibrando rapidez de lançamento e manutenção de longo prazo), a tomada de decisões baseada em dados, o apoio eficaz às decisões dos colegas e o aprendizado contínuo**. Todas as cinco continuam válidas na era da IA, mas a última delas ocupa a posição mais vulnerável. O aprendizado em si não desapareceu; o objeto do aprendizado mudou. Antes, aprendíamos “como usar esta ferramenta”; agora, precisamos dedicar tempo a aprender “como este sistema inteiro funciona”. Mais assustador ainda é o [problema apontado por Evan Moon](https://evan-moon.github.io/2026/04/18/developers-who-stopped-growing-in-ai-era/): “no momento em que a IA assume a escrita do código, a carga cognitiva do cérebro cai drasticamente”. Reduzir a carga cognitiva parece bom, mas é perigoso porque essa carga era justamente a matéria-prima do aprendizado. **Quanto mais cômodo, menos se cresce.**

Daí surge naturalmente uma pergunta. Então as três trilhas do texto de Hwidong Bae — especialização em web, produto e operações — deixaram de fazer sentido?

Penso diferente. As trilhas continuam válidas. O mais correto é entender que cada uma evoluiu um estágio para se adaptar à era da IA. Vejamos como o cenário mudou em cada uma delas.


## De produtor a “validador”

No texto original de Hwidong Bae, a trilha de especialização em web era agrupada sob o nome **Software Engineer**. Seus pontos centrais eram “uma compreensão profunda e o domínio da internet, dos navegadores e de HTML/CSS/JS”, o conhecimento dos pontos fortes e fracos das ferramentas do ecossistema web, a experiência com troubleshooting e uma postura atenta a novas tecnologias. Como caminhos para chegar a sênior, o texto sugeria **engenheiro de empresas que desenvolvem ferramentas para o ecossistema web / educador de frontend / tech lead em organizações com produtos complexos**. Em poucas palavras, são “pessoas que investigam a fundo os princípios de funcionamento dos navegadores e de HTML/CSS/JS”; até um ou dois anos atrás, sua principal arma era “ser capaz de escrever código com mais precisão que qualquer outra pessoa”.

Como o valor dessas pessoas mudou na era da IA? Em termos apenas de velocidade para escrever código, a IA já as alcançou. Porém, **“a capacidade de avaliar com precisão o código escrito pela IA”** é algo que elas praticamente monopolizam.

- Pessoa sem formação técnica que usa IA: a implementação atende aos meus requisitos e funciona normalmente.
- Desenvolvedor que usa IA: funciona, mas esta dependência pode causar certos problemas, e melhorar este padrão desta maneira está mais de acordo com as convenções. Vamos rever as partes relacionadas.

No estudo da Veracode abordado acima, vimos taxas de falha de 86% em XSS e 88% em injeção de logs. As pessoas capazes de identificar e corrigir esses problemas são justamente especialistas como nós. Elas evoluem naturalmente para uma função sênior de controle de qualidade (QA) dos resultados produzidos pela IA.

Além disso, surgiu um tema inteiramente novo no território desses especialistas: **UI generativa (Generative UI)** e **design de interfaces de IA**. Alguns exemplos são interfaces de chat que exibem respostas do LLM por streaming, controles de abort para interromper a geração, renderização progressiva de Markdown e blocos de código, UX que exibe inline os resultados de chamadas de ferramentas e integrações de assistentes por meio do [Vercel AI SDK](https://sdk.vercel.ai/) ou do [MCP (Model Context Protocol)](https://modelcontextprotocol.io/). A demanda por “pessoas que conhecem com precisão os princípios de funcionamento da web e, ao mesmo tempo, entendem as características dos LLMs e sabem aplicá-las” está explodindo nessa área.


## A evolução natural para Product Engineer

A trilha de especialização em produto foi a mais beneficiada. Quem conhece profundamente o mercado e os clientes e se comunica com frequência com stakeholders externos ganhou uma ferramenta muito mais poderosa ao incorporar a IA. Outra característica dessa trilha era a possibilidade de expandir a carreira para outras funções, com caminhos seniores como **engenheiro de growth ou consultor / transição para PM, PO ou CPO**.

Uma mudança interessante é que o nome dessa trilha começou a se consolidar como padrão global. O texto original já a chamava de “Product Engineer”, mas, quando o li, a expressão ainda me parecia pouco familiar. Um ano depois, ela se estabeleceu a ponto de a [Vercel substituir “Fullstack Engineer” por “Product Engineer” em todas as descrições de cargo](https://leerob.com/product-engineers).

Lee Robinson aponta três qualidades essenciais de um Product Engineer.


- **Foco em iteração (Iteration)**: percorre rapidamente o ciclo de implantação → feedback → ajuste.
- **Centralidade no cliente**: conversa diretamente com clientes para melhorar o produto.
- **Pragmatismo**: “toda escolha tecnológica é apenas um meio”. Ferramentas que não contribuem para o objetivo do produto são abandonadas sem hesitação.

Há uma armadilha aqui: é perigoso enxergar o engenheiro especializado em produto apenas como “quem faz rápido”. Com a chegada da IA, esse risco aumentou. Afinal, “implementar funcionalidades rapidamente” agora é algo que profissionais de qualquer área podem fazer com ferramentas de IA. O diferencial de um Product Engineer está na “capacidade de definir com precisão o problema do cliente e validá-lo rapidamente com a menor solução possível”, não em “ser rápido com as mãos”.

Nesse movimento, **Design Engineer** começou a ganhar status de cargo formal. A Vercel está contratando [engenheiros de design em uma trilha oficial com salários acima de US$ 200 mil](https://cjroth.com/blog/2026-02-18-building-an-elite-engineering-culture), e Linear e Stripe avançam em uma direção semelhante. É uma função que elimina o próprio handoff entre frontend e design. Como a IA desenha rapidamente, as competências necessárias para lidar ao mesmo tempo com “o que desenhar” e “se o resultado está de acordo com um design system consistente” ficaram ainda mais escassas.


## Orquestrador de IA

A trilha de especialização em operações é a que passa pela transformação mais drástica. No texto original, Hwidong Bae a classificava como **Full-Stack Engineer** e a definia como “uma pessoa muito interessada em estrutura, integração, testes e implantação de projetos, capaz de lidar diretamente com APIs e infraestrutura simples, preencher lacunas na organização e melhorar processos”. Nos últimos um ou dois anos, **a função de operar os próprios agentes de IA** foi acrescentada a essa base, ampliando rapidamente o alcance da trilha.

Ao resumir as [tendências de 2026](https://beyond.addy.ie/2026-trends/), ele apontou o conceito de **“orquestração de agentes de programação (Orchestrating Coding Agents)”** como um dos pontos centrais. Isso significa ir além de dar ordens a uma única IA: trata-se de projetar e operar um sistema em que vários agentes de IA colaboram simultaneamente. No mesmo contexto, ele propôs um framework chamado [“agent-skills”](https://github.com/addyosmani/agent-skills), e também vem ganhando espaço a ideia de codificar diretamente na lógica de funcionamento dos agentes os workflows profissionais, quality gates e melhores práticas do setor.

Depois de reunir materiais relacionados, estes são, na minha visão, os novos termos com que engenheiros da trilha de operações precisarão lidar.

- **MCP (Model Context Protocol)**: padrão proposto pela Anthropic para conectar LLMs a ferramentas externas
- **Governança de IA**: gestão de quem pode usar IA, com qual contexto, e garantia de que secrets não sejam expostos
- **Avaliação de agentes (Evaluation)**: pipeline que pontua automaticamente os resultados produzidos pelos agentes
- **Gate de IA**: validação automática de segurança e qualidade antes do merge de um PR e rotulagem de código de IA

O texto original indicava como caminhos seniores dessa trilha cargos como **engenheiro de equipe de plataforma em grandes organizações / tech lead / agile coach / technical program manager (TPM) / CTO**. Esses caminhos continuam válidos, mas agora podemos acrescentar novas posições, como **“líder de infraestrutura de desenvolvimento com IA”** e **“engenheiro de produtividade de desenvolvimento (DevProd)”**.

Enquanto as três trilhas evoluem cada uma à sua maneira, há competências que se tornaram mais importantes em todas elas. Eu queria pensar inicialmente em um horizonte de cinco anos, mas, diante do ritmo atual de avanço, até a unidade de um ano parece longa demais. Por isso, vou limitar o horizonte a algo como “o próximo ano” e destacar as competências que, na minha visão, ganharão mais importância.


## Cinco competências

**A primeira é a capacidade de escrever especificações (Specification).** Na era da IA, o “ponto de partida da programação” não é o teclado, mas a **especificação**. A capacidade de registrar com precisão o que pedir à IA se tornou mais importante que o próprio código. Aqui, “especificação” não significa necessariamente um documento RFC grandioso. Pode ser um **teste** que expressa em código o comportamento esperado da lógica de negócio, uma história do **Storybook** que organiza os cenários e o contrato visual de um componente de UI ou uma **definição de tipos** que explicita o contrato do fluxo de dados. No fim, é o trabalho de estabelecer previamente critérios para validar de forma automática o resultado criado pela IA. Quando programamos com IA sem essa base, os problemas se acumulam.

**A segunda é a capacidade de validação e discernimento.** A IA produz com confiança código plausível, porém incorreto. Por isso, considero que “a capacidade de revisar código de IA com rapidez e precisão” se tornou essencial. É preciso identificar se foram esquecidos headers de segurança, sanitização de inputs ou tokens CSRF; se a acessibilidade continua funcionando — ARIA, navegação por teclado e focus trap —; e se há problemas nos impactos de desempenho, como custo de renderização, memória e tamanho do bundle. Jogar AI slop em um PR sem revisão é negligenciar a própria função como engenheiro. Quem aperta o botão de merge ainda é uma pessoa, e essa responsabilidade não pode ser transferida para a IA. O fato de os profissionais seniores apresentarem a menor confiança em IA na pesquisa do Stack Overflow provavelmente se deve, no fim das contas, a terem olhos treinados para encontrar justamente esses detalhes.

**A terceira é a compreensão de sistemas e o pensamento arquitetural.** A IA lida bem com um arquivo por vez e tem grande capacidade de perceber fluxos e relações. Ela corrige sintomas rapidamente, mas um desenvolvedor competente encontra a causa raiz. Uma forma de desenvolver essa competência é realizar atividades deliberadas, como Architecture Retrospectives. Como o código muda mais rápido, se não elevarmos conscientemente a compreensão que a equipe tem do sistema, a dívida cognitiva se acumulará depressa.

**A quarta é a capacidade de orquestrar IA.** A competência de lidar com a própria IA também está se separando em um conjunto específico de habilidades. Já não se trata simplesmente de “escrever bons prompts”, mas de uma área que exige tratar como um todo a capacidade de dividir o trabalho em tickets pequenos, escolher qual modelo usar para cada tarefa, projetar pipelines de avaliação e validação de agentes e definir estratégias de recuperação (rollback) em caso de falha. [Steve Yegge](https://sourcegraph.com/blog/revenge-of-the-junior-developer) organiza essa evolução em **seis waves (traditional → completions → chat → coding agents → agent clusters → agent fleets)**.

**A quinta é Context Engineering.** É um conceito que [Karpathy e Tobi Lütke, CEO da Shopify, começaram a promover juntos em meados de 2025](https://www.faros.ai/blog/context-engineering-for-developers). Em poucas palavras, trata-se da “capacidade de planejar qual contexto mostrar à IA, em que formato e em qual quantidade”. Na prática, aparece de formas como o trabalho com **arquivos CLAUDE.md / rules**, que registra convenções do projeto, princípios de arquitetura e proibições em locais acessíveis à IA; a **redução intencional do contexto**, que seleciona apenas os módulos relevantes em vez de inserir todos os arquivos no contexto; a **separação explícita de etapas**, que divide planejamento → implementação → validação em sessões distintas para evitar a contaminação do contexto; e o **contexto externo via MCP**, que conecta, por meio de interfaces padronizadas, fontes externas como design systems, schemas de API e dados de monitoramento. A [documentação oficial da Anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) chama isso de “the new prompt engineering” e afirma categoricamente que um único prompt jamais consegue conter o conhecimento arquitetural, os padrões e a tribal wisdom de um sistema. Em outras palavras, “projetar um ambiente em que a IA sempre receba um bom contexto” se tornou muito mais importante do que “escrever um bom prompt de uma só vez”.

Se você chegou até aqui, uma pergunta surge naturalmente: então, concretamente, como estudar? Os métodos que uso são, em linhas gerais, quatro.


## Como estudar

O item “aprendizado contínuo” citado no texto original continua válido, mas precisamos mudar **a distribuição do tempo de estudo**.

Há áreas às quais dedicávamos muito tempo e que agora podem receber menos. Por outro lado, também há áreas complexas que antes evitávamos por serem difíceis ou demoradas. Entre estas últimas estão a escrita de especificações de testes, o uso de ferramentas de medição de desempenho — [Lighthouse](https://developer.chrome.com/docs/lighthouse), [WebPageTest](https://www.webpagetest.org/) e Chrome DevTools Performance —, acessibilidade ([WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/)) e segurança, especialmente o [OWASP Top 10](https://owasp.org/www-project-top-ten/). Também há áreas completamente novas a aprender, como Vercel AI SDK, LangChain.js, MCP, padrões de UI com streaming e pipelines de avaliação de agentes. **É importante reconhecer quais competências eu preciso desenvolver e distribuir meu tempo de acordo com isso.**

O código produzido por IA tende a crescer demais. Ela gera centenas de linhas por minuto. Por isso, se não gerenciarmos conscientemente o tamanho dos PRs e a frequência de merge, o próprio code review entra em colapso. Dentro das empresas, após a adoção da IA, o tamanho médio dos PRs aumentou 18%, os incidentes por PR subiram 24% e a taxa de falha de mudanças cresceu 30%. Considerando também os dados discutidos acima, quando escrevemos grandes blocos e fazemos merge de tudo de uma vez, **fica difícil compreender o fluxo e refletir a intenção; por isso, é importante granularizar as unidades de trabalho.**

Há uma prática diretamente ligada ao problema da redução da carga cognitiva apontado no texto de Evan Moon: é bom reservar uma ou duas horas por dia para escrever código sem IA. Desenhar a arquitetura à mão ou ler diretamente, linha por linha, código de uma área pouco familiar são alguns exemplos. (Eu também tento programar sem IA todos os dias naquele período sonolento depois do almoço. É um tempo que reservo para não me afastar de uma familiaridade antiga.)

Isso não serve apenas para “não esquecer o jeito antigo”. A sua própria profundidade deixa de crescer durante o tempo em que a IA faz o trabalho por você. Competências como validação e discernimento e compreensão do sistema são função do tempo que você passou enfrentando os problemas diretamente.


## Portanto, nós

Depois de tudo isso, a verdade é que o perfil do engenheiro frontend que sobrevive na era da IA não é tão diferente da conclusão apresentada no texto original. Estes eram os três pontos que ele destacava sobre bons engenheiros seniores.

- Procura permanecer **fiel aos fundamentos**. (Mantém e fortalece continuamente as cinco competências fundamentais.)
- Mesmo sem ser o líder formal, exerce influência natural por meio de um comportamento exemplar.
- Não se satisfaz apenas em concluir bem o trabalho recebido; observa o contexto anterior e posterior e gera um impacto maior.

Aplicando isso à perspectiva da era da IA, temos o seguinte.

- Mantém-se fiel aos **fundamentos** que vão além do código produzido pela IA: web, sistemas e domínio.
- Define a direção por conta própria, não a IA. Mesmo sem ser a pessoa formalmente responsável, decide “para onde devemos ir”.
- Não usa a IA apenas como ferramenta de produtividade pessoal; usa-a para eliminar gargalos da equipe e do sistema.

Ao examinar os textos de Andrej Karpathy, autoridade em OpenAI, vemos que a essência do **“agentic engineering”** que ele enfatiza agora é, no fim, a mesma: projetar o sistema, especificar as restrições e usar a IA para acelerar uma implementação cujo raciocínio já foi concluído mentalmente. As ferramentas mudam, mas o controle da direção continua nas mãos das pessoas.

A mensagem final do texto original também era que se torna sênior “quem não se satisfaz apenas em concluir bem o trabalho recebido, mas observa o contexto anterior e posterior e gera um impacto maior”. Na era da IA, apenas a definição desse “impacto” mudou. Há quem faça merge de uma tela produzida pela IA em uma hora pensando “funciona, então está pronto”; e há quem passe mais trinta minutos verificando até que ponto essa tela é adequada em termos de acessibilidade, segurança, desempenho e coerência com o sistema. Daqui a um ano, quem será reconhecido como sênior é o segundo. Sobrevive quem se posiciona do lado dos 30% na fronteira entre 70% (funcionamento) e 30% (aplicação e uso).

Espero que os engenheiros frontend que lerem este texto também encontrem sua própria resposta para a pergunta “o que mais devo estudar agora?”. Ninguém sabe a resposta certa, mas tenho bastante convicção de que, quanto mais a IA escreve código, mais sobrevivem as pessoas capazes de enxergar “o que existe além do código”. Encerro na esperança de que, daqui a um ano, eu possa voltar a escrever sobre como esse cenário terá mudado mais uma vez.

**(Se este texto parecer óbvio demais ou ultrapassado daqui a um ano, talvez isso signifique que reagimos bem.)**


## Referências

:::ref
:::
