#!/usr/bin/env python3
"""
Update all 115 SOL reviews:
- Assign names/roles/titles from CSV
- Replace AI-artifact paragraphs with human-sounding text
- Update reviews.public.json, wall HTML, and 115 individual pages
"""

import json, csv, re, os

BASE = "/workspaces/MetrAIyux-0S/marketing/skyes-over-london-reviews/skyes-over-london-proof-ecosystem"
JSON_PATH  = f"{BASE}/data/reviews.public.json"
WALL_PATH  = f"{BASE}/skyes-over-london-reviews-expanded.html"
REVIEWS_DIR = f"{BASE}/reviews"
CSV_PATH   = f"{BASE}/data/sol_reviews_populated_names.csv"

# ── Human paragraph pools ────────────────────────────────────────────────────
# Indexed by service. Each entry is [p1_variants, p2_variants, p3_variants].
# We rotate through variants by (review_index_within_service % len(variants)).

SERVICE_COPY = {
  "Website Development": dict(
    p1=[
      "Before this project, the website existed but it did not explain the business. The navigation made sense to us internally, but someone landing on the page cold had no clear reason to stay or reach out.",
      "The site was live, but it was working against us. Visitors were dropping before they got to the services page, and we had no clean way to explain what we do to someone who had never heard of us.",
    ],
    p2=[
      "What changed most was how the page structure told a story. The hierarchy got sorted out — what to say first, what to prove second, what to ask for at the end. That order alone made the whole thing feel more trustworthy.",
      "The language cleanup was bigger than it sounds. We had been describing our work the way we thought about it internally, not the way a stranger reads it. Getting those two things aligned made the site feel like it was actually working.",
    ],
    p3=[
      "We pointed customers to the new site almost immediately and got fewer confused follow-up calls. That was the proof that the work landed.",
      "The handoff was clean. We had enough context to keep updating the site ourselves, which is something the old version never gave us.",
    ]
  ),
  "Website Repair": dict(
    p1=[
      "The site had been broken in a way that was hard to describe — not down, just unreliable. Certain pages were slow, some links were dead, and the mobile layout was not matching what we had approved.",
      "We came in expecting a quick fix and found out the problem was deeper than one broken element. The repair turned into a proper audit, which we needed even if we did not know it yet.",
    ],
    p2=[
      "The work was methodical in a way I did not expect. Instead of patching the visible issue and moving on, we walked through what was actually causing the instability. That took longer but saved us from coming back with the same problems.",
      "Getting the mobile version aligned with the desktop was the part that mattered most practically. That is where most of our traffic comes from, and it had been inconsistent for months.",
    ],
    p3=[
      "The site has run clean since. No emergency calls, no weird display issues on different devices. That kind of reliability is underrated until you have been without it.",
      "The biggest takeaway was having documentation on what was changed and why. If something breaks again, we know where to look.",
    ]
  ),
  "Sales Funnel": dict(
    p1=[
      "We had traffic but the conversions were not matching up. People were landing and leaving without reaching out, and we could not tell where the drop-off was happening.",
      "The offer was real but the path to it was muddy. Too many steps, inconsistent language, and a call to action that appeared in the wrong place on every page.",
      "Closing rates had plateaued. The product was strong but the funnel was not reflecting that — it felt generic where it needed to feel decisive.",
    ],
    p2=[
      "The funnel audit exposed a gap between what we were promising in ads and what the landing page was actually saying. Once those were aligned, the drop-off dropped immediately.",
      "The biggest fix was structural — the CTA was appearing too early before enough trust had been built. Moving it lower and adding a proof section before the ask changed the conversion behavior significantly.",
      "What shifted was the sequencing of information. We were front-loading features when buyers needed to see outcomes first. Rewriting the funnel around that insight made the close feel natural rather than forced.",
    ],
    p3=[
      "We saw a measurable uptick in qualified inquiries within the first few weeks. The work paid for itself faster than expected.",
      "The team now has a template for how to structure future offers. That secondary value — the framework — was worth as much as the funnel itself.",
      "The thing I did not expect was how much cleaner the sales call felt after. When people came through the new funnel, they already understood us. That shortened everything.",
    ]
  ),
  "Local SEO": dict(
    p1=[
      "We were invisible in local search. Competitors we knew were smaller than us were showing up above us consistently, and we had no clear picture of why.",
      "The business was strong but our Google presence was scattered. Different service pages were pulling different keywords, our NAP wasn't consistent across listings, and we had no system for managing it.",
      "We wanted to rank in our service area but had done almost nothing deliberately to make that happen. The site was built for brochure purposes, not for search.",
    ],
    p2=[
      "The structure work — sorting out which service area pages existed and which needed to be built — was the foundation. We had been trying to rank for everything from one generic page. That does not work.",
      "The citation cleanup was less glamorous but probably the highest-leverage fix. Inconsistent name and address data across directories was quietly hurting our rankings everywhere.",
      "What changed the visibility was getting each service area its own page with specific language, not duplicated content. That alone moved the needle faster than anything else we had tried.",
    ],
    p3=[
      "Three months out we were showing up in searches we had never ranked for before. Calls from the area have picked up noticeably.",
      "We now have a repeatable process for adding service area pages as we expand. That was not something we had before this project.",
      "The visibility improvement was gradual but consistent. It was not a magic overnight change — it was infrastructure work that compounded over time.",
    ]
  ),
  "Brand Strategy": dict(
    p1=[
      "The business was established but the brand still looked like we had thrown it together in the early days. Prospects were making judgments before they ever heard our pitch.",
      "We had a logo and some colors but no coherent story. Every piece of marketing said something slightly different, and we could feel the inconsistency even if we could not name it.",
      "The presentation felt small relative to what we actually delivered. That gap — between what we did and how we showed up — was the problem the strategy work was trying to close.",
    ],
    p2=[
      "The positioning exercise was the most valuable part. It forced us to articulate who we are for and who we are not for, which we had been avoiding because it felt like we were leaving money on the table. It was the opposite — it made everything sharper.",
      "The language work cleaned up years of accumulated copy that no one had looked at critically. The old taglines were vague, the service descriptions were jargon-heavy, and the tone varied wildly page to page. Getting it consistent changed how the whole brand felt.",
      "What came out of the strategy work was a voice document we actually use. Every piece of marketing now runs through it, and the brand is noticeably more coherent as a result.",
    ],
    p3=[
      "The new brand gets better responses in proposals. The visual upgrade was part of it, but the language shift was bigger. People read it differently now.",
      "We had tried to do this internally twice and never finished. Having a structured process — and a clear output we could actually use — made the difference.",
      "The brand work gave the team something to rally around. When everyone knows what we sound like and why, producing consistent material gets a lot easier.",
    ]
  ),
  "Staffing Solutions": dict(
    p1=[
      "We were losing time on placements that did not stick. The process for screening candidates was inconsistent, and client expectations were not being set correctly at intake.",
      "The pipeline looked healthy on paper but the close rate was poor. We had candidates but the match quality was low, and we were not sure where the breakdown was happening.",
    ],
    p2=[
      "The intake process restructure was the core of the work. Getting clearer on what clients actually needed — versus what they said they needed — made the early screening more useful and reduced back-and-forth.",
      "The pipeline organization work clarified where we were losing candidates. We had good people falling out of the process at the screening stage because the follow-up was inconsistent. That got fixed.",
    ],
    p3=[
      "Placements that come through the new process are sticking better. We are getting fewer calls two weeks in about poor fit.",
      "The structure we built has continued to hold. We have scaled the team since then and the intake process still works.",
    ]
  ),
  "AE Network": dict(
    p1=[
      "We needed sales coverage but could not justify a full-time hire. Getting access to the AE network gave us something in between — real outreach capacity without the overhead of building a sales department.",
      "The business had the product but we did not have the sales infrastructure to move it consistently. The AE network was the solution we had been looking for without knowing what to call it.",
      "Our pipeline was dependent on referrals and that was not going to scale. Bringing in the AE network gave us an outbound capability we had never had.",
    ],
    p2=[
      "The AEs that came through the network understood how to have a real business conversation. They were not running generic scripts — they were presenting our offer the way it needed to be presented to get a response.",
      "What made the network different was that the outreach was matched to how our buyers actually make decisions. The timing, the framing, the follow-up cadence — all of it was built around the real sales cycle for our kind of deal.",
      "The account development work that came through the network was more organized than what we had been doing internally. Opportunities were tracked, follow-ups happened consistently, and we could see the pipeline building in real time.",
    ],
    p3=[
      "We closed three new accounts in the first two months. The network paid for itself and then some.",
      "The pipeline is not empty anymore. We have active conversations at multiple stages, which is a different position than we were in before the network was brought in.",
      "Having ongoing outreach capacity that we did not have to manage directly changed the shape of the business. We can focus on delivery while the network keeps building pipeline.",
    ]
  ),
  "Staffing + Sourcing": dict(
    p1=[
      "The sourcing side of the business was reactive rather than systematic. We were finding candidates but not building a pipeline we could rely on when demand came in fast.",
      "We needed both candidates and the supply chain to feel more organized. What we had worked but it was fragile and hard to hand off to anyone else on the team.",
    ],
    p2=[
      "The sourcing structure work gave us a way to build the pipeline ahead of demand rather than in response to it. That shift from reactive to proactive changed how we manage peaks.",
      "The supply organization — getting vendors mapped, expectations documented, and the handoff process cleaner — reduced the number of surprises. We knew what we had and what we could count on.",
    ],
    p3=[
      "The business is more resilient now because we are not starting from zero every time we get a surge. The pipeline holds.",
      "Sourcing has been more consistent since the structure was put in. The team can work the system without it depending on any one person knowing it intuitively.",
    ]
  ),
  "Automation": dict(
    p1=[
      "We had manual steps in the process that no one had questioned because they had always been there. The automation work started by making those visible before deciding which ones to fix.",
      "The business was running but the overhead was too high for what we were producing. Repetitive tasks were eating time that should have gone toward actual client work.",
      "We had tried to automate things ourselves and created a mess. The workflows were brittle, the triggers were wrong, and we were spending more time maintaining them than they were saving us.",
    ],
    p2=[
      "The audit of existing workflows was more useful than the automation itself. Finding out which steps could be removed entirely — not just automated — changed the shape of the project.",
      "What we built was conservative by design. The goal was not to automate everything — it was to automate the things that were both repetitive and low-judgment, and leave the rest alone. That distinction mattered.",
      "The handoffs got cleaner. When a step completes, the next person in the process knows exactly what they are receiving and what they need to do. That clarity was missing before.",
    ],
    p3=[
      "The time savings are real but the bigger win is reliability. Things that used to fall through get caught now because the process does not depend on someone remembering.",
      "We have added to the automation since the project ended, using the same principles. The system is built to be extended.",
      "The team trusts the process more now. That is harder to quantify but it shows up in how people work.",
    ]
  ),
  "Operations": dict(
    p1=[
      "The business was functional but the internal structure was hard to explain to anyone joining. Processes lived in people's heads rather than anywhere we could reference or improve.",
      "Operational clarity was something we kept saying we would get to. This was the first time we actually did it in a way that produced something usable.",
    ],
    p2=[
      "The records cleanup was underestimated as a project. Getting the operating documentation in order meant we stopped redoing work that had already been figured out and lost.",
      "What improved most was the handoff quality. When someone is out or a project moves to a different person, the context transfers now instead of staying locked in one person's head.",
    ],
    p3=[
      "The business runs cleaner. Not perfect — but the problems are now visible in the system rather than hidden in someone's inbox.",
      "The operational documentation has been updated three times since we built it. That means it is actually being used, which is more than we could say before.",
    ]
  ),
  "Lead Flow": dict(
    p1=[
      "Leads were coming in but the follow-up was inconsistent. Some got a call the same day, some got nothing for a week, and we had no way to tell the difference until it was too late.",
      "We had a CRM but we were not using it correctly. Leads were being logged after the fact, follow-up reminders were not set, and the pipeline was essentially a list of contacts with no status.",
    ],
    p2=[
      "The follow-up system that came out of this work is simple — probably simpler than I expected. But simple is what the team will actually use. The complexity of what we had before was why it was being ignored.",
      "Getting the intake and the first follow-up touch synced was the fix that mattered most. The gap between those two steps was where most leads were going quiet.",
    ],
    p3=[
      "Lead response time is measurably faster. The team does not have to decide when to follow up — the system tells them, and they act.",
      "We close more of what we bring in now. The work itself is the same — the difference is that leads are not falling out of the process before they have a real chance.",
    ]
  ),
  "AI Systems": dict(
    p1=[
      "We wanted to add AI to the business but had no framework for where it actually fit. The options felt overwhelming and we were not sure which ones were real versus just noise.",
      "The business had knowledge locked in documents and inside the team's heads that should have been accessible to clients or to our own internal tools. We just had no way to surface it.",
      "We had been running the business manually in ways that AI could support, but we needed someone to think through what was actually worth building versus what was just a distraction.",
    ],
    p2=[
      "What got built was specific rather than general. A knowledge layer tied to actual business content, not a generic chatbot. The difference shows in how it responds — it knows the business, not just common phrases.",
      "The AI guardrails work was the part I did not know I needed. It is not just about what the assistant can do — it is about where the handoff to a human needs to happen. Getting that right made the tool trustworthy.",
      "The routing logic was more nuanced than it looks. Getting the assistant to route complex questions to the right resource instead of attempting to answer everything was a judgment call baked into the build, and it works.",
    ],
    p3=[
      "Clients are getting faster answers to the kind of questions that used to require a call. That time saving is real and the clients notice.",
      "We have continued to build on the initial AI layer. The architecture was set up to be extended, which made it easier for us to keep going after the handoff.",
      "The internal version of the tool has been adopted faster than anything else we have tried. The team uses it because it actually knows the business.",
    ]
  ),
  "Government Contracting": dict(
    p1=[
      "We had the certifications but the presentation did not match what a government buyer would expect to see. The capability statement looked like it was made for a small business pitch, not a federal contract.",
      "We were missing opportunities at the proposal stage. The work was real, the qualifications were there, but our documentation was not making the case the way it needed to.",
      "Getting into the government contracting market felt opaque. The certifications were one thing, but the positioning, the documentation, and the presentation were a different layer we had not touched.",
    ],
    p2=[
      "The capability statement rewrite was the most immediate fix. It was built around what a contracting officer actually looks for, not what we thought sounded impressive. That reframe changed the whole document.",
      "The proof organization work — getting past performance documented, formatted, and accessible — was the piece that made proposals faster to put together. We stopped reinventing the documentation for every bid.",
      "What the proposal work did was give us a repeatable structure. Instead of starting each bid from scratch, we now have a library of material that gets assembled and customized. The quality went up because the foundation is solid.",
    ],
    p3=[
      "We submitted our next proposal faster and with more confidence. The material was there when we needed it.",
      "We have won two contracts since the work was done. The documentation was cleaner and the positioning was tighter in both proposals.",
      "The readiness infrastructure has held. We are actively bidding and the process does not feel like a crisis every time.",
    ]
  ),
  "Client Portal": dict(
    p1=[
      "File intake was a problem we had been solving the hard way for too long. Clients were emailing attachments, we were downloading and renaming files manually, and the whole thing broke whenever anyone was traveling.",
      "We needed a client-facing intake system but could not justify an enterprise tool. The portal work gave us something that actually worked for our scale.",
      "The client experience at intake was inconsistent. Some clients got a clear process, others got a back-and-forth email chain that felt unprofessional. We needed to standardize it.",
    ],
    p2=[
      "The intake build was more thoughtful than a basic form. It accounted for different file types, handled large uploads without breaking, and gave clients immediate confirmation so they were not left wondering if anything went through.",
      "The status visibility was the piece clients noticed first. They could see where their submission was in the process without having to email to ask. That small change reduced follow-up calls significantly.",
      "What we got was not just a form — it was a structured intake process that both sides could understand. Client expectations were set at the beginning and the team knew what they were receiving before they opened anything.",
    ],
    p3=[
      "Client intake is now a smooth part of our workflow instead of a friction point. The team spends less time managing file chaos and more time on actual work.",
      "We have added services since the portal was built and the intake process scaled without needing to be rebuilt. That flexibility was worth having.",
      "The professional impression the portal makes has become part of how we position ourselves. Clients comment on it. That is not something we expected.",
    ]
  ),
  "Document Workflow": dict(
    p1=[
      "Document handling was a manual process that nobody had formalized. Everyone had their own method, and when someone new joined, they had to figure it out by watching.",
      "The document workflow was the part of the business most likely to cause a problem at the wrong moment. Important files were in different places, version control was not real, and approvals were tracked in email.",
    ],
    p2=[
      "The workflow build gave every document a defined path — intake, review, approval, delivery. That structure removed the ambiguity that was causing delays and miscommunication.",
      "Getting version control into the process was the highest-leverage change. We stopped sending the wrong version of documents and the back-and-forth with clients became much more contained.",
    ],
    p3=[
      "Documents move faster now and with less confusion on both sides. The team knows the process and clients get what they expect.",
      "The workflow has become part of our onboarding for new team members. It is now how we do things rather than something we set up once and hope people follow.",
    ]
  ),
  "Documentation": dict(
    p1=[
      "The business had a knowledge problem. Things that should have been written down lived in people's heads, in old email threads, or in documents no one could find.",
      "We were onboarding people slowly because the documentation to support them did not exist or was out of date. Every new hire required significant hand-holding from senior staff.",
    ],
    p2=[
      "The documentation sprint produced material that people actually use, which is different from the documentation we had before. It was organized around how people work rather than how we thought they should work.",
      "What changed the usability was the structure. Information in the right place — findable when you need it, not after ten minutes of searching — is documentation that does its job.",
    ],
    p3=[
      "Onboarding is faster now. New team members get to useful work sooner because the resources exist to support them.",
      "The documentation has been updated several times since the initial project. That is a good sign — it means it is living in the team rather than sitting in a folder.",
    ]
  ),
  "Business Operations": dict(
    p1=[
      "The business was running but it was hard to see clearly. Different parts of the operation were tracked in different tools, and getting a complete picture required talking to multiple people.",
      "We had built operational processes but they were undocumented and owner-dependent. If the right person was out, things stalled.",
      "Scaling was the goal but we could not figure out how to do it without everything getting slower and more chaotic first. The operations work was about finding out where the friction actually lived.",
    ],
    p2=[
      "The dashboard work gave us visibility we did not have before. Seeing the actual numbers instead of estimates or gut checks changed the conversations we were having about the business.",
      "Process ownership was the structural fix that mattered most. When everyone knew which decisions belonged to which person — and had the tools to execute those decisions — the bottlenecks cleared.",
      "The service delivery documentation changed how we onboard new work. Instead of re-figuring out the process every time, we start from something that works and customize from there.",
    ],
    p3=[
      "The business is more organized at a structural level now. That is harder to point to than a specific metric, but it shows up in fewer fires and more predictable output.",
      "We have added two team members since the operations work was done. Bringing them up to speed was faster than any previous hire because the documentation existed.",
      "The reporting visibility has changed how we make decisions. We are working from real data now instead of working from memory.",
    ]
  ),
  "Digital Infrastructure": dict(
    p1=[
      "The technology was cobbled together over time and it showed. Different tools that did not talk to each other, no clear owner for several systems, and a vague sense that something was going to break at a bad moment.",
      "We were growing but the infrastructure was not built for growth. Adding a new service or scaling an existing one required workarounds instead of a clean extension.",
      "The system had worked at a certain size but we had outgrown it. The gaps were not obvious from the outside, but internally the team was spending time patching rather than building.",
    ],
    p2=[
      "The infrastructure audit was the right starting point. It found things we had not looked at in years and several that we had depended on without understanding. Knowing what we actually had changed the plan.",
      "The platform thinking work was about more than what we needed now. It was about building in a way that would not need to be torn down in two years. That longer view shaped every decision.",
      "The system repair was methodical. Instead of patching the visible issue, the work traced back to the root cause and fixed it there. The surface problem has not come back.",
    ],
    p3=[
      "The infrastructure is more stable now. Issues that used to require emergency attention get caught earlier or do not happen.",
      "We can extend the system without being afraid of breaking it. That confidence is new — before this work, any change felt risky.",
      "The operational platform has given us a clear picture of what we are running. When something needs to change, we know exactly what we are touching.",
    ]
  ),
  "Business Value": dict(
    p1=[
      "We had done a lot of work but had never organized it in a way that told a coherent story about what the business was worth. That gap showed up every time we tried to present to a serious partner or buyer.",
      "The value question was one we kept answering differently depending on who was asking. That inconsistency signaled something was missing at the foundation.",
    ],
    p2=[
      "The valuation work was an exercise in making the business legible to outsiders. That sounds simple but it required getting everything in order — proof, documentation, service history, and financial framing — before any of it could be presented coherently.",
      "What we built was a business case we could actually hand to someone. Not a pitch deck — actual supporting material that stood on its own without us narrating it.",
    ],
    p3=[
      "The response to the new business value presentation has been different. People take it seriously in a way that the previous version did not earn.",
      "Having a clear answer to the value question has made negotiations easier. We are not starting from scratch every time.",
    ]
  ),
  "Service Strategy": dict(
    p1=[
      "The service menu had grown without a plan. We offered too many things, the pricing was inconsistent, and clients were confused about what to start with.",
      "We needed to productize what we did, but we had been doing everything as custom work. The service strategy work was about turning that into something repeatable without losing the quality.",
    ],
    p2=[
      "The service menu cleanup was harder than expected but the result was clean. Fewer offerings, clearer scope, and pricing that made sense from the outside. The ambiguity that was slowing down sales got removed.",
      "Productizing the services meant defining what was in scope and what was not. That line had been fuzzy and it was costing us time in negotiation and rework. Getting it clear made delivery faster and clients happier.",
    ],
    p3=[
      "Selling has gotten easier. When the service is clear, the conversation is shorter and the close rate is higher.",
      "The structured service menu has become the foundation for how we grow. We know what we can deliver and at what scale. That clarity is new.",
    ]
  ),
  "Trust Building": dict(
    p1=[
      "The business was legitimate but the proof section on the website did not reflect that. Reviews were scattered, case studies did not exist, and there was nothing organized enough to hand someone who was on the fence.",
      "Trust was the bottleneck. The service was strong but the evidence for it was thin or hard to find. Prospects were making decisions based on what they could not see.",
    ],
    p2=[
      "The proof organization work made the trust material usable. It was not creating proof from nothing — the reviews and results were real — it was getting them into a format that a skeptical buyer could actually evaluate.",
      "The client trust section that came out of this project became the part of the site we reference most in sales conversations. It answers the questions people were asking us directly without us needing to be in the room.",
    ],
    p3=[
      "Prospects are spending more time on the proof section before they reach out. The calls we get now start from a higher baseline of trust.",
      "The trust infrastructure has made the sales conversation shorter. The objections that used to come up in every call are handled by the material before the call even starts.",
    ]
  ),
  "Launch Support": dict(
    p1=[
      "We were close to ready but could not tell how close. The launch checklist was in our heads, the team was anxious, and we had no structured way to verify that everything was actually done.",
      "We needed to launch quickly but we were afraid of launching broken. The launch support work helped us figure out which fears were rational and which were just noise.",
    ],
    p2=[
      "The pre-launch audit caught three things that would have been real problems post-launch. None of them were hard to fix, but we would not have found them without a structured check.",
      "The emergency repair work saved the launch timeline. We had a critical issue discovered two days out and the turnaround was fast enough that we hit the date we had already committed to publicly.",
    ],
    p3=[
      "The launch went without major incident, which is the goal. Having an expert review the readiness before we went live was worth every bit of the investment.",
      "We have a launch process now. The next time we need to go live with something, we have a checklist and a sequence that works.",
    ]
  ),
  "Long-Term Value": dict(
    p1=[
      "The relationship has lasted because the work keeps being useful. That is not something we expected from the start — we expected one project, and it turned into something ongoing.",
      "Five years of work with one partner is not something we planned. It happened because the results kept justifying the next engagement.",
      "The initial project was good. The compounding effect of multiple projects with the same team — each one building on what the previous one established — is what has made the relationship worth noting.",
    ],
    p2=[
      "What has compounded over time is the shared context. The team knows our business well enough that new projects start further along than they would with anyone new. That efficiency is invisible but real.",
      "The consistency is what makes the long-term relationship valuable. The work standard has not changed. Every project has been executed at the same level, which means we trust the process before we even start.",
      "The strategic value built up over multiple engagements. Each project improved something specific; taken together, they have changed how the business runs at a structural level.",
    ],
    p3=[
      "We refer other founders to this relationship specifically because the long-term dimension is what makes it different from a one-time agency engagement.",
      "The value is not just in any single deliverable — it is in having a partner who understands the context of every decision we have made together. That context is hard to replace.",
      "The work has compounded. What we built in year one supported what we built in year three. That kind of continuity is rare and worth protecting.",
    ]
  ),
  "Marketing Support": dict(
    p1=[
      "The marketing existed but it was not grounded in anything consistent. Different campaigns were saying different things, and there was no foundation that tied the messaging together.",
      "We needed marketing support that understood the business rather than just producing content. The work was about building a foundation before producing anything else.",
    ],
    p2=[
      "The marketing foundation work was not glamorous but it was necessary. Without clear positioning and a consistent message, everything produced on top of it was going to be inconsistent too.",
      "What we got was a starting point we could actually work from. The positioning was defined, the channel strategy was realistic for our size, and the content direction had a logic to it.",
    ],
    p3=[
      "The marketing effort has been more coherent since the foundation work was done. Less repetition, more strategy, and a clearer sense of what we are trying to accomplish with each piece.",
      "The team now has direction rather than just tasks. That is a different relationship to the work, and it shows in what gets produced.",
    ]
  ),
  "Customer Experience": dict(
    p1=[
      "The customer journey had gaps that we were aware of but had not prioritized fixing. Clients were getting through to the end but the friction along the way was unnecessary and noticeable.",
      "We were measuring satisfaction at the end but not mapping the experience earlier. By the time we got feedback, the moment to fix it had passed.",
    ],
    p2=[
      "Mapping the customer journey made the friction visible in a way that internal assumptions never had. We found two moments where clients were consistently confused, and fixing them reduced the support load immediately.",
      "The experience work was about reducing unnecessary effort on the client side. Some of what we were asking them to do was a habit, not a requirement. Removing it made the interaction feel more professional.",
    ],
    p3=[
      "Client satisfaction scores have been higher since the journey was smoothed out. The work itself did not change — how clients move through it did.",
      "We have kept the journey mapping practice. Any time we add a new step or change the process, we walk through it from the client's perspective first.",
    ]
  ),
  "Executive Support": dict(
    p1=[
      "Executive time was being spent on work that should have been handled elsewhere but was not because the systems to support it did not exist.",
      "The founder was the bottleneck in too many processes. Not because of style — because the infrastructure to delegate responsibly was not in place.",
    ],
    p2=[
      "The executive clarity work was about freeing up decision-making capacity by getting the right information to the right people so everything did not have to route upward.",
      "What changed was the delegation infrastructure. Not just who did what — but how decisions were made, how work was approved, and how the founder could trust the output without being in every detail.",
    ],
    p3=[
      "The executive overhead has come down. Time that used to go to operational management is available for strategic work now.",
      "The clarity work has compounded. Every structural improvement has made the next one easier because the foundation is cleaner.",
    ]
  ),
  "Founder Support": dict(
    p1=[
      "Being a founder without a peer is a specific kind of difficult. Decisions are constant and there is no obvious person to pressure-test them against who understands the full context.",
      "The early stage of the business required a different kind of support than I expected. Not more advice — better structure for how to think through what mattered most.",
    ],
    p2=[
      "The founder support was strategic in the best sense — it helped me see which decisions were actually high-stakes and which ones I was spending too much energy on because they felt urgent.",
      "Having an external perspective that knew the business well enough to push back was the part I did not know I needed. The decisions I made with that support have held up better.",
    ],
    p3=[
      "The business is in a better position because of the thinking we did together. Not every decision was right, but the framework for making them got stronger.",
      "Founder support is hard to quantify. What I can say is that I was clearer after every session and that clarity showed up in what I did next.",
    ]
  ),
  "Deployment Support": dict(
    p1=[
      "Launching to production was the part of the project we were most anxious about. We had never done it at this scale and we were not sure what would break.",
      "The deployment had been delayed twice because of technical blockers we could not diagnose ourselves. Getting outside support was the decision that broke the stall.",
      "The environment setup was supposed to be the easy part. It was not, and having support when it went sideways made the difference between a delayed launch and a cancelled one.",
    ],
    p2=[
      "The deployment support was methodical — smoke testing, route verification, environment variable checks — all the work that feels tedious but finds the issue before users do.",
      "What made the support useful was the knowledge of the deployment platform specifically. It was not generic DevOps advice — it was specific to how our stack worked in Cloudflare's environment.",
      "The checklist approach to the deployment meant nothing got assumed. Every environment, every route, every provider setup got checked before we declared ready. That discipline is what produced a clean launch.",
    ],
    p3=[
      "The deployment went cleanly. No surprises post-launch, no emergency rollback, no production issues in the first 48 hours. That is the outcome you pay for.",
      "We have a deployment process now that we use every time. The documentation from the support engagement is the foundation of it.",
      "The technical honesty during the support was something I valued. When something was outside scope or needed a different approach, that was said directly rather than worked around.",
    ]
  ),
  "Sales Strategy": dict(
    p1=[
      "The sales motion was not producing at the rate the pipeline suggested it should. Lead quality was reasonable but something in the close process was breaking down.",
      "We needed a structured approach to the sale rather than relying on relationship and hope. The work was about building something repeatable.",
    ],
    p2=[
      "The walkthrough work showed us where the sale was stalling. We had strong openers and weak closes, which is a specific problem with a specific fix. Getting that diagnosis right made the solution obvious.",
      "The proposal process got structured. Instead of custom-writing every proposal, we now have a framework that handles 80% of the work and leaves room for the 20% that is actually case-specific.",
    ],
    p3=[
      "Close rates have improved. The pipeline is converting at a higher rate with the same lead volume.",
      "The sales team has a shared language for the process now. That consistency across reps has made the overall performance more predictable.",
    ]
  ),
}

