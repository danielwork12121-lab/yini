## Inspiration
Have you ever hurt someone you love without meaning to? Whether in teenage love, lifelong friendships, or family relationships, even small arguments can leave lasting wounds. The problem isn't always a lack of love. It's that emotions cloud our judgment and make it hard to see the other person's perspective. In the heat of an argument, we say things we regret, and small misunderstandings turn into lasting conflicts. Sometimes the people we love most are the ones we hurt without meaning to.

We believe AI can help break this cycle by acting as a neutral, private intermediary: one that considers both perspectives without taking sides or revealing feelings we're not ready to share directly. That's why we created **Yini**, combining *Yin-Yang*, a symbol of harmony, with *tiny*, reflecting how small acts of care help relationships grow.

## What it does
**Yini** is an AI-powered relationship intelligence platform that uses **dual-perspective analysis, persistent memory, and proactive behavioral guidance** to turn 10 seconds of daily reflection into stronger relationships. Rather than keeping users in lengthy AI conversations or overwhelming them with advice, Yini translates insights into **small, actionable real-world interactions**, using AI to strengthen human connection rather than replace it.

- **Dual-Perspective AI & Persistent Memory:** A central AI intermediary analyzes both users' reflections, tracks emotional patterns over time, and identifies misunderstandings without revealing anyone's private entries.
- **Proactive AI, Not Chatbotting:** Instead of waiting for one-sided prompts, Yini generates personalized, actionable guidance on its own from accumulated relationship context, shifting AI from reactive conversation to proactive support.
- **Glow & Grow:** **Grow** offers AI-generated behavioral suggestions to improve the relationship, while **Glow** shares appreciation and compliments, but only ones the sender has explicitly approved.
- **Private Journaling & Active Mindfulness:** Each user privately records emotions, concerns, and appreciation in a 10-second daily reflection, encouraging honest expression without forced disclosure.
- **Our Little Buddy:** A customizable virtual companion uses streaks, visual progression, and positive reinforcement to build consistent relationship-care habits.

## How we built it
Communication is something AI can't replace in the foreseeable future. So we started by asking what actually goes wrong in close relationships. After talking with potential users, we found that most of the time the root cause is misunderstanding, not a lack of care. We then designed Yini around self-reflection: it gathers private diaries from both sides and lets AI act as a fair judge and, more importantly, as a counselor.

We began with a separate frontend and a Python backend connected through a REST API. Partway through, we realized one unified app would be simpler to build and deploy, so we redesigned the app and the database schema and moved everything into a single **Next.js** app on **Vercel**, backed by **Supabase** (Postgres, Auth, and Realtime). Our team has two developers, each owning one side of the stack, and two designers who shaped the user experience, the visual identity, and our little buddy.

A few key pieces of the build:
- **An ontology layer:** every object (entries, nudges, feedback, the pet) and every action is defined as a typed **Zod** schema, along with who is allowed to see it. Every API route is checked against these definitions, and our docs are generated from them automatically.
- **Privacy enforced by the database:** Postgres Row-Level Security guarantees that a partner can never read the other's journal, even with direct database access. We wrote an executable SQL proof that attacks it from both sides.
- **A nightly AI agent:** powered by **Gemini**, it reviews both partners' recent reflections, keeps a rolling memory of the relationship, and writes private feedback for each person. Each check-in also gets an instant, personal reply.
- **Leak protection:** before any feedback is delivered, it passes an overlap filter and a second adversarial AI check to make sure one partner's words never reach the other.

## Challenges we ran into
Overall the process went smoothly, but we definitely learned a lot along the way.

It took us a long time to finalize the idea, explain it to every teammate, and break it into concrete, testable goals. Setting up the infrastructure also took a while. Many of our team members are first-time hackers, so we were learning Supabase, design tools, authentication, and databases as we went.

The hardest technical challenge was privacy. The AI has to understand both partners deeply, yet it must never repeat one person's words to the other. We solved this with layered safeguards: database-level access rules, a text-overlap filter, and an adversarial AI that tries to catch leaks before anything is shown. Migrating from two separate codebases to one app halfway through the hackathon was another challenge, but it left us with a much cleaner product.

## Accomplishments that we're proud of
We learned and used sponsor tools such as ASI and the Gemini API, all the way to a deployed full-stack app. We're proud that:
- Yini works end to end: two people can check in, get an instant reply, feed their shared buddy, and receive private nightly feedback.
- Privacy isn't just a promise. It's enforced by the database and verified by automated tests.
- Our AI is proactive. It looks at the relationship as a whole and suggests small real-world actions instead of keeping people chatting with a bot.
- Our first-time hackers shipped real features and design work.

## What we learned
- How to design AI that brings people closer instead of replacing human connection.
- Privacy has to be built into the architecture from day one, not added at the end.
- How to use Supabase, Row-Level Security, and Realtime, and how to deploy on Vercel.
- How to get reliable, structured output from Gemini and guard it with validation.
- Simplifying early (one app instead of two) saves far more time than it costs.
- How to split work between developers and designers and keep everyone aligned under hackathon time pressure.

## What's next for Yini
We plan to integrate Yini with Life360 through opt-in data sharing, enabling more context-aware, personalized AI recommendations. Future development will focus on relationship-specific AI models, customizable interaction modes, and adaptive engagement mechanisms tailored to couples, friendships, and parent-child relationships. We also aim to expand personalization across AI prompting, behavioral guidance, and gamified habit formation to better fit different relationship dynamics.

## Built with
Next.js, React, TypeScript, Tailwind CSS, Motion, Supabase (Postgres, Auth, Realtime), Zod, Google Gemini API, ASI, Vercel, Vitest, Postman, Figma
