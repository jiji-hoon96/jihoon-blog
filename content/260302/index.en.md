---
emoji: 🤖
title: 'The AI Frontend Engineer'
seoTitle: 'How Frontend Engineers Can Survive the AI Era: New Skills in Verification, Specification, and Judgment'
date: '2026-03-02'
categories: frontend career AI
description: 'In an era when AI writes code for us, how can frontend engineers grow and survive? Drawing on verified sources including Karpathy’s agentic engineering, Vercel v0, the Stack Overflow Survey, and METR research, this article outlines the new skills and learning strategies centered on verification, specification, and judgment.'
keywords: 'frontend in the AI era, developers in the AI era, vibe coding, agentic engineering, AI coding tools, Product Engineer, frontend career roadmap'
locale: en
translationOf: '260302'
sourceHash: 8622877ee90352b24b0ec5131450def442d07449b2b669894ba2f674c2508509
---

In this post, I want to share my personal perspective on **how engineers can grow and survive alongside AI**.

One of the articles that made the strongest impression on me as a junior was Hwidong Bae’s [“Frontend Engineer Career Roadmap: Three Specialization Tracks for Juniors”](https://kr.linkedin.com/posts/hwidongbae_%ED%94%84%EB%A1%A0%ED%8A%B8%EC%97%94%EB%93%9C-%EC%97%94%EC%A7%80%EB%8B%88%EC%96%B4-%EC%BB%A4%EB%A6%AC%EC%96%B4-%EB%A1%9C%EB%93%9C%EB%A7%B5-%EC%A3%BC%EB%8B%88%EC%96%B4%EB%A5%BC-%EC%9C%84%ED%95%9C-3%EA%B0%80%EC%A7%80-%EC%A0%84%EB%AC%B8%EC%84%B1-%ED%8A%B8%EB%9E%99-activity-7013888624140189696-XiIz). It organizes frontend engineering careers into three tracks—**web specialization (Software Engineer), product specialization (Product Engineer), and operations specialization (Full-Stack Engineer)**—and goes on to identify “five foundational capabilities of exceptional engineers” and “three keys to becoming a senior.” At the time, the biggest question was which capabilities to build for each track. Yet less than two years after I read it, the question itself has changed completely.

When I talk with fellow engineers these days, their concerns feel noticeably different from those I had been hearing over the past several years.

- “Our company adopted AI, and if we give it a design mockup, it builds almost everything. It’s convenient, but...”
- “The hiring market is brutally cold.”
- “I’m afraid to merge AI-generated code as is, but reviewing every line defeats the efficiency gains. I’m not sure what to do.”

I went through—and am still going through—a similar period. Just a year or two ago, I thought of AI as merely a useful assistant. Now, it is hard to imagine developing without it at all (I am also asking Claude to help with research as I write this). Think of this article as a sequel to Hwidong Bae’s piece: my attempt to describe how the landscape has changed since then and, from my own perspective, what additional capabilities frontend engineers need to develop within it.

Once again, I have tried to find and verify as many sources as possible. But because this field changes so quickly, some parts may already be outdated by the time this article is published. If you have a rebuttal or something worth discussing, please leave a comment anytime.


## “Doesn’t AI Do Everything Now?”

There is one question we need to address first. Is the statement “AI does everything now” actually true? How much of it is reality, and where does the fantasy begin?

In February 2025, [Andrej Karpathy](https://x.com/karpathy/status/1886192184808149383), an OpenAI co-founder and former director of AI at Tesla, posted the following on Twitter.

::::quote
:::translation
There is a new kind of coding I call “vibe coding,” where you fully surrender to the vibes, embrace exponential growth, and even forget that the code itself exists.
:::

:::original
There's a new kind of coding I call 'vibe coding', where you fully give in to the vibes, embrace exponentials, and forget that the code even exists.
:::
::::

In short, **vibe coding** is “a way of coding where you hand the keyboard to AI and simply describe what you want in natural language.” There are no architecture documents, no boilerplate, and no hunting for semicolons. The code simply runs on vibes. In less than a year, the term became standard vocabulary in English-speaking developer communities.

Yet exactly one year later, in February 2026, the same Karpathy [took a step back](https://thenewstack.io/vibe-coding-is-passe/). He proposed replacing the term vibe coding with **“agentic engineering.”** The distinction is clear.

- **Vibe coding**: Describing what you want and accepting the result
- **Agentic engineering**: Designing the system, specifying constraints, and using AI to accelerate an implementation you have already reasoned through in your head

A year ago, the baseline assumption was, “Just tell it what to do and it will build everything.” Now, “the ability to design what to ask AI to do and how to ask it” has itself become an engineering capability. This shift is not merely one person’s tweet. Around the same time, Google engineer [Addy Osmani](https://addyosmani.com/) published [Beyond Vibe Coding: From Coder to AI-Era Developer](https://www.amazon.com/Beyond-Vibe-Coding-AI-Era-Developer/dp/B0F6S5425Y), stating plainly: “AI is an assistant, not an autonomously trustworthy coder. You are the senior developer, and the LLM exists to accelerate your judgment.”


### The Tools Are Racing Ahead

The tools are also evolving rapidly in step with this shift. As of May 2026, the most frequently discussed coding tools include Cursor, Claude Code, GitHub Copilot, Windsurf, v0 by Vercel, Bolt.new, and Devin.

The evolution of v0 is especially symbolic. Vercel uses the phrase [“the 90% problem”](https://venturebeat.com/infrastructure/vercel-rebuilt-v0-to-tackle-the-90-problem-connecting-ai-generated-code-to), meaning that 90% of real-world development takes place within existing codebases and infrastructure. At first, v0 only needed to excel at greenfield prototypes. Now it can import a GitHub repository directly, work within it, enforce a design system, and automatically pull in deployment environment variables. In effect, toolmakers are directly answering senior engineers who ask, “Isn’t AI only good at making toy demos?”

Big Tech codebases illustrate this change most clearly.

Google’s Sundar Pichai [announced during the Q3 2024 earnings call that “more than 25% of new code is generated by AI and then reviewed and accepted by engineers”](https://fortune.com/2024/10/30/googles-code-ai-sundar-pichai/), and said in April 2025 that the figure had risen above 30%. Microsoft’s Satya Nadella [revealed at LlamaCon in April 2025 that “as much as 30% of our code is written by AI”](https://www.cnbc.com/2025/04/29/satya-nadella-says-as-much-as-30percent-of-microsoft-code-is-written-by-ai.html). Meta’s internal target has risen as high as “by the first half of 2026, 65% of engineers will generate more than 75% of their commits with AI.”

The trend is no different in Korea. [Toss](https://toss.tech/article/toss-frontend-ai-docs) built an AI-powered documentation system to improve developer experience so developers no longer have to search for documentation, and went a step further by exploring topics such as [“What Happened When We Removed Designers in the AI Era”](https://toss.tech/article/removing_designers_in_ai_era). Every Tuesday, Karrot shares team experiments through [AI Show & Tell](https://medium.com/daangn), and has begun using the [recruiting slogan](https://about.daangn.com/blog/archive/%EB%8B%B9%EA%B7%BC-%ED%95%B4%EC%BB%A4%ED%86%A4-%EC%97%94%EC%A7%80%EB%8B%88%EC%96%B4-%EC%B1%84%EC%9A%A9/) “Beyond Engineer, Become a Builder.” Woowa Brothers has published articles such as [“In an Era When AI Writes Code, Do You Still Want to Become a Developer?”](https://techblog.woowahan.com/22828/), arguing that “the essence of being a developer lies not in code, but in the ability to define and solve problems.”


### But the Numbers Tell a Slightly Different Story

At this point, it is easy to conclude, “So now you can just tell AI what to do and everything works.” But the actual data tells a somewhat different story.

First, consider the figures from the [**2025 Stack Overflow Developer Survey**](https://survey.stackoverflow.co/2025/ai), a comprehensive analysis of the state of software development.

- 84% of developers said they use or plan to use AI tools, up from 76% in 2024.
- Among professional developers, 51% use AI tools every day.
- Yet **positive sentiment toward AI tools actually declined**. After exceeding 70% in both 2023 and 2024, it fell to 60% in 2025.
- Senior developers with more than ten years of experience have the lowest trust in AI output.

In short: **“Everyone uses it, but the longer they do, the less they trust it.”**

A 2025 experiment conducted by the nonprofit research institute [**METR**](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/) revealed the gap between perception and reality even more dramatically. It was a controlled experiment in which 16 experienced open-source developers—averaging five years of experience and 1,500 commits—completed 246 tasks and were randomly assigned whether to use AI. The results were as follows.

- Before starting, the developers predicted that AI would make them 24% faster.
- Immediately after finishing, they still estimated that they had been about 20% faster.
- Actual measurements, however, showed that they were **19% slower**.

The researchers’ explanation is revealing. The acceptance rate for AI-generated code was below 44%; rejected code still required time to review and test; and even accepted code demanded substantial review and revision. This gap—the illusion of feeling faster despite actually slowing down—is one reason senior developers are becoming increasingly skeptical of AI.

Nor is the quality of AI-generated code itself especially polished. Consider [**Veracode’s**](https://www.veracode.com/blog/genai-code-security-report/) experiment in which more than 100 AI models were asked to write code.

- **45% of AI-generated code contained OWASP Top 10 security vulnerabilities**.
- The failure rate for **XSS (cross-site scripting) protection was 86%**.
- The failure rate for log injection protection was 88%.
- Another study reported that the vulnerability density of AI code was **2.7 times higher** than that of human-written code.

The 86% failure rate for XSS, in particular, deserves serious attention from frontend engineers. It shows exactly what it means to merge an AI-generated form input unchanged. (Developers with frontend security-audit experience feel uneasy and concerned even when they write `dangerouslySetInnerHTML` themselves; it feels even more frightening when AI quietly slips it in.)

The quality signals are similar elsewhere. [**GitClear**](https://www.gitclear.com/ai_assistant_code_quality_2025_research) analyzed 211 million lines of code changes made between 2020 and 2024 and found the following.

- Code churn—the share of code reverted within two weeks of being written: 5.5% in 2020 → **7.9%** in 2024
- Share of changes devoted to refactoring: 25% in 2021 → **below 10%** in 2024
- Copy-and-paste (clone) rate: 8.3% in 2021 → **12.3%** in 2024 (and an astonishing fourfold increase in 2025)

The interpretation is not difficult. Our ability to produce code quickly has increased, while our ability to produce code worth refining has declined. [Apiiro’s data](https://www.softwareseni.com/ai-generated-code-security-risks-why-vulnerabilities-increase-2-74x-and-how-to-prevent-them/) from Fortune 50 companies is even more striking. AI-assisted developers produce three to four times as many commits as their peers, but also ten times as many security findings. Privilege-escalation paths rose by 322%, while architectural design flaws surged by 153%.


## What AI Has Replaced—and What It Has Not

The tools are racing ahead, yet the numbers are nuanced. So what exactly has AI replaced, and what has it not yet replaced? We need a clear distinction to understand where to invest our time.

What AI has replaced is a large share of developers’ manual typing. We spend less time writing boilerplate and repetitive code; given a design mockup, a screen that follows the conventions can appear within minutes; and the time spent searching for syntax and APIs, as well as the learning curve, has fallen sharply. In short, AI has **flattened the speed of production**.

But it has not yet replaced the domain of “judgment.” (More precisely, it has “not yet met our expectations.” People differ in their ability to use AI, but this discussion is based on the average user experience.)

The first sticking point is **translating requirements into specifications**. Turning ambiguous business requirements into precise edge cases and state machines still requires deeper human involvement. The same is true of **understanding system-wide impact**. Questions such as how a component affects the bundle, whether a dependency can be tree-shaken, or how a data-fetching pattern affects the [Core Web Vitals](https://web.dev/articles/vitals) metric [INP (Interaction to Next Paint)](https://web.dev/articles/inp) may receive plausible answers from AI, but a human still needs to examine them before we can feel confident.

We also cannot omit **security and risk assessment**, as illustrated by the 45% OWASP vulnerability rate above. The same applies to **maintaining the design system and consistency**—checking whether a new component aligns with the existing system’s tokens, accessibility rules, and interaction patterns—and to **understanding customer and market context**, such as why a feature is needed and where it belongs in the user flow.

Finally, borrowing a phrase from [yceffort’s article](https://yceffort.kr/2026/02/frontend-engineering-in-ai-era), **managing cognitive debt**—the “gap between a system’s complexity and the degree to which the team understands that system”—has actually become a faster-growing concern since AI adoption. Closing that gap remains a human responsibility.

> Developers are not disappearing; the form of developers’ work is changing. The bottleneck has shifted from “the speed of building” to “the speed of deciding.”

In the same vein, Toss’s [“Will AI Replace Developers?”](https://toss.tech/article/will-ai-replace-developers) offers a weightier diagnosis. Its central point is this: AI is not replacing the entire workforce; it is removing the apprenticeship ladder. Ten or twenty years from now, when today’s senior engineers retire, there may be too few people in the next generation capable of designing complex systems. This is not merely a question of “what will our company do about hiring next year?” It is a delayed-action bomb for the entire industry. (I think it is an exceptionally well-written article for a time when so many of us are wrestling with these questions.)

The “first version that works” produced by AI is 70%. The remaining 30%—getting it to “a version safe to serve to real users”—belongs to humans. And the ability to fill that 30% does not appear overnight. This is the essence of the apprenticeship-ladder problem. If the time spent “getting your hands dirty” writing boilerplate and simple components disappears, so do the people who will eventually be able to fill that 30%.

Hwidong Bae’s original article named **writing good code, maximizing present value (balancing fast delivery with long-term maintainability), making data-driven decisions, helping colleagues make effective decisions, and learning continuously** as the “five foundational capabilities of exceptional engineers.” All five remain relevant in the AI era, but the last is in the most precarious position. Learning itself has not disappeared; its subject has changed. Where we once learned “how do I use this tool?”, we now need to spend time learning “how does this entire system work?” More troubling still is the problem [Evan Moon identifies](https://evan-moon.github.io/2026/04/18/developers-who-stopped-growing-in-ai-era/): “the moment AI takes over code writing, the brain’s cognitive load drops dramatically.” Reduced cognitive load sounds appealing, but it is dangerous because that load was the very material from which learning emerged. **The more comfortable it gets, the less you grow.**

This naturally raises a question. Do the three tracks in Hwidong Bae’s article—web specialization, product specialization, and operations specialization—no longer matter?

I see it differently. The tracks themselves remain valid. It is more accurate to say that each has evolved by one stage for the AI era. Let us examine how the landscape has changed for each one.


## From Producer to “Verifier”

In Hwidong Bae’s original article, the web specialization track was grouped under the title **Software Engineer**. Its core capabilities were “a deep understanding and practical command of the internet, web browsers, and HTML/CSS/JS,” familiarity with the trade-offs of web ecosystem tools, troubleshooting experience, and sensitivity to emerging technologies. The suggested senior paths were **engineer at a web tooling company, frontend educator, or tech lead in a complex product organization**. In short, these were “people who dig deeply into how browsers and HTML/CSS/JS work,” and until a year or two ago, their greatest advantage was that “they could write correct code more accurately than anyone else.”

How has their value changed in the AI era? In terms of coding speed alone, AI has caught up. Yet **the ability to accurately evaluate AI-generated code** has become something they almost uniquely possess.

- Non-developer using AI: It implemented my requirements, and it works correctly.
- Developer using AI: It works, but this dependency could cause certain problems, and improving this pattern in this way would better fit our conventions. Let’s examine the related areas again.

The Veracode study discussed earlier found failure rates of 86% for XSS and 88% for log injection. Experts like us are the people capable of finding and fixing those failures. They naturally evolve into senior quality-assurance roles for AI output.

There is another development: an entirely new topic has entered the expert domain—**Generative UI** and **AI interface design**. Examples include chat UIs that render LLM responses as they stream, abort controls that let users stop generation midway, progressive rendering of Markdown and code blocks, UX that displays tool-call results inline, and assistant integrations using the [Vercel AI SDK](https://sdk.vercel.ai/) or [MCP (Model Context Protocol)](https://modelcontextprotocol.io/). Demand is exploding for people who “understand precisely how the web works while also understanding the behavioral characteristics of LLMs and knowing how to apply them.”


## The Natural Evolution into a Product Engineer

The product specialization track has benefited the most. People who understand markets and customers well and communicate frequently with external stakeholders gained a far more powerful tool the moment AI entered the picture. Another hallmark of this track was that its suggested senior paths included expansion into other roles, such as **growth engineer or consultant, or a transition to PM, PO, or CPO**.

An interesting change is that the track’s name has begun to establish itself as a global standard. The original article already called it “Product Engineer,” but when I first read it, the term still felt somewhat unfamiliar. A year later, it has become established enough that [Vercel renamed every “Fullstack Engineer” role in its job descriptions to “Product Engineer”](https://leerob.com/product-engineers).

Lee Robinson identifies three core qualities of a Product Engineer.


- **Iteration-mindedness**: Moving quickly through the deploy → feedback → adjustment cycle.
- **Customer centricity**: Improving the product by speaking directly with customers.
- **Pragmatism**: “Every technology choice is merely a means to an end.” Tools that do not advance the product goal are discarded without hesitation.

There is one trap here: it is dangerous when product-focused engineers are perceived merely as “people who build quickly.” With the arrival of AI, that danger has grown. “Shipping features fast” is now something people in virtually any role can do with AI tools. A Product Engineer’s differentiator is “the ability to define the customer’s problem accurately and validate it quickly with the smallest possible solution,” not “having fast hands.”

Within this trend, **Design Engineer** has begun to rise into a formal role. Vercel is hiring [design engineers as a formal career track with compensation above $200K](https://cjroth.com/blog/2026-02-18-building-an-elite-engineering-culture), and Linear and Stripe are moving in similar directions. The role eliminates the handoff between frontend and design itself. Because AI can draw quickly, the combined ability to decide “what to draw” and determine “whether the result fits a consistent design system” has become even scarcer.


## AI Orchestrator

The operations specialization track is changing most dramatically. Hwidong Bae’s original article classified this track as **Full-Stack Engineer**, defining it as “someone deeply interested in project structure, integration, testing, and deployment; someone who can handle simple APIs and infrastructure directly, fill gaps in the organization, and improve processes.” Over the past year or two, **the role of operating AI agents themselves** has been added on top, rapidly expanding the track’s scope.

In a review of [2026 trends](https://beyond.addy.ie/2026-trends/), **“Orchestrating Coding Agents”** was identified as a central concept. It means going beyond assigning work to one AI and instead designing and operating a system in which multiple AI agents collaborate simultaneously. In the same vein, the [“agent-skills”](https://github.com/addyosmani/agent-skills) framework was proposed, along with the idea of encoding professional workflows, quality gates, and industry best practices directly into agent behavior.

After reviewing the related material, these are the new keywords I believe engineers in the operations track need to work with.

- **MCP (Model Context Protocol)**: Anthropic’s proposed standard for connecting LLMs with external tools
- **AI governance**: Managing who can use AI, with what context, and whether secrets can leak
- **Agent evaluation**: Pipelines that automatically score the output produced by agents
- **AI gates**: Automated security and quality verification before PR merges, plus labeling for AI-generated code

The original article named roles such as **platform team engineer in a large organization, tech lead, agile coach, technical program manager (TPM), and CTO** as senior paths for the operations track. Those paths remain valid, but new roles such as **“AI development infrastructure lead”** and **“developer productivity (DevProd) engineer”** have now been added.

While the three tracks are each evolving, there are also capabilities that have become more important across all of them. I originally wanted to think in terms of five years from now, but at today’s pace of progress, even a year feels like too large a unit. So I will narrow the horizon to “next year” and identify the capabilities I expect to become more important.


## Five Capabilities

**The first is the ability to write specifications.** In the AI era, the “starting point of coding” is not the keyboard but the **specification**. The ability to state precisely what AI should do has become more important than the code itself. A specification here does not mean a grand RFC document. It can be **tests** that express the expected behavior of business logic in code, **Storybook stories** that define a UI component’s scenarios and visual contract, or **type definitions** that specify the contract for data flow. Ultimately, the work is about establishing in advance the criteria that will automatically verify AI-generated output. If AI coding proceeds without those criteria, problems accumulate.

**The second is verification and judgment.** AI confidently produces code that looks plausible but is wrong. That is why I believe “the ability to review AI-generated code quickly and accurately” is itself a core capability. It means determining whether security headers, input sanitization, or CSRF tokens are missing; whether accessibility—ARIA, keyboard navigation, and focus traps—remains intact; and whether there are performance issues involving rendering cost, memory, or bundle size. Throwing AI slop into a PR without review is a dereliction of an engineer’s duty. A human still clicks the merge button, and that responsibility cannot be shifted onto AI. Senior developers may have the lowest trust in AI in the Stack Overflow survey precisely because they have the eye to catch these details.

**The third is system understanding and architectural thinking.** AI handles one file at a time well and has strong awareness of flows and relationships. AI fixes symptoms quickly, but highly capable developers find root causes. One way to build this capability is through deliberate practices such as Architecture Retrospectives. As the rate of code change accelerates, cognitive debt will accumulate quickly unless the team deliberately raises its understanding of the system as well.

**The fourth is AI orchestration.** The ability to work with AI is separating into its own skill set. This is no longer simply about writing good prompts. It now encompasses the ability to break work into small tickets, choose which model to use for a given task, design agent evaluation and verification pipelines, and define recovery strategies—including rollback—when an agent fails. [Steve Yegge](https://sourcegraph.com/blog/revenge-of-the-junior-developer) describes this progression as **six waves (traditional → completions → chat → coding agents → agent clusters → agent fleets)**.

**The fifth is Context Engineering.** Promoted since mid-2025 by [Karpathy and Shopify CEO Tobi Lütke](https://www.faros.ai/blog/context-engineering-for-developers), it can be summarized as “the ability to design what context to show AI, in what form, and how much of it.” In practice, it takes forms such as maintaining **CLAUDE.md / rules files** that place project conventions, architectural principles, and prohibitions within AI’s reach; **deliberately reducing context** by selecting only relevant modules instead of loading every file; **explicitly separating phases**—planning → implementation → verification—into different sessions to prevent context contamination; and supplying **external context through MCP**, connecting design systems, API schemas, monitoring data, and other resources through standard interfaces. [Anthropic’s official documentation](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) calls this “the new prompt engineering” and states plainly that a single prompt can never contain a system’s architectural knowledge, patterns, and tribal wisdom. Put differently, “designing an environment where AI consistently receives good context” has become far more important than “writing one good prompt.”

If you have read this far, a natural question follows: how, specifically, should we study? I use roughly four approaches.


## How to Learn

The “continuous learning” item from the original article remains valid, but we need to allocate our learning time differently.

There are areas where we once spent a great deal of time but can now spend less. By contrast, there are complex areas that we may have avoided because they were difficult or time-consuming. The latter include writing test specifications, using performance measurement tools ([Lighthouse](https://developer.chrome.com/docs/lighthouse), [WebPageTest](https://www.webpagetest.org/), Chrome DevTools Performance), accessibility ([WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/)), and security—especially the [OWASP Top 10](https://owasp.org/www-project-top-ten/). There are also entirely new areas to learn, including the Vercel AI SDK, LangChain.js, MCP, streaming UI patterns, and agent evaluation pipelines. **It is important to recognize which capabilities you need and allocate your time accordingly.**

AI-generated code tends to grow large. It can produce hundreds of lines in a minute. Unless we deliberately manage PR size and merge cadence, code review itself breaks down. Within companies, average PR size rose 18%, incidents per PR rose 24%, and the change failure rate rose 30% after AI adoption. Viewed alongside the data discussed earlier, this shows why it is important to subdivide work: writing a large change and merging it all at once makes it difficult to understand the flow and preserve intent.

There is a practice directly related to the reduced cognitive-load problem identified in Evan Moon’s article: it is worth setting aside one or two hours a day to write code without AI. Drawing an architecture by hand or reading through code in an unfamiliar area one line at a time are examples. (I also write code without AI during the drowsy period after lunch each day. It is time I use to keep from drifting too far from old, familiar habits.)

This is not merely about “avoiding forgetting the old way.” Your own depth does not grow during the time AI does the work for you. Capabilities such as verification, judgment, and system understanding are functions of the time you spend confronting problems directly.


## So, Where Does That Leave Us?

I have written at length, but the image of a frontend engineer who survives the AI era is not actually so different from the conclusion of the original article. It identified three qualities of a good senior engineer.

- They strive to **stay grounded in the fundamentals**. (Continuously maintaining and strengthening the five foundational capabilities.)
- Even without being the designated leader, they exert natural influence through exemplary behavior.
- They do not settle for completing the task in front of them; they examine the broader context and create greater impact.

Applied to the AI era, that becomes the following.

- Stay grounded in the **fundamentals** beyond AI-generated code: the web, systems, and the domain.
- Set the direction yourself, not AI. Even when you are not the designated owner, decide “where we should go.”
- Use AI not merely as a personal productivity tool, but to remove bottlenecks in the team and the system.

Looking at the writing of Andrej Karpathy, an authority on OpenAI, the core of the **“agentic engineering”** he now emphasizes is ultimately the same: design the system, specify the constraints, and use AI to accelerate an implementation you have already reasoned through in your head. The tools may change, but the directional controls remain in human hands.

The original article’s closing message was likewise that the person who becomes a senior is someone who “does not settle for completing the assigned work well, but examines the surrounding context and creates greater impact.” In the AI era, only the definition of that “impact” has changed. One person merges a screen AI built in an hour because “it works.” Another spends thirty more minutes examining how reasonable it is in terms of accessibility, security, performance, and system consistency. A year later, it is the latter who will be recognized as a senior. The people who survive will be those who stand on the 30% side of the boundary between 70% (functionality) and 30% (application and effective use).

I hope the frontend engineers reading this leave with their own answer to the question, “What should I study next?” No one knows the definitive answer, but I am quite confident that the more AI writes our code, the more the people who can see “what lies beyond the code” will survive. I will close with the hope that, a year from now, I can write again about how this landscape has changed.

**(If this article feels painfully obvious or outdated a year from now, perhaps that will mean we responded well enough.)**


## References

:::ref
:::