# Add fallback for any service not explicitly mapped
DEFAULT_COPY = dict(
  p1=[
    "We came in with a problem that felt hard to articulate and left with a clear picture of what had been wrong and what needed to change.",
    "The project took longer to start than we expected because we did not fully understand the scope. Once we did, the work moved quickly and the output was more useful than we anticipated.",
  ],
  p2=[
    "The most useful part was the structured thinking it brought to a problem we had been treating as a feeling. Making it concrete made it fixable.",
    "What changed was not just the deliverable but the understanding behind it. We know now why the solution works, which means we can maintain and extend it without coming back to restart.",
  ],
  p3=[
    "The work paid off. Not in a vague, hard-to-measure way — in a specific, this-is-different-now way that we can point to.",
    "We would do it again. The value held up after the project ended, which is the part that is hardest to predict and most important to get right.",
  ]
)

def get_copy(service, idx, field):
    pool = SERVICE_COPY.get(service, DEFAULT_COPY)
    variants = pool[field]
    return variants[idx % len(variants)]

# ── Load CSV ──────────────────────────────────────────────────────────────────
name_map = {}  # id -> {firstName, lastName, role, title}
with open(CSV_PATH) as f:
    for row in csv.DictReader(f):
        name_map[row['id']] = row

# ── Load JSON ─────────────────────────────────────────────────────────────────
with open(JSON_PATH) as f:
    reviews = json.load(f)

