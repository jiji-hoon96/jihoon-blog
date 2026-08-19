---
emoji: 🗣️
title: 'Shared Language'
seoTitle: 'Cross-Functional Communication: Ubiquitous Language and Grounding Requirements'
date: '2026-07-23'
categories: collaboration domain DDD communication
description: 'What do you do when a product manager and a developer use the same word to mean different things? Using Evans on ubiquitous language and Clark on grounding, this post examines the structure behind cross-functional communication failures and the practical tools that align resolution.'
keywords: 'ubiquitous language, shared domain language, cross-functional communication, gathering requirements, product manager developer communication, grounding common ground, Example Mapping, breadboarding, bounded context, psychological safety engineering team'
locale: en
translationOf: '260723'
sourceHash: 2577075c7c31a7debb0457c693d3c10157db4bbcf72d9bb033c5f58bdeb8e5a6
---

In this post, I want to talk about communicating across functions.

As a developer, I spend as much time working out what to build as I spend writing code. I exchange requirements with product managers, align on screens with designers, and ask people who know the domain what a term actually means. And I have experienced several times that the cost of getting this process wrong is far greater than the cost of writing the wrong code.

I recently read [Engineering Leaders' Day-to-Day Activities](https://softwareleads.substack.com/p/engineering-leaders-day-to-day-activities) by James Samuel. The author divides a leader's work into six categories, and the first one he covers is gathering information. His reason is that every decision, direction, and action depends on an accurate understanding of what is happening right now.

I do hope to take on a leadership role someday, but what struck me after reading that passage was slightly different. **If the first thing a leader handles is gathering information, then the individual contributor's counterpart to that is understanding requirements.** The way I handle requirements now will become the way I handle an organization's information later.

I am not trying to write about leadership here. This is about what I have been doing wrong as an individual contributor communicating across functions, and what I can use as tools. To state the conclusion first, I came to believe this is not purely a matter of attitude. There is an alternative framing available, called ubiquitous language, and it is worth looking at what that means.

## The same word, different meanings

In his article on [Bounded Context](https://martinfowler.com/bliki/BoundedContext.html), Martin Fowler gives the example of an electricity company. A large share of the misalignments I have run into took this shape.

::::quote
:::translation
Here the word “meter” meant subtly different things to different parts of the organization: was it the connection between the grid and a location, the grid and a customer, or the physical meter itself?
:::

:::original
here the word 'meter' meant subtly different things to different parts of the organization: was it the connection between the grid and a location, the grid and a customer, the physical meter itself
:::
::::

The same word, “meter,” meant subtly different things in different parts of the organization. And Fowler adds that this confusion is not an accident particular to that case. He says he has repeatedly seen the same confusion around polysemous words like Customer and Product.

**This did not happen because the meeting participants were bad at meetings.** When an organization contains different contexts, it is natural for the same word to diverge, and if that divergence is left alone it eventually splits the code as well.

I covered the technical background of this story once in [Domain Model](/260418). That post was about how to express a model inside the code. This post is about the stage before that model exists, when people are still talking to each other.

## A word with two meanings

But why does this repeat structurally? There are two lines of explanation.

One comes from organizational structure. In [How Do Committees Invent?](https://melconway.com/Home/Committees_Paper.html), the paper Mel Conway published in Datamation in 1968, he says that to the degree an organization is unable to flexibly change its communication structure, it stamps its own image onto every design it produces. The single sentence usually quoted as Conway's Law is in fact a formulation the author himself produced later, and I find this 1968 passage more direct.

What I took from that sentence in practical terms is the word “stamps.” It means that diverging terminology does not end with the conversation but **remains in the artifacts**. The “meter” above is exactly that. If people build separately while holding different understandings of the scope of “meter,” that difference persists not in the meeting notes but in table names, API response fields, and the wording on screens. And from that point on, the cost of fixing it is nowhere near the cost of having one more conversation.

This is where what an individual contributor can and cannot do separates. Changing an organization's communication structure is beyond an individual contributor's reach. But **making the boundaries of terminology visible** is something you can do from where you sit right now. It means writing down the scope a word has in this document, and noting explicitly when it differs from the word another team uses. Every tool we look at later is a device that makes that job easier.

The other explanation is a bit more fundamental. Seen from cognitive science, collaboration only holds together on top of a shared background in the first place. [Grounding in Communication](https://web.stanford.edu/~clark/1990s/Clark,%20H.H.%20_%20Brennan,%20S.E.%20_Grounding%20in%20communication_%201991.pdf), written by Herbert Clark and Susan Brennan in 1991, opens with the example of a piano duet. The two performers cannot even begin to coordinate without presupposing a vast amount of shared information, that is, common ground. Common ground here means mutual knowledge, mutual beliefs, and mutual assumptions. And the authors state firmly that all collective action is built on common ground and on its accumulation.

Here is the perspective I arrived at after placing these two lines side by side. **Diverging terminology is not an accident; it is the default state.** Being aligned is the exception, the state that has to be maintained at a cost. Which makes the practical question this: who pays that cost, and how?

## A developer's job is not transcription

The clearest answer I found to that question was Eric Evans's.

In Domain-Driven Design, published in 2003, Evans presents a pattern called ubiquitous language. It is often summarized as little more than “developers and domain experts should use the same terms,” but reading the original text, the prescription is far more specific. He asks the team to use the model as the backbone of the language and to commit to using that language relentlessly in all communication within the team and in the code. And the sentence that follows was the most important part for me.

::::quote
:::translation
Domain experts raise objections to terms or structures that are awkward or inadequate for conveying an understanding of the domain, while developers stay alert to any ambiguity or inconsistency that will trip up the design.
:::

:::original
Domain experts object to terms or structures that are awkward or inadequate to convey domain understanding, while developers watch for ambiguity or inconsistency that will trip up design.
:::
::::

Domain experts object to terms and structures that are awkward or inadequate for conveying domain understanding, and **developers watch for the ambiguity or inconsistency that will trip up the design**.

Reading that sentence, I corrected my understanding of my own role. Until then I had regarded myself as a receiver in requirements meetings. I thought my job was to take whatever the product side decided and implement it accurately. But the developer's share as Evans defines it was not reception. **It is finding ambiguity and handing it back.** That is not passive cooperation; it is active watching.

(For reference, Fowler rendered this sentence in his own article as “Domain experts **should** object ... developers **should** watch.” The original book has no modal verb. It is a small difference, but the original reads as more definitive. The tone is not that doing so would be good advice, but that doing so is the definition of the pattern.)

So how do you find ambiguity? Evans answers that too. Using the terms repeatedly in conversation is what exposes differences in how they are interpreted. This is how I read that sentence: ambiguity is not something you find by reading documents closely. No matter how carefully you read a spec, the fact that the word “member” means three different things will not surface. That word has to be used repeatedly against concrete cases before it splits apart. The moment a question like “Is someone who cancelled their account still a member?” comes up is that point.

## So why doesn't that conversation happen?

Everything so far is the prescription. The problem is that there was a period when I knew this prescription and still failed to practice it. Why did I not ask repeatedly?

Let us go back to Clark and Brennan's paper. The authors give the name grounding to the process of turning what has been said into part of the common ground. And they offer one principle about how people behave during that process: the principle of least collaborative effort. It comes from the observation that people do not like to work harder than they have to.

Here comes the important passage.

::::quote
:::translation
Under the principle of least collaborative effort, people should aim to reach grounding with no more combined effort than is required. Yet which actions cost effort shifts dramatically from one communication medium to another.
:::

:::original
By the principle of least collaborative effort, people should try to ground with as little combined effort as needed. But what takes effort changes dramatically with the communication medium.
:::
::::

**What takes effort changes dramatically depending on the medium.** A confirmation technique available in one medium may be outright impossible in another, or possible only at a much higher cost. The authors point out in particular that in media where the other party does not receive your words immediately, the cost of relying on someone else to correct a misunderstanding becomes very high, so speakers try to avoid it.

There is one thing to note here. This paper was written in 1991, and the media the authors compared were things like face-to-face conversation, telephone, letters, and answering machines. **It does not deal with Slack or Notion.** The framework that grounding cost varies by medium is theirs; applying it to today's asynchronous work channels is my interpretation.

Applying it that way explains why I did not ask repeatedly. In an environment where you receive a spec as text and confirm it as text, sending a confirmation message at every ambiguous point is expensive. You do not know when the answer will come, and you worry that asking several times will make you look like you did not understand. So people naturally slide into their own interpretation.

It is worth separating two forces here. One is that the medium raises the cost of confirmation, and that is Clark and Brennan's point. The other is the worry that asking several times will make you look incompetent, and that is not what their principle predicts but belongs to the psychological safety discussion later on. To be precise, what the principle of least collaborative effort predicts is that **you will choose a cheaper way to confirm**, not that you will stop confirming. Abandoning confirmation and moving on to a guess is not the principle operating; it is grounding failing. And the fact that the interpretation was wrong surfaces only after implementation is done.

## How much confirmation is enough?

So should you ask about every ambiguity? That is not realistic, and I have never seen anyone do it. The paper offers a standard for this question too: the grounding criterion. It refers to the state in which both parties believe the listener has understood what the speaker meant **to a level sufficient for current purposes**. The authors preface it with the observation that perfect understanding is impossible to begin with.

The reason this criterion felt practical to me is that it lowers the target. You do not need to understand requirements perfectly. **It is enough to be able to mutually trust that you understand them well enough for what you are about to do.** And the authors say that when the purpose changes, the criterion has to change with it.

In practice, this becomes the standard for calibrating how hard to press for confirmation. If you dig into “Is someone who cancelled their account still a member?” in a session that is still exploring direction, the conversation stops moving. What is needed at that stage is agreement on what you are trying to do and why, not the settling of boundary values. Conversely, right before implementation begins, that question absolutely has to come up. At that point you need to be able to trust that both sides are picturing the same scope for “member,” and if you cannot, code will pile up on a false premise.

So when I meet the same ambiguity, **I handle it differently depending on which stage I am in.** During exploration I write it down on a list and move on; right before implementation I open that list and close the items one by one. Deferring confirmation and abandoning confirmation are different things.

There is one tool that pairs well at this point. Team Topologies, by Matthew Skelton and Manuel Pais, distinguishes three modes of interaction between teams: collaboration, where two teams discover something new together for a defined period; X-as-a-Service, where one side provides and the other consumes; and facilitation, where one side helps and mentors the other.

It is originally a story about organizational design, but I found it practical to shrink it down to the scale of a single meeting. **If the participants hold different beliefs about which mode this conversation is in, the meeting goes off the rails.** If the product manager thinks this is a session for conveying what has already been decided while the developer thinks it is a session for discovering together, the developer's questions sound like objections rather than collaboration. The reverse happens too. If the developer came to receive a finalized spec while the product manager was still exploring, the developer gets frustrated that there is no spec.

So these days I check this at the start of a meeting: “Is this still open, or is this a session to confirm what has already been decided?” That single question changes the character of everything that follows. It is the same thing as adjusting the grounding criterion to fit the purpose.

## When the resolution does not match, the conversation spins in place

Even with the mode aligned, a problem remains. Another misalignment I have run into often is talking at different **resolutions**.

Requirements handed over as prose from a product manager are usually too abstract. A sentence like “so users can conveniently check their reservation history” does not say how many screens there are or what leads where. Conversely, a designer's mockup is too concrete. Button colors and spacing are already decided, which makes it hard to discuss the very question of whether this flow is right.

Shape Up, written by Ryan Singer at Basecamp, names this problem precisely. Starting from wireframes or concrete visual layouts traps you in unnecessary detail and prevents you from exploring as broadly as you need to. So what [Shape Up proposes](https://basecamp.com/shapeup/1.3-chapter-04) is a representation in between. It is called breadboarding, a concept borrowed from electrical engineering. A breadboard is a prototype that has all the components and wiring of the real device but none of the industrial design. So there are exactly three things you draw: the places you can navigate to, the affordances the user can act on, and the connection lines that show where those actions take the user.

![The three resolutions of a requirement: the questions that prose, a breadboard, and a mockup can each answer](1.png?w=720)

The reason I liked this technique is that it is an artifact a developer can produce. Instead of asking the product manager to write in more detail or waiting on the designer for a mockup, you can draw the flow as you currently understand it, right there, and hand it back with “this is how I understood it, is that right?” It is a concrete way of executing the watching Evans described, the handing back of ambiguity. And seen through the lens of the previous section, it is a device that lowers grounding cost. One picture stands in for several rounds of confirmation over text.

But this resolution is harder to hold than it sounds. As you draw the flow, you naturally slide down into things like “wouldn't this button be better in the bottom right?” I have done it several times myself. Once you slide down like that, the question that was being discussed, namely whether this flow is right, quietly disappears. If you are deciding button positions while the flow is not settled yet, all that discussion gets thrown away wholesale when the flow changes later.

So at this stage I try to keep the drawing **deliberately bad**. If it is nothing but boxes, arrows, and names, the other person does not think to point at details and responds only to the flow. Low fidelity is a feature of this tool rather than a defect. (Suppressing the urge to make it pretty is harder than it sounds.)

The idea that the level of abstraction can itself be a tool for collaboration connects to what I wrote in [Abstraction](/260201). That post was about levels of abstraction in code; conversations have the same thing.

## Separating rules, examples, and questions

Another way to align resolution is to structure the discussion itself.

[Example Mapping](https://cucumber.io/blog/bdd/example-mapping-introduction/), introduced in 2015 by Matt Wynne, who led the Cucumber project, does exactly that. He diagnoses the reason many teams struggle with requirements discussions as the lack of structure, which makes them long and boring. And so teams end up not doing them regularly or consistently. That was precisely my situation. When a requirements meeting runs long, you try to keep the next one short, and when you keep it short the ambiguities stay in place.

Example Mapping splits the discussion across four colors of cards. Yellow is the story under discussion, blue is a rule or acceptance criterion, green is a concrete example that illustrates that rule, and red is a question nobody knows the answer to.

Of these, **I think the red card is the core.** The other three are organizing techniques, but the red card is a device that turns “I don't know” into an official output of the meeting. Saying that you do not know stops being an act that delays the meeting and becomes a result the meeting is supposed to produce.

Why that matters becomes clear if you imagine the opposite. In a meeting without red cards, running into an ambiguity leaves two options: dig in now and stretch the meeting out, or move on and interpret it alone later. As we saw in the previous section, people generally choose the latter. But with one card available, a third option appears. **You write it down and move on, without letting it disappear.** The meeting keeps moving, and the ambiguity stays on a list rather than being erased.

Green cards play a similar role. When only the rule is written, everyone agrees; the moment someone tries to write a concrete example illustrating that rule, interpretations diverge. It is Evans's “using the terms repeatedly in conversation exposes differences” transposed into a meeting format. If you ask people to attach three examples to a single rule, one of them will usually produce a “wait, what happens in this case?” (In my experience, a meeting where that question does not come up is not a meeting where everyone understood, but a meeting where everyone understood differently.)

A similar idea long used in BDD circles is the Three Amigos. The point is that the three perspectives of business, development, and testing each ask a different question, and the [Agile Alliance glossary](https://www.agilealliance.org/glossary/three-amigos/) frames those questions as what problem are we trying to solve, how might we build a solution to solve it, and what about this, what could possibly happen. What becomes of a meeting where the third question never gets asked probably does not need spelling out.

## Make a field for writing down what you do not know

But why do we have such a hard time playing the red card? At this point there is no avoiding a discussion of psychological safety.

The [paper](https://web.mit.edu/curhan/www/docs/Articles/15341_Readings/Group_Performance/Edmondson%20Psychological%20safety.pdf) that Amy Edmondson published in Administrative Science Quarterly in 1999 is the study that formally established the concept of team psychological safety. (The paper itself credits Schein and Bennis's 1965 work as its root.) It defines team psychological safety as a shared belief that the team is safe for interpersonal risk taking. Saying you do not know, voicing dissent, and admitting a mistake all fall under that. The paper surveyed 51 teams at a manufacturing company and showed that psychological safety is associated with learning behavior, and that learning behavior mediates between psychological safety and team performance.

But the sentence I found most practical in that paper was not the definition; it was the one right after it.

::::quote
:::translation
In most cases this belief remains tacit: it is taken for granted, and neither the individual members nor the team as a whole give it direct attention.
:::

:::original
For the most part, this belief tends to be tacit—taken for granted and not given direct attention either by individuals or by the team as a whole.
:::
::::

This belief is usually **tacit**, and neither individuals nor the team give it direct attention.

From here on this is my own conjecture. What the paper says stops at the belief being tacit; the prescription that you should therefore create a form is not in the paper. That said, I have seen several times that a tacit thing does not change through declaration. Saying “our team is a team where it is fine to ask about what you do not know” does not change much on its own. That is why I think the red card from the previous section matters. **If you turn “I don't know” into a field inside a form, filling it in becomes procedure rather than courage.**

There is an obvious counterargument, of course. On an unsafe team, the red card field will simply stay empty. That is a fair point, and I have no intention of claiming this tool creates safety. But if the field exists, at least **the fact that it is empty becomes visible.** It creates an opening to ask whether it is empty because nobody has an open question, or empty because it is hard to speak up.

The same idea has made its way into actual document formats. Look at the [Bounded Context Canvas](https://github.com/ddd-crew/bounded-context-canvas) created by the DDD community: it is a collaborative tool for designing and documenting a single context, and its arrangement of fields is interesting. Name and purpose, strategic classification, domain roles, inbound and outbound communication, and then **Ubiquitous Language**, business decisions, **Assumptions**, verification metrics, and **Open Questions**.

There is a separate field for writing the shared language, one for writing assumptions, and one for writing open questions. The canvas's own description says that the act of writing the purpose forces fuzzy thinking to be stated clearly and puts the whole team on the same page.

I think this is the most realistic approach to communication problems. Instead of trying to change people's attitudes, **you make a field for the things that are hard to say.** I felt something similar while writing [Toss Frontend Fundamentals Refactoring Retrospective](/260328): a good structure does not demand that people perform well, it makes performing well easy.

## Why this is not a matter of taste

Reading this far, one reaction is available: nice ideas, but isn't this ultimately just “communicate diligently”? And isn't that a personality trait?

I thought that for a while too. But there is data on this part.

When DORA addresses organizational culture, it borrows the sociologist Ron Westrum's typology: power-oriented pathological, rule-oriented bureaucratic, and performance-oriented generative. And [DORA's official documentation](https://dora.dev/capabilities/generative-organizational-culture/) summarizes their research findings this way.

::::quote
:::translation
An organizational culture built on high trust, one that places weight on the flow of information, predicts how well software delivery performs.
:::

:::original
organizational culture that is high-trust and emphasizes information flow is predictive of software delivery performance
:::
::::

An organizational culture that is high-trust and **emphasizes information flow** is predictive of software delivery performance. The claim is not that teams communicating well feel good, but that it is a variable moving together with performance.

That said, “predictive” must not be read as causal here. DORA's data comes from a survey in which the same respondents answered about both culture and performance, and it is a correlation at the organizational level. It remains possible that people satisfied with their organization rated both generously, and a prescription for how an individual should behave does not follow directly from a relationship at the organizational level. So this is as far as the material takes us: information flow does not live only in the realm of taste, it sits where it moves together with performance.

The same document also lays out Westrum's three properties of good information: it answers the question the receiver needs answered, it is timely, and it is presented in a way the receiver can use effectively. It is worth noticing that all three set the standard at the **receiver**. Sharing a lot is not what makes information flow good.

Google's Project Aristotle is another frequently cited source. According to [what was published on re:Work](https://rework.withgoogle.com/intl/en/guides/understand-team-effectiveness), they studied 180 teams, ran more than 35 statistical models over hundreds of variables, and put forward five factors affecting team effectiveness: psychological safety, dependability, structure and clarity, meaning, and impact. And the conclusion was that how the team worked together mattered more than who was on it.

One thing is worth flagging, though. The official page states that it lists the five factors in order of importance and puts psychological safety first. But magnitude claims like “overwhelmingly number one,” which show up often in articles citing this research, are not on that page. Having an order and dominating the rest are different claims. So this post makes no claim about magnitude. If you want to argue for the importance of psychological safety, leaning on Edmondson's original paper from the previous section is the accurate move.

## Back to the leader question

Let us return to the article quoted at the start.

While covering information gathering first, James Samuel says the methods from your individual contributor days stop working. As an individual contributor you hold the whole picture of your own work, but once you become responsible for people you can no longer use the old approach. So he names as a required capability the ability to filter out noise and synthesize information into a coherent picture of reality, because no manager can process everything.

I felt this was the same point as Westrum's three properties of good information above. It is not about collecting a lot but about turning it into a usable form. And that is no different from what I am doing right now while handling requirements. Picking out the ambiguous parts of a spec's sentences, redrawing them as a breadboard to confirm, and leaving what I do not know as a red card is exactly the practice of filtering noise into a coherent picture.

What the author says about decision making stayed with me too: waiting for certainty is itself a decision, and it carries a cost. Waiting until requirements become completely clear is no different. Which is why the grounding criterion, sufficient for current purposes rather than perfectly understood, becomes the practical standard.

## Closing thoughts

Here is the summary.

Cross-functional communication failures are usually not purely a matter of attitude. When an organization contains different contexts, the same word diverging is the default state, and being aligned is the exception that has to be maintained at a cost. The way that cost gets paid is shared language, and within it the developer's share is not transcribing requirements but watching for ambiguity and handing it back.

But handing it back takes effort, and people try to minimize that effort. So instead of relying on willpower, I decided to use three things: checking first which mode this conversation is in, drawing the flow at the resolution between prose and mockup and handing it back, and building a field for what you do not know into the meeting format. None of the three demand that you fix your attitude; they make the right thing easier to do.

I am not a leader yet, and I have not verified any of this from that seat. Some of it will not hold at a different team size or in a different organizational culture. But there is one thing I feel confident about now. The way I handle information later will not be newly learned; it will be the way I handle requirements today, grown to scale. So these days I try to be less embarrassed than I used to be about asking “what do you mean by that?” in meetings.

If you can think of one word from a recent meeting that you nodded along to without actually being sure about, I would suggest using that word one more time next time. Use it repeatedly and it will surface.

:::ref
- [article] [Martin Fowler, Ubiquitous Language](https://martinfowler.com/bliki/UbiquitousLanguage.html)
- [docs] [Eric Evans, Domain-Driven Design Reference](https://www.domainlanguage.com/ddd/reference/)
- [docs] [Team Topologies, Key Concepts](https://teamtopologies.com/key-concepts)
- [docs] [Basecamp, Shape Up: Set Boundaries](https://basecamp.com/shapeup/1.2-chapter-03)
- [article] [Alberto Brandolini, EventStorming](https://www.eventstorming.com/book/)
- [article] [Stefan Hofer, Henning Schwentner, Domain Storytelling](https://domainstorytelling.org/)
- [article] [Gojko Adzic, Specification by Example](https://gojko.net/books/specification-by-example/)
:::