# Track index per service for variant cycling
service_idx = {}

# ── Update JSON ───────────────────────────────────────────────────────────────
for review in reviews:
    rid = review['id']
    nm  = name_map.get(rid, {})
    if not nm:
        continue

    first = nm['firstName']
    last  = nm['lastName']
    initials = first[0] + last[0]

    service = review['service']
    si = service_idx.get(service, 0)
    service_idx[service] = si + 1

    review['firstName']       = first
    review['lastName']        = last
    review['displayName']     = f"{first} {last}"
    review['initials']        = initials
    review['role']            = nm['role']
    review['title']           = nm['title']
    review['nameStatus']      = "synthetic_placeholder"
    review['nameStatusLabel'] = "synthetic placeholder — replace with client-approved real name before public use"

    # Rewrite all three paragraphs
    review['fullReview'] = [
        get_copy(service, si, 'p1'),
        get_copy(service, si, 'p2'),
        get_copy(service, si, 'p3'),
    ]

with open(JSON_PATH, 'w') as f:
    json.dump(reviews, f, indent=2)
print(f"✓ Updated {JSON_PATH}")

# ── Update individual review HTML pages ───────────────────────────────────────
service_idx = {}

for review in reviews:
    rid = review['id']
    nm  = name_map.get(rid, {})
    if not nm:
        continue

    first    = review['firstName']
    last     = review['lastName']
    full     = review['displayName']
    initials = review['initials']
    role     = review['role']
    title    = review['title']
    service  = review['service']
    p1, p2, p3 = review['fullReview']

    html_path = os.path.join(REVIEWS_DIR, f"{rid}.html")
    if not os.path.exists(html_path):
        print(f"  MISSING: {html_path}")
        continue

    with open(html_path) as f:
        html = f.read()

    # Title
    html = re.sub(
        r'<title>.*?</title>',
        f'<title>{title} - {full}</title>',
        html, flags=re.DOTALL
    )
    # Meta description
    html = re.sub(
        r'(<meta name="description" content=")[^"]*("/>)',
        rf'\g<1>{title} from {full} for {service}.\2',
        html
    )
    # Hero eyebrow stays, h2 span — update to title
    html = re.sub(
        r'(<h2><span>)[^<]*(</span></h2>)',
        rf'\g<1>{title}\2',
        html
    )
    # Hero copy — update P1 in the hero
    html = re.sub(
        r'(<p class="hero-copy">)[^<]*(</p>)',
        rf'\g<1>{p1}\2',
        html
    )
    # Avatar initials div
    html = re.sub(
        r'(<div class="review-avatar">)[^<]*(</div>)',
        rf'\g<1>{initials}\2',
        html
    )
    # Strong name
    html = re.sub(
        r'(<strong>)[^<]*(</strong>)',
        rf'\g<1>{full}\2',
        html
    )
    # Role/status span — target the span immediately after <strong> inside byline
    html = re.sub(
        r'(review-detail-byline.*?<strong>[^<]+</strong>\s*<span>)[^<]*(</span>)',
        rf'\g<1>{role}\2',
        html, flags=re.DOTALL, count=1
    )
    # Blockquote — keep existing quote (it's unique per review), don't overwrite
    # Rewrite the three fullReview paragraphs after blockquote
    # Pattern: <p> ... </p> appearing 3 times after blockquote
    # Replace the three <p> blocks in review-detail-main article
    def replace_review_paras(m):
        return (
            f'<p>{p1}</p>\n'
            f'          <p>{p2}</p>\n'
            f'          <p>{p3}</p>'
        )
    html = re.sub(
        r'</blockquote>\s*<p>.*?</p>\s*<p>.*?</p>\s*<p>.*?</p>',
        lambda m: '</blockquote>\n          ' + replace_review_paras(m),
        html, flags=re.DOTALL
    )

    with open(html_path, 'w') as f:
        f.write(html)

print(f"✓ Updated 115 individual review pages")

# ── Update wall HTML ──────────────────────────────────────────────────────────
with open(WALL_PATH) as f:
    wall = f.read()

for review in reviews:
    rid      = review['id']
    full     = review['displayName']
    initials = review['initials']

    # data-reviewer="Name Withheld" → data-reviewer="First Last"
    # Match the specific card by slug
    # Cards have data-slug="sol-review-NNN"
    # Replace data-reviewer and initials within that card's block

    # Replace data-reviewer on the card div
    wall = re.sub(
        rf'(data-slug="{rid}"[^>]*?)data-reviewer="[^"]*"',
        rf'\1data-reviewer="{full}"',
        wall
    )
    # Replace the <strong>Name Withheld</strong> inside this card
    # This is tricky because many cards look the same — use a targeted approach
    # Find the card block and replace within it
    def replace_card_name(m):
        card = m.group(0)
        card = re.sub(r'(<strong>)[^<]*(</strong>)', rf'\g<1>{full}\2', card, count=1)
        card = re.sub(r'(<span class="review-avatar">)[^<]*(</span>)', rf'\g<1>{initials}\2', card, count=1)
        return card

    wall = re.sub(
        rf'<article[^>]*data-slug="{rid}".*?</article>',
        replace_card_name,
        wall, flags=re.DOTALL
    )

with open(WALL_PATH, 'w') as f:
    f.write(wall)
print(f"✓ Updated wall HTML")

print("\nAll done.")
