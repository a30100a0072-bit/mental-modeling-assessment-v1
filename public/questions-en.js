// public/questions-en.js
// Phase 2d — English question banks (parallel to questions.js).
// 對應到 zh-Hant 版本的同名 const。當 mbti_locale === 'en' 時，
// script.js 的 pickBank() 會優先回傳這裡的 EN 版本。
// 設計原則：保留原題目的 dA/dB/dim/options 結構與認知功能對應，僅翻譯文案。
(function () {
    'use strict';

    // ==========================================
    // [Phase 5] Axis decider probe pool (NS / EI / TF / JP)
    // ==========================================
    const AXIS_PROBES = {
        EI: [
            { q: "After a party, your energy:", a: "Excited, want to find the next round, talk till exhaustion", b: "Drained — need solitude to recharge", dA: ["Se","Fe"], dB: ["Si","Ni"], w: 1.5, axis: "EI" },
            { q: "Working through a complex problem:", a: "Think out loud — talking helps me organize ideas", b: "Must close the door alone, finish in my head, then speak", dA: ["Ne","Te"], dB: ["Ni","Ti"], w: 1.5, axis: "EI" },
            { q: "Pitching a new idea in a meeting:", a: "Speak as I think — the idea forms while I'm talking", b: "Only after rehearsing the argument fully in my head", dA: ["Ne","Fe"], dB: ["Ti","Ni"], w: 1.5, axis: "EI" }
        ],
        NS: [
            { q: "Reading a book, what matters most:", a: "The hidden meanings and abstract insights it reveals", b: "The concrete examples and practical info it provides", dA: ["Ne","Ni"], dB: ["Si","Se"], w: 1.5, axis: "NS" },
            { q: "Describing a place, you'd say:", a: "\"It has a XX vibe\"", b: "\"Green walls, wooden chairs, around $X\"", dA: ["Ne","Ni"], dB: ["Se","Si"], w: 1.5, axis: "NS" },
            { q: "Planning a trip:", a: "Lock in the broad direction, improvise along the way", b: "Itinerary, restaurants, budget — every line item or no peace", dA: ["Ne","Ni"], dB: ["Si","Te"], w: 1.5, axis: "NS" }
        ],
        TF: [
            { q: "A friend pours out their troubles. Instinctive reaction:", a: "Analyze the problem and offer actionable solutions", b: "Empathize and listen first, soothe the emotion before anything", dA: ["Te","Ti"], dB: ["Fe","Fi"], w: 1.5, axis: "TF" },
            { q: "In a debate, what matters most:", a: "Whose argument is more rigorous, whose evidence is solid", b: "Whose tone is warmer, whose stance more respectful of people", dA: ["Ti","Te"], dB: ["Fe","Fi"], w: 1.5, axis: "TF" },
            { q: "Basis for a major decision:", a: "Objective data, cost-benefit, optimization model", b: "Long-term impact on people, whether it violates conscience", dA: ["Te"], dB: ["Fi","Fe"], w: 1.5, axis: "TF" }
        ],
        JP: [
            { q: "A planned date with a friend:", a: "Once locked in, I really hate changing it", b: "Stay flexible — last-minute decisions are fine", dA: ["Te","Si"], dB: ["Ne","Se"], w: 1.5, axis: "JP" },
            { q: "Facing a deadline:", a: "Finish early — the last week is buffer", b: "The deadline is the real ignition switch", dA: ["Te","Si"], dB: ["Ne","Se"], w: 1.5, axis: "JP" },
            { q: "Organizing your work:", a: "One thing at a time, then on to the next", b: "Many tasks in flight at once — work where the spark is", dA: ["Te"], dB: ["Ne"], w: 1.5, axis: "JP" }
        ]
    };

    // ==========================================
    // [Cognitive function fallback probe pool]
    // ==========================================
    const PROBES = {
        "Ni_Te": [{ q: "Default under high-stakes pressure:", a: "Make sure execution lands without error", b: "Make sure the direction is absolutely precise", dA: ["Te"], dB: ["Ni"] }],
        "Fi_Ne": [{ q: "Default under high-stakes pressure:", a: "Try every novel angle", b: "Hold an inviolable personal line", dA: ["Ne"], dB: ["Fi"] }],
        "Ti_Ne": [{ q: "Default under high-stakes pressure:", a: "Diverge — link multiple possibilities", b: "Converge — verify the underlying logic", dA: ["Ne"], dB: ["Ti"] }],
        "Si_Te": [{ q: "Default under high-stakes pressure:", a: "Maximize resource throughput", b: "Make the system absolutely safe", dA: ["Te"], dB: ["Si"] }],
        "Fe_Ni": [{ q: "Default under high-stakes pressure:", a: "Predict the long-term endgame", b: "Bind the group's shared emotion", dA: ["Ni"], dB: ["Fe"] }],
        "Se_Ti": [{ q: "Default under high-stakes pressure:", a: "Pick apart the opponent's logical flaw", b: "Trust gut and respond in real time", dA: ["Ti"], dB: ["Se"] }],
        "Fi_Se": [{ q: "Default under high-stakes pressure:", a: "Soak in the ultimate present experience", b: "Pursue the purity of inner value", dA: ["Se"], dB: ["Fi"] }],
        "Si_Fe": [{ q: "Default under high-stakes pressure:", a: "Preserve group harmony", b: "Honor established norms and experience", dA: ["Fe"], dB: ["Si"] }]
    };
    PROBES["Te_Ni"]=PROBES["Ni_Te"]; PROBES["Ne_Ti"]=PROBES["Ti_Ne"]; PROBES["Ne_Fi"]=PROBES["Fi_Ne"];
    PROBES["Te_Si"]=PROBES["Si_Te"]; PROBES["Ni_Fe"]=PROBES["Fe_Ni"]; PROBES["Ti_Se"]=PROBES["Se_Ti"];
    PROBES["Se_Fi"]=PROBES["Fi_Se"]; PROBES["Fe_Si"]=PROBES["Si_Fe"];

    // ==========================================
    // [Module D] Daily Behavior
    // ==========================================
    const mData_Likert_D = [
        { q: "I enjoy taking apart everyday objects or phenomena to find the underlying principles behind how they work.", dim: "Ti" },
        { q: "I list my daily to-dos and get serious satisfaction from crossing each one off.", dim: "Te" },
        { q: "At a group dinner, I subconsciously notice if anyone is being left out or unhappy.", dim: "Fe" },
        { q: "My room or private playlist is built entirely to match my mood and aesthetic of the moment.", dim: "Fi" },
        { q: "While doing chores or commuting I often drift into thought, with specific future scenes flashing into my mind.", dim: "Ni" },
        { q: "My thoughts jump erratically — I'll switch chat topics to something totally unrelated mid-sentence.", dim: "Ne" },
        { q: "I'm extremely sensitive (and resistant) to small changes in my familiar environment — moved objects, different smells.", dim: "Si" },
        { q: "Walking outside, I have a sharp radar for the motion, color, and sound of my surroundings.", dim: "Se" },
        { q: "When I hear someone use sloppy logic or a misused phrase, I correct it (silently or out loud).", dim: "Ti" },
        { q: "Inefficient queues or workflows make me genuinely irritated.", dim: "Te" },
        { q: "In conversation, I give a lot of physical and vocal feedback — nodding, agreeing.", dim: "Fe" },
        { q: "If a conversation crosses a personal principle of mine, I freeze the room — sometimes I just end the talk cold.", dim: "Fi" },
        { q: "I find daily trivia tedious — I always feel my energy should be on something deeper.", dim: "Ni" },
        { q: "I often buy a new book or game, only touch the start, then move on to something brand new.", dim: "Ne" },
        { q: "I keep going to the same restaurant and ordering the same dish — the familiarity feels grounding.", dim: "Si" },
        { q: "When I see a novel physical object, my first reflex is to touch and try operating it.", dim: "Se" },
        { q: "Before buying anything complex, I research specs and mechanics until I really understand it.", dim: "Ti" },
        { q: "I categorize my belongings so I can grab what I need at maximum speed.", dim: "Te" },
        { q: "Picking gifts agonizes me — I want each person to get exactly what they'll love.", dim: "Fe" },
        { q: "My daily spending bar is: \"does this object move my soul?\"", dim: "Fi" },
        { q: "Before a friend speaks, I've already intuited what they're about to say.", dim: "Ni" },
        { q: "I deliberately walk home a route I've never taken, just to see what shows up.", dim: "Ne" },
        { q: "I clearly remember a specific sentence someone said to me long ago, with the scene attached.", dim: "Si" },
        { q: "I love high-intensity exercise or sensory rush — it makes me feel \"alive.\"", dim: "Se" }
    ];
    const mData_Forced_D = [
        { q: "On a relaxing weekend, you lean toward:", a: "Deep-clean the home and rebuild order", b: "Dive solo into some obscure but interesting theory", dA: ["Te"], dB: ["Ti"] },
        { q: "At a friends' gathering, your attention usually goes to:", a: "Driving the vibe, making sure everyone's having fun", b: "Finding the few people who can hold a deep soul-level conversation", dA: ["Fe"], dB: ["Fi"] },
        { q: "Facing a brand-new daily task (e.g., assembling furniture):", a: "Strictly follow the manual step by step", b: "Trust intuition — fumble and assemble as I go", dA: ["Si"], dB: ["Se"] },
        { q: "Organizing computer files:", a: "Build an airtight folder hierarchy", b: "Dump everything on the desktop, rely on search", dA: ["Te", "Si"], dB: ["Ne", "Se"] },
        { q: "Hearing a juicy piece of gossip:", a: "Imagine all the wild possible storylines behind it", b: "Instantly see how it inevitably ends", dA: ["Ne"], dB: ["Ni"] },
        { q: "A small daily mishap (like a power outage):", a: "Immediately scan available resources to improvise", b: "Get anxious — recall how I dealt with it before", dA: ["Se"], dB: ["Si"] },
        { q: "Showing care:", a: "Buy something practical or just handle their problem", b: "Pour in emotional value and warm presence", dA: ["Te"], dB: ["Fe"] },
        { q: "Your room style is closer to:", a: "Filled with figurines, art, and mementos you love", b: "Minimalist — no useless decoration", dA: ["Fi", "Si"], dB: ["Ni", "Ti"] }
    ];
    const mData_SJT_D = [
        {
            q: "[Daily] Your commute is jammed by construction. You:",
            options: [
                { text: "A. Open navigation and dive into back alleys you've never tried.", dims: ["Ne", "Se"] },
                { text: "B. Calculate the time cost of each alternative, pick the most efficient.", dims: ["Te"] },
                { text: "C. Annoyed — take an old route I know is safe.", dims: ["Si"] },
                { text: "D. Predict where this traffic will eventually choke up, route around it ahead of time.", dims: ["Ni"] }
            ]
        },
        {
            q: "[Daily] At dinner, the group can't agree on a restaurant. Your reflex:",
            options: [
                { text: "A. Step in, integrate everyone's input, pick a place \"most people\" will accept.", dims: ["Fe"] },
                { text: "B. Forcefully name the highest-rated, closest restaurant — end the pointless debate.", dims: ["Te"] },
                { text: "C. Refuse places I don't want — worst case, I eat alone elsewhere.", dims: ["Fi"] },
                { text: "D. Silently analyze the underlying psychology of why they're rejecting certain places.", dims: ["Ti"] }
            ]
        },
        {
            q: "[Daily] You're watching a hit thriller. What's your brain doing?",
            options: [
                { text: "A. Fully immersed in the sound, light, and tense action.", dims: ["Se"] },
                { text: "B. Constantly diverging: \"What if the killer was someone else? How would the plot go?\"", dims: ["Ne"] },
                { text: "C. Halfway through, I've already locked in the killer and the ending.", dims: ["Ni"] },
                { text: "D. Picking apart the script's plot holes and broken logic.", dims: ["Ti"] }
            ]
        },
        {
            q: "[Daily] You bought a new smart appliance. Your unboxing routine:",
            options: [
                { text: "A. Read the manual cover to cover so I operate it correctly.", dims: ["Si"] },
                { text: "B. Plug it in, mash every button to see what happens.", dims: ["Se", "Ne"] },
                { text: "C. Get it on the network first, set up all automations and shortcuts.", dims: ["Te"] },
                { text: "D. Examine its industrial design — does it match the aesthetic of my room?", dims: ["Fi"] }
            ]
        }
    ];
    const mData_Ranking_D = [
        {
            q: "Rank what you most value in your private living space (most-valued first):",
            items: [
                { text: "Extreme cleanliness and a tight storage system (efficiency)", dim: "Te" },
                { text: "Art that expresses your unique taste (purity)", dim: "Fi" },
                { text: "Objects soaked in familiarity and memory (security)", dim: "Si" },
                { text: "Top-tier AV equipment and sensory enjoyment (physical experience)", dim: "Se" }
            ]
        },
        {
            q: "Rank topics you find most interesting in daily chats with friends (most-interested first):",
            items: [
                { text: "Analyzing the underlying mechanics of a system or phenomenon", dim: "Ti" },
                { text: "Long-term trajectories of future society or technology", dim: "Ni" },
                { text: "Sharing relationship dynamics and emotional moments", dim: "Fe" },
                { text: "Brainstorming absurd, fun, novel ideas", dim: "Ne" }
            ]
        },
        {
            q: "Rank your typical responses to small unexpected mishaps (most-used first):",
            items: [
                { text: "Mobilize whatever's at hand and crush it as fast as possible", dim: "Te" },
                { text: "Calmly analyze the root logical cause of the incident", dim: "Ti" },
                { text: "Soothe everyone else who got startled by the incident first", dim: "Fe" },
                { text: "Use the disruption as an excuse to scrap the plan and chase adventure", dim: "Ne" }
            ]
        }
    ];

    // ==========================================
    // [Module E] Decision Scenarios
    // ==========================================
    const mData_Likert_E = [
        { q: "Before any major decision, I make sure the entire logic structure has zero internal contradictions.", dim: "Ti" },
        { q: "In investment or project decisions, ROI and resource maximization are my top priority.", dim: "Te" },
        { q: "Before deciding, I prioritize the emotional impact and harmony for the team or family.", dim: "Fe" },
        { q: "Even if every data point says it's profitable, if it violates my conscience, I won't do it.", dim: "Fi" },
        { q: "When choosing, I always look 5–10 years out — willing to give up short-term gains for it.", dim: "Ni" },
        { q: "I like to keep the maximum number of options open — never put all eggs in one basket.", dim: "Ne" },
        { q: "Facing risk, I lean on the most-successful, most-stable historical SOP and data.", dim: "Si" },
        { q: "I believe plans never survive contact with reality — adapt as you go.", dim: "Se" },
        { q: "If a business model lacks rigorous underlying logic, I distrust it even when it's profitable now.", dim: "Ti" },
        { q: "In meetings, I cut off inefficient emotional speeches and pull discussion back to the goal.", dim: "Te" },
        { q: "Rather than pushing through a perfect plan, I'd compromise slightly to get everyone's buy-in.", dim: "Fe" },
        { q: "In career choices, salary matters less than \"does this work fit my soul.\"", dim: "Fi" },
        { q: "I often make calls on raw intuition without sufficient data backing.", dim: "Ni" },
        { q: "My biggest decision fear is being forced to commit to a single path right now.", dim: "Ne" },
        { q: "I deeply respect contracts, regulations, and case precedent — I won't casually step into gray areas.", dim: "Si" },
        { q: "At the negotiation table I read micro-expressions and body language and adjust leverage instantly.", dim: "Se" },
        { q: "I trust the result I derived from first principles more than authority recommendations.", dim: "Ti" },
        { q: "I'm good at converting fuzzy strategy into a measurable KPI matrix everyone can be evaluated on.", dim: "Te" },
        { q: "When the team is fracturing, I step in as the connective lubricant.", dim: "Fe" },
        { q: "After a major setback, I retreat inward and revisit my original beliefs and values.", dim: "Fi" },
        { q: "My decisions usually come fast — every variable already collapsed in my head long ago.", dim: "Ni" },
        { q: "When a project hits a wall, I find a flash of insight from a totally orthogonal angle.", dim: "Ne" },
        { q: "I believe innovation must be built on solid historical experience and strong defenses.", dim: "Si" },
        { q: "When crisis erupts, I don't panic — I get an adrenaline-clear focus instead.", dim: "Se" }
    ];
    const mData_Forced_E = [
        { q: "Facing a choice that decides the company's survival:", a: "Fire the deadweight close friend to save the company", b: "Hold the line on loyalty — survive together with the team", dA: ["Te"], dB: ["Fe"] },
        { q: "When a truth you held is overturned by real-world data:", a: "Immediately revise the theory to match reality", b: "Question the sampling logic of the data", dA: ["Te"], dB: ["Ti"] },
        { q: "Basis for a high-risk investment:", a: "A single, strong conviction about a future macro trend", b: "Diversify risk and prepare multiple hedges", dA: ["Ni"], dB: ["Ne", "Si"] },
        { q: "Breaking a stalled negotiation:", a: "Crush them with an irrefutable logic matrix", b: "Throw out an unexpected new piece of leverage", dA: ["Ti", "Te"], dB: ["Ne"] },
        { q: "When the org must push a painful change:", a: "Quick clean cut — short pain beats long pain", b: "Honor existing tradition, transition gradually with minimum shock", dA: ["Se", "Ni"], dB: ["Si"] },
        { q: "Top criterion for picking a co-founder:", a: "Complementary skills, extreme execution speed", b: "Deeply aligned values and absolute loyalty", dA: ["Te"], dB: ["Fi"] },
        { q: "First step after a catastrophic project failure:", a: "Deconstruct the underlying logic of the failure to prevent repeat", b: "Immediately pour the remaining resources into the next new battle", dA: ["Ti", "Si"], dB: ["Se", "Ne"] },
        { q: "When morality and company interest collide:", a: "No hesitation — protect the moral floor", b: "For the bigger picture, ethics can be flexed", dA: ["Fi"], dB: ["Te"] }
    ];
    const mData_SJT_E = [
        {
            q: "[Decision] Resources are running out — you must cut 30% of staff to survive. How do you execute?",
            options: [
                { text: "A. Pull the performance sheet, ruthlessly cut the bottom 30% — no emotion.", dims: ["Te"] },
                { text: "B. Massive emotional pain — try to convince everyone to take pay cuts to keep all jobs.", dims: ["Fe", "Fi"] },
                { text: "C. Re-evaluate the company's future strategy, cut departments irrelevant to that future.", dims: ["Ni"] },
                { text: "D. Examine the underlying financials, find other things to liquidate or trim.", dims: ["Ti"] }
            ]
        },
        {
            q: "[Decision] A wildly new and unknown tech trend (e.g., AI) appears. Your move:",
            options: [
                { text: "A. Diverge madly on how it can combine with existing industries, launch many experiments.", dims: ["Ne"] },
                { text: "B. Skeptical — observe how similar bubbles played out historically, wait for stability.", dims: ["Si"] },
                { text: "C. Predict it'll be mainstream in 5 years, all-in on transformation now.", dims: ["Ni"] },
                { text: "D. Buy the gear and resources fast, get hands-on and grab early ground.", dims: ["Se"] }
            ]
        },
        {
            q: "[Decision] A long-term supplier suddenly hikes prices without warning. First reaction:",
            options: [
                { text: "A. Pull the contract and trade history, pressure them coldly with hard data.", dims: ["Te", "Si"] },
                { text: "B. Use relationships and the social network — try to talk them out of it.", dims: ["Fe"] },
                { text: "C. Drop them instantly — find a more disruptive replacement on the market.", dims: ["Se", "Ne"] },
                { text: "D. This violates trust — I'd lose money rather than work with them again.", dims: ["Fi"] }
            ]
        },
        {
            q: "[Decision] You're assigned to lead a controversial project you fundamentally disagree with. You:",
            options: [
                { text: "A. Set personal feelings aside, deliver it with maximum professionalism and efficiency.", dims: ["Te"] },
                { text: "B. Look for logical loopholes inside the system, quietly redirect the project.", dims: ["Ti"] },
                { text: "C. Can't bear the soul-tear — quit or step off the project.", dims: ["Fi"] },
                { text: "D. Sell the project to the team — try to steer collective consensus to a better outcome.", dims: ["Fe"] }
            ]
        }
    ];
    const mData_Ranking_E = [
        {
            q: "Under extreme high-pressure dilemmas, what do you abandon first? (Drop-first ranks #1):",
            items: [
                { text: "Maintaining group emotion and interpersonal harmony", dim: "Fe" },
                { text: "Ensuring every logical detail is flawless and self-consistent", dim: "Ti" },
                { text: "Maximizing resources and project momentum", dim: "Te" },
                { text: "Holding the deepest moral conviction inside you", dim: "Fi" }
            ]
        },
        {
            q: "Picking a career or startup direction — your priorities (most-important #1):",
            items: [
                { text: "Whether this work lets me see and reach a long-term vision", dim: "Ni" },
                { text: "Whether this work provides stable, predictable income and security", dim: "Si" },
                { text: "Whether this work is full of unknown challenges and constant novelty", dim: "Ne" },
                { text: "Whether this work gives me the most thrilling, real physical feedback", dim: "Se" }
            ]
        },
        {
            q: "At the negotiation table, your core leverage (most-used #1):",
            items: [
                { text: "Crush them with airtight data and real-world interest", dim: "Te" },
                { text: "Soften them with sharp emotional radar and people skills", dim: "Fe" },
                { text: "See through their hand with intuition; overpower with presence", dim: "Ni" },
                { text: "Control the room with extreme on-the-fly response and physical pressure", dim: "Se" }
            ]
        }
    ];

    // ==========================================
    // [Module F] Cognitive Preference
    // ==========================================
    const mData_Likert_F = [
        { q: "I deeply believe in a single absolute objective truth in the universe — even if it's not human-friendly.", dim: "Ti" },
        { q: "The only metric for a theory's worth is whether it solves real problems.", dim: "Te" },
        { q: "Collective human evolution and the rise of universal values — these are the highest pursuits.", dim: "Fe" },
        { q: "For me, asking \"who am I really\" and \"why do I exist\" matters far more than worldly success.", dim: "Fi" },
        { q: "History and all things have an inevitable destiny — everything converges toward a single endpoint.", dim: "Ni" },
        { q: "The universe is woven from infinite parallel possibilities — there's never a single right answer.", dim: "Ne" },
        { q: "Accumulated history and traditional wisdom are humanity's last line of defense against chaos.", dim: "Si" },
        { q: "Philosophy is too vague — only what my body can feel right now is absolutely real.", dim: "Se" },
        { q: "Learning new knowledge, I must derive from first axioms — otherwise I can't truly understand.", dim: "Ti" },
        { q: "I learn new tech with a clear goal — to convert it into a monetizable tool.", dim: "Te" },
        { q: "I love deep soul-level conversation as a way to explore the world from different angles.", dim: "Fe" },
        { q: "My judgment of art or literature depends entirely on whether it strikes me deeply inside.", dim: "Fi" },
        { q: "I often have epiphanies — instantly collapsing seemingly unrelated info into one core concept.", dim: "Ni" },
        { q: "Rather than dive deep into a single field, I prefer cross-disciplinary collisions.", dim: "Ne" },
        { q: "My fastest learning mode is repeated practice — internalize knowledge as long-term parameters.", dim: "Si" },
        { q: "I cannot tolerate long lectures of pure theory — I have to do the experiment myself to learn.", dim: "Se" },
        { q: "On complex social issues, I strip away all sentiment and only look at logical right and wrong.", dim: "Ti" },
        { q: "I don't care much about \"why is this happening\" — only \"now what do we do about it.\"", dim: "Te" },
        { q: "Building a community of love and inclusion matters more than chasing extreme tech progress.", dim: "Fe" },
        { q: "Deep inside me there's a sacred temple holding my purest vision of the world.", dim: "Fi" },
        { q: "I often accurately predict how a person or event will end up — and it usually plays out.", dim: "Ni" },
        { q: "My favorite mental state is brainstorming — watching one idea split into a hundred.", dim: "Ne" },
        { q: "I'm deeply attached to nostalgic things — I love revisiting stable, beautiful past moments.", dim: "Si" },
        { q: "I believe in living in the moment — overworrying the future or wallowing in the past wastes life.", dim: "Se" }
    ];
    const mData_Forced_F = [
        { q: "You think the essence of the world is closer to:", a: "A cold, precisely-running set of mechanical laws", b: "A living organism woven from subjective consciousness and emotion", dA: ["Ti", "Te"], dB: ["Fi", "Fe"] },
        { q: "Your stance on \"truth\":", a: "Truth is one — keep converging until you find it", b: "Truth is multidimensional — it lives in infinite possibilities", dA: ["Ni"], dB: ["Ne"] },
        { q: "Your perception of \"time\":", a: "A one-way line flowing toward a future endpoint", b: "Layers upon layers of past memory and experience", dA: ["Ni"], dB: ["Si"] },
        { q: "If you could pick one superpower:", a: "An \"all-seeing eye\" that perceives the underlying architecture of everything", b: "An \"absolute domain\" that lets you instantly control any physical environment", dA: ["Ti", "Ni"], dB: ["Se", "Te"] },
        { q: "Which kind of art moves you more?", a: "Vast epic structures with a sense of fate", b: "Exquisite, pure portraits of a single soul's interior", dA: ["Ni", "Te"], dB: ["Fi"] },
        { q: "Evaluating a theory:", a: "Whether it's perfectly self-consistent and bulletproof", b: "Whether it can be validated in reality and produce value", dA: ["Ti"], dB: ["Te"] },
        { q: "Facing groupthink:", a: "Stay silent or comply to keep the harmony", b: "Can't bear stupidity — coldly puncture it", dA: ["Fe"], dB: ["Ti", "Te"] },
        { q: "The void you fear most inside is:", a: "A life that's unpredictable, chaotic, out of control", b: "A life that's monotonous, stagnant, with no novelty", dA: ["Ni", "Si"], dB: ["Ne", "Se"] }
    ];
    const mData_SJT_F = [
        {
            q: "[Cognitive] Reading an extremely dense philosophy or science classic, your brain:",
            options: [
                { text: "A. Hunts for logical holes in the author's reasoning and tears them down.", dims: ["Ti"] },
                { text: "B. Skips detail — jumps to what the theory can be used for.", dims: ["Te"] },
                { text: "C. Loves being struck by new ideas — they spark cross-disciplinary inspiration.", dims: ["Ne"] },
                { text: "D. Sinks deeply in — tries to catch the ultimate truth hidden behind the words.", dims: ["Ni"] }
            ]
        },
        {
            q: "[Cognitive] Dropped onto an alien planet — language unknown, culture totally foreign. First move:",
            options: [
                { text: "A. Excitedly explore — test the gravity, all the new sensory inputs.", dims: ["Se"] },
                { text: "B. Fearful — search for Earth-similar regularities to build security.", dims: ["Si"] },
                { text: "C. Quietly observe their power structures and resource allocation.", dims: ["Te"] },
                { text: "D. Use sharp empathy to build basic emotional connection with the locals.", dims: ["Fe"] }
            ]
        },
        {
            q: "[Cognitive] In a deep debate on \"will AI destroy humanity,\" your stance leans:",
            options: [
                { text: "A. With strict compliance and defense systems (SOP), there's nothing to worry about.", dims: ["Si", "Te"] },
                { text: "B. It's an inevitable evolutionary fate — humanity will be replaced by higher minds.", dims: ["Ni"] },
                { text: "C. Worried — AI lacks human empathy and moral conviction; disaster will follow.", dims: ["Fi", "Fe"] },
                { text: "D. Boring question — focus on how much AI can make us right now.", dims: ["Se", "Te"] }
            ]
        },
        {
            q: "[Cognitive] In total relaxation with no external pressure (\"flow state\"), what are you doing?",
            options: [
                { text: "A. Frantically constructing a perfect theoretical model in my head only I'd understand.", dims: ["Ti"] },
                { text: "B. Immersed in pure artistic creation or extreme aesthetic experience.", dims: ["Fi", "Se"] },
                { text: "C. Sketching the grand blueprint of a future ideal world in my mind.", dims: ["Ni"] },
                { text: "D. With a tribe on the same wavelength — unburdened communal joy.", dims: ["Fe", "Se"] }
            ]
        }
    ];
    const mData_Ranking_F = [
        {
            q: "What's the most important dimension defining \"a person's worth\"? (Most-important #1):",
            items: [
                { text: "How much real output and achievement they contributed to society", dim: "Te" },
                { text: "Whether they have independent thinking and the wisdom to see truth", dim: "Ti" },
                { text: "Whether they hold a unique soul and pure conscience", dim: "Fi" },
                { text: "Whether they warm those around them and advance collective love", dim: "Fe" }
            ]
        },
        {
            q: "If the world ends and you can take one thing into the shelter, rank them (top pick #1):",
            items: [
                { text: "An encyclopedia of human history and survival SOPs", dim: "Si" },
                { text: "A book of revelations decoding the universe's ultimate mysteries and rebirth", dim: "Ni" },
                { text: "A wild collection of sci-fi imagination and creative ideas", dim: "Ne" },
                { text: "Top-tier weapons giving extreme physical defense and combat power", dim: "Se" }
            ]
        },
        {
            q: "What kind of \"stupidity\" do you tolerate least? (Least-tolerable #1):",
            items: [
                { text: "Illogical, self-contradictory thought that refuses to dig into root principles", dim: "Ti" },
                { text: "Pure talk with zero ability to land a result in reality", dim: "Te" },
                { text: "Rigid traditionalism rejecting any innovation or change", dim: "Ne" },
                { text: "Short-sightedness — sacrificing long-term strategy for short gains", dim: "Ni" }
            ]
        }
    ];

    // ==========================================
    // [Module A] Daily Comfort Zone — m1-4Data_A
    // ==========================================
    const m1Data_A = [
        { q: "Organizing daily notes or files:", a: "Build clear categories so I can search fast", b: "Construct a personal underlying knowledge web", dA: ["Te"], dB: ["Ti"], w: 1 },
        { q: "Buying a new piece of tech:", a: "Compare specs and bang-for-buck", b: "Research the underlying technology and principles", dA: ["Te"], dB: ["Ti"], w: 1 },
        { q: "Playing a casual strategy game:", a: "Pursue the fastest, most efficient clear", b: "Test the limits of every in-game mechanic", dA: ["Te"], dB: ["Ti"], w: 1 },
        { q: "Hearing a brand-new concept:", a: "Think about where it can be applied", b: "Verify whether the concept is logically self-consistent", dA: ["Te"], dB: ["Ti"], w: 1 },
        { q: "Picking a restaurant with friends:", a: "Pick a place most people will be happy with", b: "Insist on a place that matches my own taste", dA: ["Fe"], dB: ["Fi"], w: 1 },
        { q: "Choosing a daily outfit:", a: "Match the occasion and mainstream aesthetic", b: "Express my unique mood of the moment", dA: ["Fe"], dB: ["Fi"], w: 1 },
        { q: "Hearing gossip in the social circle:", a: "Track the relational dynamics between people", b: "Judge whether it aligns with my own ethics", dA: ["Fe"], dB: ["Fi"], w: 1 },
        { q: "A friend vents a small frustration to you:", a: "Resonate emotionally and soothe them", b: "Quietly stay with them and empathize inside", dA: ["Fe"], dB: ["Fi"], w: 1 },
        { q: "Drafting personal future plans:", a: "Imagine many different fun possibilities", b: "Lock onto one clear core target", dA: ["Ne"], dB: ["Ni"], w: 1 },
        { q: "Reading a book you find interesting:", a: "Often diverge — link to other fields", b: "Try to capture the author's single core idea", dA: ["Ne"], dB: ["Ni"], w: 1 },
        { q: "Weekend trip to a big supermarket:", a: "Love exploring new products I haven't seen", b: "Head straight to the section I planned to buy from", dA: ["Ne"], dB: ["Ni"], w: 1 },
        { q: "Listening to a casual talk:", a: "Get sparked by all the novel viewpoints", b: "Predict the conclusion the speaker is heading to", dA: ["Ne"], dB: ["Ni"], w: 1 },
        { q: "Enjoying leisure downtime:", a: "Chase sensory rush or outdoor activity", b: "Stay in familiar surroundings, repeat my routines", dA: ["Se"], dB: ["Si"], w: 1 },
        { q: "Looking at a beautiful painting:", a: "Feel the vivid visual impact of the moment", b: "Recall a similar past scene I experienced", dA: ["Se"], dB: ["Si"], w: 1 },
        { q: "Tasting a delicious dish:", a: "Focus on the real layers of flavor in my mouth", b: "Be reminded of a familiar taste from memory", dA: ["Se"], dB: ["Si"], w: 1 },
        { q: "Decor and layout of your room:", a: "Like swapping it occasionally to keep it fresh", b: "Keep it fixed — the consistency is grounding", dA: ["Se"], dB: ["Si"], w: 1 }
    ];
    const m2Data_A = [
        { q: "Planning a family or team trip:", a: "Make sure the schedule flows efficiently", b: "Make sure everyone has a great time", dA: ["Te"], dB: ["Fe"], w: 1 },
        { q: "Receiving a birthday gift:", a: "Evaluate the practical value of the item", b: "Be moved by the thought the giver put in", dA: ["Te"], dB: ["Fe"], w: 1 },
        { q: "Helping run a hobby club:", a: "Volunteer to plan and assign tasks", b: "Volunteer to lift the vibe and break the ice", dA: ["Te"], dB: ["Fe"], w: 1 },
        { q: "Watching a popular show or film:", a: "Pick at the plot's structural soundness", b: "Empathize with the characters' feelings and bonds", dA: ["Te"], dB: ["Fe"], w: 1 },
        { q: "In a friendly debate:", a: "Point out the logical holes in their argument", b: "Hold to the core conviction inside me", dA: ["Ti"], dB: ["Fi"], w: 1 },
        { q: "Evaluating a person's worth:", a: "Weight their intellectual depth", b: "Weight their sincerity and moral purity", dA: ["Ti"], dB: ["Fi"], w: 1 },
        { q: "Daily decision criterion:", a: "Pure objective pros-and-cons analysis", b: "Intuition that doesn't violate my conscience", dA: ["Ti"], dB: ["Fi"], w: 1 },
        { q: "Brain activity in solitude:", a: "Run interesting theoretical models in my head", b: "Reflect on my feelings and values", dA: ["Ti"], dB: ["Fi"], w: 1 },
        { q: "Exploring a new city on a holiday:", a: "No itinerary — drift into new places", b: "Hunt for activities with strong sensory rush", dA: ["Ne"], dB: ["Se"], w: 1 },
        { q: "Your definition of \"freedom\":", a: "Mind unbounded — free to imagine", b: "Body unbounded — free to move", dA: ["Ne"], dB: ["Se"], w: 1 },
        { q: "Killing daily boredom:", a: "Connect absurd new ideas in my head", b: "Go outside, seek physical environmental change", dA: ["Ne"], dB: ["Se"], w: 1 },
        { q: "Learning a new skill:", a: "Grasp the concept first, then invent new ways to use it", b: "Just do it — build muscle memory through reps", dA: ["Ne"], dB: ["Se"], w: 1 },
        { q: "Long-range financial planning:", a: "Trust my own intuition and big trends", b: "Lean on past historical data and experience", dA: ["Ni"], dB: ["Si"], w: 1 },
        { q: "Recalling childhood:", a: "Only remember the lessons I drew from it then", b: "Recall ultra-HD scene details", dA: ["Ni"], dB: ["Si"], w: 1 },
        { q: "Handling repetitive admin chores:", a: "Boring — try to automate it away", b: "Reassuring — work through it step by step", dA: ["Ni"], dB: ["Si"], w: 1 },
        { q: "Your view on \"tradition\":", a: "If it doesn't serve the future vision, break it", b: "It's the crystallized wisdom of those before us — respect it", dA: ["Ni"], dB: ["Si"], w: 1 }
    ];
    const m3Data_A = [
        { q: "Driving a brand-new project:", a: "Set the SOP, expect everyone to follow", b: "Analyze risks, give objective recommendations", dA: ["Te", "Fi"], dB: ["Ti", "Fe"], w: 1.5 },
        { q: "A friend asks for your advice:", a: "Give concrete, problem-solving steps", b: "Help them sort their thinking from multiple angles", dA: ["Te", "Fi"], dB: ["Ti", "Fe"], w: 1.5 },
        { q: "Facing an unreasonable new rule:", a: "Comply on the surface — do my own thing privately", b: "Try to surface the logical hole behind the rule", dA: ["Te", "Fi"], dB: ["Ti", "Fe"], w: 1.5 },
        { q: "In a team brainstorm:", a: "Take charge of converging ideas and assessing feasibility", b: "Pitch the theory and harmonize everyone's input", dA: ["Te", "Fi"], dB: ["Ti", "Fe"], w: 1.5 },
        { q: "Defining personal success:", a: "Hit worldly metrics and realize my personal ideal", b: "Win collective acknowledgment and understand how the world works", dA: ["Te", "Fi"], dB: ["Ti", "Fe"], w: 1.5 },
        { q: "Handling interpersonal conflict:", a: "Draw a line — protect my own rights", b: "Find the logical balance point between the two sides", dA: ["Te", "Fi"], dB: ["Ti", "Fe"], w: 1.5 },
        { q: "Writing a public-facing article:", a: "Clean structure, sharp personal stance", b: "Tight reasoning, sensitive to different audiences", dA: ["Te", "Fi"], dB: ["Ti", "Fe"], w: 1.5 },
        { q: "Most-satisfying daily state:", a: "Inbox zero — feeling solidly grounded inside", b: "Cracked a puzzle — sharing the joy with others", dA: ["Te", "Fi"], dB: ["Ti", "Fe"], w: 1.5 },
        { q: "Handling a small unexpected mishap:", a: "Reflex — solve it fast with whatever's at hand", b: "Pause — has something like this happened before?", dA: ["Ni", "Se"], dB: ["Ne", "Si"], w: 1.5 },
        { q: "Planning a perfect date:", a: "Build the moment — guide it to a romantic finish", b: "Have several backups and lean on past good experiences", dA: ["Ni", "Se"], dB: ["Ne", "Si"], w: 1.5 },
        { q: "Tidying a cluttered storage room:", a: "See the layout instantly, snap things into place", b: "Tidy and reminisce — sink into past memories", dA: ["Ni", "Se"], dB: ["Ne", "Si"], w: 1.5 },
        { q: "Driving on an unfamiliar road:", a: "Focus on the road, navigate by sense of direction", b: "Glue eyes to the GPS — fear missing any cue", dA: ["Ni", "Se"], dB: ["Ne", "Si"], w: 1.5 },
        { q: "Listening to a favorite song:", a: "Sink into the rhythm, feel the emotion flow", b: "Imagine the lyric's scene, stir up old feelings", dA: ["Ni", "Se"], dB: ["Ne", "Si"], w: 1.5 },
        { q: "Ideal living environment:", a: "Minimalist modern — texture and dynamic beauty", b: "Full of mementos — warm and historical", dA: ["Ni", "Se"], dB: ["Ne", "Si"], w: 1.5 },
        { q: "Observing a stranger:", a: "See through their aura and current body language", b: "Imagine what kind of job they might have", dA: ["Ni", "Se"], dB: ["Ne", "Si"], w: 1.5 },
        { q: "Perception of \"time\":", a: "Time is a single line flowing toward the future", b: "Time is layered fragments of the past", dA: ["Ni", "Se"], dB: ["Ne", "Si"], w: 1.5 }
    ];
    const m4Data_A = [
        { q: "Entering peak (flow) state:", a: "Extreme physical operation and environmental control", b: "Perfect detail recall and order", dA: ["Se"], dB: ["Si"], w: 2 },
        { q: "Greatest sense of achievement from:", a: "High-efficiency completion of a huge complex project", b: "Cracking a logic puzzle no one else could solve", dA: ["Te"], dB: ["Ti"], w: 2 },
        { q: "Best-case future expectation:", a: "Everything inside my precise prediction", b: "Endless possibilities and novel exploration", dA: ["Ni"], dB: ["Ne"], w: 2 },
        { q: "Feeling self-worth comes from:", a: "Successfully moving the room emotionally — being beloved", b: "Holding inner conviction without drifting with the tide", dA: ["Fe"], dB: ["Fi"], w: 2 },
        { q: "Most-enjoyed leisure mode:", a: "Burning physical energy and sweat without restraint", b: "Free-flowing creative jam with people", dA: ["Se"], dB: ["Ne"], w: 2 },
        { q: "Source of deep peace:", a: "The instant of seeing through a thing's essence", b: "A safe house full of beautiful memories", dA: ["Ni"], dB: ["Si"], w: 2 },
        { q: "Mode of leadership:", a: "Clear orders, drive the team to the goal", b: "Spark team passion, build deep bonds", dA: ["Te"], dB: ["Fe"], w: 2 },
        { q: "Ultimate truth pursued:", a: "The objective laws of how the universe runs", b: "The purest soul-essence of being human", dA: ["Ti"], dB: ["Fi"], w: 2 },
        { q: "Moments of greatest confidence:", a: "Intuition validated, fearing no challenge", b: "Logic airtight, experience flawless", dA: ["Ni", "Fi"], dB: ["Ti", "Si"], w: 2 },
        { q: "Strongest weapon you broadcast outward:", a: "Spread creativity and enthusiasm", b: "Awe the room with achievements and presence", dA: ["Ne", "Fe"], dB: ["Te", "Se"], w: 2 },
        { q: "Best state for solving complex problems:", a: "Inspiration surge — break the frame and find the genius move", b: "Detail focus — peel layers and find the core", dA: ["Ne", "Fi"], dB: ["Si", "Ti"], w: 2 },
        { q: "Ideal interpersonal interaction:", a: "Together in thrilling, fun, physical activities", b: "Warm gathering — share what we've each seen", dA: ["Se", "Te"], dB: ["Fe", "Ne"], w: 2 },
        { q: "Ultimate pursuit of \"beauty\":", a: "Creation that matches inner soul and deep meaning", b: "Design with perfect structure and practical function", dA: ["Fi", "Ni"], dB: ["Te", "Si"], w: 2 },
        { q: "Path to social recognition:", a: "Show flexible footwork and sharp reflexes", b: "Pitch forward-looking views, build collective consensus", dA: ["Se", "Ti"], dB: ["Ne", "Fe"], w: 2 },
        { q: "Facing a major life pivot:", a: "Cool strategic projection, advance without hesitation", b: "Reference past experience, lean on family and friends", dA: ["Ni", "Ti"], dB: ["Si", "Fe"], w: 2 },
        { q: "Defining life's success:", a: "Hold real power, leave a world-changing legacy", b: "Build a wide network, live a rich and varied life", dA: ["Te", "Ne"], dB: ["Fe", "Se"], w: 2 }
    ];

    // ==========================================
    // [Module B] High-Pressure Defense — m1-4Data_B
    // ==========================================
    const m1Data_B = [
        { q: "A defect surfaces in the project:", a: "Push it to launch, patch it post-hoc", b: "Delay the schedule, refactor the underlying code", dA: ["Te"], dB: ["Ti"], w: 1 },
        { q: "Team operations are chaotic:", a: "Issue forceful direct orders", b: "Quietly investigate the root of the chaos", dA: ["Te"], dB: ["Ti"], w: 1 },
        { q: "Learning a new tool:", a: "Only learn the parts I'll use", b: "Must understand the underlying mechanics", dA: ["Te"], dB: ["Ti"], w: 1 },
        { q: "Faced with an unreasonable demand:", a: "Counter with real-world data", b: "Counter by exposing logical holes", dA: ["Te"], dB: ["Ti"], w: 1 },
        { q: "A team core member errs:", a: "Compromise to preserve the bigger picture", b: "Hold the line — call it out openly", dA: ["Fe"], dB: ["Fi"], w: 1 },
        { q: "Facing group pressure:", a: "Comply with the group to survive", b: "Refuse — even if it gets me ostracized", dA: ["Fe"], dB: ["Fi"], w: 1 },
        { q: "Friend's emotional breakdown:", a: "Absorb their negative emotion", b: "Offer an objective solution", dA: ["Fe"], dB: ["Fi"], w: 1 },
        { q: "Evaluating a controversial figure:", a: "Weight their substantive contribution", b: "Cannot tolerate their private misconduct", dA: ["Fe"], dB: ["Fi"], w: 1 },
        { q: "Stuck in unknown adversity:", a: "Keep multiple backup options alive", b: "Lock onto one ultimate target", dA: ["Ne"], dB: ["Ni"], w: 1 },
        { q: "Processing massive information:", a: "Diverge — connect every angle", b: "Converge — find the single core", dA: ["Ne"], dB: ["Ni"], w: 1 },
        { q: "Searching for a breakthrough:", a: "Soak up cross-disciplinary input", b: "Cut all distractions, derive deeply", dA: ["Ne"], dB: ["Ni"], w: 1 },
        { q: "What you fear most:", a: "Losing every other option", b: "Losing control of the goal", dA: ["Ne"], dB: ["Ni"], w: 1 },
        { q: "Sudden physical crisis:", a: "Trust instinct and reflex to dodge", b: "Lean on safety protocols", dA: ["Se"], dB: ["Si"], w: 1 },
        { q: "Operating precise instruments:", a: "Probe and test as I go", b: "Strictly follow the manual", dA: ["Se"], dB: ["Si"], w: 1 },
        { q: "Organizing physical space:", a: "Wherever it's easiest to grab is fine", b: "Must return to its fixed spot", dA: ["Se"], dB: ["Si"], w: 1 },
        { q: "Competitive sport:", a: "Adapt on the fly to current conditions", b: "Drill the standard form repeatedly", dA: ["Se"], dB: ["Si"], w: 1 }
    ];
    const m2Data_B = [
        { q: "Team resources running out:", a: "Coldly execute layoffs and downsizing", b: "Convince everyone to ride it out together", dA: ["Te"], dB: ["Fe"], w: 1 },
        { q: "Reporting failed results:", a: "Show the raw data losses directly", b: "Prioritize team morale", dA: ["Te"], dB: ["Fe"], w: 1 },
        { q: "Worst leadership taboo:", a: "Inefficient emotional drain", b: "Cold pressure that crushes humanity", dA: ["Te"], dB: ["Fe"], w: 1 },
        { q: "Greatest sense of accomplishment from:", a: "The system runs precisely and efficiently", b: "The group reaches deep consensus", dA: ["Te"], dB: ["Fe"], w: 1 },
        { q: "Under attack from authority's logic:", a: "Counter ruthlessly — expose their gaps", b: "Silently defend personal dignity", dA: ["Ti"], dB: ["Fi"], w: 1 },
        { q: "Facing severe setback:", a: "Construct a more perfect theory", b: "Retreat inward and recover the original intent", dA: ["Ti"], dB: ["Fi"], w: 1 },
        { q: "Basis for a hard decision:", a: "Pure compute, sentiment removed", b: "Intuition that doesn't betray conscience", dA: ["Ti"], dB: ["Fi"], w: 1 },
        { q: "Brain activity right before sleep:", a: "Patching theory holes from the day", b: "Reflecting on the purity of self-value", dA: ["Ti"], dB: ["Fi"], w: 1 },
        { q: "Encountering an unfamiliar crisis:", a: "Imagine many escape scripts", b: "Find a physical weapon nearby", dA: ["Ne"], dB: ["Se"], w: 1 },
        { q: "Pursuit of the ultimate thrill:", a: "Information overload — peak in the head", b: "Push physical limits — body-rush", dA: ["Ne"], dB: ["Se"], w: 1 },
        { q: "Venting in a dull environment:", a: "Wire absurd ideas in my head", b: "Demand physical change in the environment", dA: ["Ne"], dB: ["Se"], w: 1 },
        { q: "Way to change the world:", a: "Propose a disruptive new framework", b: "Seize control of real resources", dA: ["Ne"], dB: ["Se"], w: 1 },
        { q: "Long-term investment risk:", a: "Trust intuition, refuse backups", b: "Without historical data, I won't invest", dA: ["Ni"], dB: ["Si"], w: 1 },
        { q: "Memory-retrieval style:", a: "Only the core skeleton-pattern remains", b: "High-fidelity scene details preserved", dA: ["Ni"], dB: ["Si"], w: 1 },
        { q: "Coping with future uncertainty:", a: "Project the endgame, accept the cost", b: "Lock down rules and prevent disaster", dA: ["Ni"], dB: ["Si"], w: 1 },
        { q: "Most-hated interruption:", a: "Trivial admin detail breaking flow", b: "Unproven new ideas ambushing me", dA: ["Ni"], dB: ["Si"], w: 1 }
    ];
    const m3Data_B = [
        { q: "At the org's life-or-death moment:", a: "Force the system to keep running", b: "Coldly analyze the group's blind spots", dA: ["Te", "Fi"], dB: ["Ti", "Fe"], w: 1.5 },
        { q: "Holding decisive proof against an opponent:", a: "Use it as bargaining chip for resource", b: "Annihilate their entire logic", dA: ["Te", "Fi"], dB: ["Ti", "Fe"], w: 1.5 },
        { q: "A hellish character judgment dilemma:", a: "Bear the bad name to push efficiency", b: "Preserve harmony, keep multiple perspectives", dA: ["Te", "Fi"], dB: ["Ti", "Fe"], w: 1.5 },
        { q: "A fatal bug appears in the system:", a: "Stop the bleed, eject the people who erred", b: "Investigate the underlying beauty of the code", dA: ["Te", "Fi"], dB: ["Ti", "Fe"], w: 1.5 },
        { q: "Pillar that keeps you alive on a deserted island:", a: "Drive to establish order and control", b: "Drive to derive the universe's objectivity", dA: ["Te", "Fi"], dB: ["Ti", "Fe"], w: 1.5 },
        { q: "Coping with vulgar people / events:", a: "Marginalize them via administrative power", b: "Deconstruct them with logical analysis", dA: ["Te", "Fi"], dB: ["Ti", "Fe"], w: 1.5 },
        { q: "Hit by malicious group attack:", a: "Counter-strike with real-world resources", b: "Steer the group's psychology to disintegrate it", dA: ["Te", "Fi"], dB: ["Ti", "Fe"], w: 1.5 },
        { q: "Source of deepest loneliness:", a: "No one understands the weight of decisions", b: "No one sees through to the world's essence", dA: ["Te", "Fi"], dB: ["Ti", "Fe"], w: 1.5 },
        { q: "Sudden lethal physical disaster:", a: "Bet on instinct, escape on a gamble", b: "Mind floods with countless ways to die", dA: ["Ni", "Se"], dB: ["Ne", "Si"], w: 1.5 },
        { q: "Massive effort obliterated in an instant:", a: "Pivot directly to the next breakthrough", b: "Replay endlessly — where did it go wrong", dA: ["Se", "Ni"], dB: ["Si", "Ne"], w: 1.5 },
        { q: "Survival fight with ambiguous rules:", a: "Focus on now, grab resources", b: "Fear the unknown — freeze in place", dA: ["Ni", "Se"], dB: ["Ne", "Si"], w: 1.5 },
        { q: "Extreme craving for speed:", a: "Burn through everything to hit the target", b: "For safety, willing to drop to zero speed", dA: ["Se", "Ni"], dB: ["Si", "Ne"], w: 1.5 },
        { q: "Inside a deceitful environment:", a: "Read the opponent's physical intent", b: "Over-interpret — fall into chaos", dA: ["Ni", "Se"], dB: ["Ne", "Si"], w: 1.5 },
        { q: "Release after long-term high pressure:", a: "Extreme bodily sensory rush", b: "Collapse and absorb meaningless info", dA: ["Se", "Ni"], dB: ["Si", "Ne"], w: 1.5 },
        { q: "Visual image of the future:", a: "A single, piercing solid line", b: "A divergent web-like maze", dA: ["Ni", "Se"], dB: ["Ne", "Si"], w: 1.5 },
        { q: "What you trust at the limit:", a: "Current muscle memory", b: "Past safety data", dA: ["Se", "Ni"], dB: ["Si", "Ne"], w: 1.5 }
    ];
    const m4Data_B = [
        { q: "Behavior when reason snaps:", a: "Vengeful pursuit of sensory rush", b: "OCD-style obsession over details", dA: ["Se"], dB: ["Si"], w: 2 },
        { q: "When professional dignity is trampled:", a: "Crush them with rigid rules", b: "Tear them apart with sarcastic logic", dA: ["Te"], dB: ["Ti"], w: 2 },
        { q: "Facing unmeasurable crisis:", a: "Sink into fatalist despair", b: "Panic-imagine every bad possibility", dA: ["Ni"], dB: ["Ne"], w: 2 },
        { q: "Devotion utterly betrayed:", a: "Crave external validation desperately", b: "Shut down all pain receptors", dA: ["Fe"], dB: ["Fi"], w: 2 },
        { q: "Trapped in a dull, repetitive environment:", a: "Urge to physically destroy something", b: "Sink into absurd conspiracy theories", dA: ["Se"], dB: ["Ne"], w: 2 },
        { q: "Major life trauma:", a: "Cold-blooded — sever all old memory", b: "Replay the wounding moment endlessly", dA: ["Ni"], dB: ["Si"], w: 2 },
        { q: "Major goal severely behind:", a: "Frantically handle pointless busy-work", b: "Abnormally try to please those around me", dA: ["Te"], dB: ["Fe"], w: 2 },
        { q: "Cherished truth overturned:", a: "Mental infinite-debug crash", b: "Suspect my own nature is evil", dA: ["Ti"], dB: ["Fi"], w: 2 },
        { q: "Stuck in long deep self-attrition:", a: "Feel the world is full of malice", b: "Obsess over tiny logical holes", dA: ["Ni", "Fi"], dB: ["Ti", "Si"], w: 2 },
        { q: "Method of escaping reality:", a: "Issue blind empty promises", b: "Short-sightedly seize nearby resources", dA: ["Ne", "Fe"], dB: ["Te", "Se"], w: 2 },
        { q: "System hits a severe bottleneck:", a: "Fantasize about parallel perfect timelines", b: "Hold on tight to past minor mistakes", dA: ["Ne", "Fi"], dB: ["Si", "Ti"], w: 2 },
        { q: "Loss of purpose:", a: "Robotically chase low-grade stimuli", b: "Fake socializing with no real connection", dA: ["Se", "Te"], dB: ["Fe", "Ne"], w: 2 },
        { q: "Confronted with chaos beyond comprehension:", a: "Self-blame and catastrophic delusion", b: "Crush it with crude binary thinking", dA: ["Fi", "Ni"], dB: ["Te", "Si"], w: 2 },
        { q: "Faith betrayed for personal gain:", a: "Indulge in danger and rationalize it", b: "Spin a story to fish for sympathy", dA: ["Se", "Ti"], dB: ["Ne", "Fe"], w: 2 },
        { q: "Trapped in an unchanging environment:", a: "Build paranoid defensive conspiracy theories", b: "Ruminate over past social slip-ups", dA: ["Ni", "Ti"], dB: ["Si", "Fe"], w: 2 },
        { q: "Lost all sense of life meaning:", a: "Coldly switch battlefields, abandon the old crew", b: "No-floor compliance with mass entertainment", dA: ["Te", "Ne"], dB: ["Fe", "Se"], w: 2 }
    ];

    // ==========================================
    // [Module C] Vision / Awakening — m1-4Data_C
    // ==========================================
    const m1Data_C = [
        { q: "Which kind of leader do you most genuinely admire?", a: "One who builds a perfect system that runs itself", b: "One who sees the underlying truth and proposes the ultimate theory", dA: ["Te"], dB: ["Ti"], w: 1 },
        { q: "If your power allowed it, you'd want to become:", a: "The merciless executor pushing the world's wheels forward", b: "The lonely sage solving the universe's ultimate riddles", dA: ["Te"], dB: ["Ti"], w: 1 },
        { q: "The highest expression of human intelligence is:", a: "Turning complex theory into highly-efficient worldly tools", b: "Distilling pure, flawless logic out of chaos", dA: ["Te"], dB: ["Ti"], w: 1 },
        { q: "Deep down, when facing worldly success, you crave:", a: "Absolute power to allocate resources", b: "Absolute freedom from worldly noise", dA: ["Te"], dB: ["Ti"], w: 1 },
        { q: "Which kind of protagonist moves you most?", a: "The hero who sacrifices themselves for collective good", b: "The lone wanderer who guards their soul-line even against the world", dA: ["Fe"], dB: ["Fi"], w: 1 },
        { q: "What \"superpower\" do you wish you had?", a: "Instantly melt others' walls and warm everyone", b: "Absolute steadiness — never moved by external noise", dA: ["Fe"], dB: ["Fi"], w: 1 },
        { q: "The most beautiful version of the world is:", a: "A harmonious utopia where everyone understands and supports each other", b: "Everyone able to be authentic, with zero pretense", dA: ["Fe"], dB: ["Fi"], w: 1 },
        { q: "Looking back, the verdict you most want is:", a: "\"He was warm and gave countless people strength.\"", b: "\"He was pure, sincere, and never betrayed himself.\"", dA: ["Fe"], dB: ["Fi"], w: 1 },
        { q: "Which genius's gift do you envy most?", a: "Endless inspiration — disrupts disciplines and reframes cognition", b: "One glance and you see the inevitable endgame", dA: ["Ne"], dB: ["Ni"], w: 1 },
        { q: "If you could pick a life trajectory:", a: "A rhapsody of dozens of careers and possibilities", b: "An epic march toward one grand destined goal", dA: ["Ne"], dB: ["Ni"], w: 1 },
        { q: "The key to advancing the era is:", a: "Disruptive divergent thinking that breaks every frame", b: "Strategy that sees through history and captures future trends", dA: ["Ne"], dB: ["Ni"], w: 1 },
        { q: "Looking at the night sky, you crave to:", a: "Discover countless parallel universes intersecting in strange ways", b: "Realize the single, fated law pulling all of this together", dA: ["Ne"], dB: ["Ni"], w: 1 },
        { q: "Which lifestyle do you most yearn for?", a: "Free-flowing — savor every moment of extreme sensory feast", b: "Quiet years — settled in a memory-rich safe harbor", dA: ["Se"], dB: ["Si"], w: 1 },
        { q: "Which state feels most reassuring?", a: "A strong body and reflex that handles any sudden crisis", b: "A perfect defense system and rich reserve against disaster", dA: ["Se"], dB: ["Si"], w: 1 },
        { q: "On \"craftsmanship,\" you yearn more for:", a: "Sharp sense of the material in real time, improvisational artistry", b: "Through ten thousand tedious reps, achieving absolute precision", dA: ["Se"], dB: ["Si"], w: 1 },
        { q: "The depth of life comes from:", a: "Burning the most brilliant physical experience in finite years", b: "Carrying beautiful traditions and memory forward, intact", dA: ["Se"], dB: ["Si"], w: 1 }
    ];
    const m2Data_C = [
        { q: "You wish you were better at:", a: "Ignoring emotional pressure and ruling coldly for the whole", b: "Letting go of efficiency, patiently listening to others' fragility", dA: ["Te"], dB: ["Fe"], w: 1 },
        { q: "The core of a great organization is:", a: "Clear reward and punishment, an iron-rule of efficiency", b: "Strong cohesion and a shared resonance network of belief", dA: ["Te"], dB: ["Fe"], w: 1 },
        { q: "In your perfect future, you are:", a: "On the throne, calmly directing global resources", b: "Among the people, healing souls with love and care", dA: ["Te"], dB: ["Fe"], w: 1 },
        { q: "True maturity is:", a: "Acknowledging the world is result-driven and mastering its rules", b: "Understanding logic doesn't solve everything — emotion is the final home", dA: ["Te"], dB: ["Fe"], w: 1 },
        { q: "If you could keep only one quality, you'd choose:", a: "Pure objective rationality, no sentimental noise", b: "Pure inner conscience, no profit-driven contamination", dA: ["Ti"], dB: ["Fi"], w: 1 },
        { q: "The biggest psychological barrier you want to break:", a: "Weakness — being hijacked by emotion and unable to hold to objective truth", b: "Numbness — over-reliance on cold logic, losing the ability to empathize", dA: ["Ti"], dB: ["Fi"], w: 1 },
        { q: "Your ideal spiritual mentor is:", a: "A prophet who can perfectly explain how everything in the universe runs", b: "A sage who guides you to find your soul's true belonging", dA: ["Ti"], dB: ["Fi"], w: 1 },
        { q: "The legacy you want to leave behind:", a: "An exquisite theory that perfectly explains complex phenomena", b: "An artistic creation that deeply moves and saves countless souls", dA: ["Ti"], dB: ["Fi"], w: 1 },
        { q: "What trait do you most envy in others?", a: "Childlike mind — always sparking brilliant new ideas, unbound by reality", b: "Sharp ability to instantly adapt to and master any physical environment", dA: ["Ne"], dB: ["Se"], w: 1 },
        { q: "For an epic journey you'd lean toward:", a: "Sail the ocean of thought, link knowledge across dimensions", b: "Climb the highest peak with your body — feel heartbeat and wind for real", dA: ["Ne"], dB: ["Se"], w: 1 },
        { q: "True freedom lives in:", a: "Endless expansion of cognitive frame and freedom to imagine", b: "Unbounded physical space and freedom to act", dA: ["Ne"], dB: ["Se"], w: 1 },
        { q: "The \"awakening\" moment you most want:", a: "Eureka — the sudden link between hidden things across topics", b: "Adrenaline blast — fully fused with the present environment", dA: ["Ne"], dB: ["Se"], w: 1 },
        { q: "The best strategy against the unknown is:", a: "Strategic intuition that sees through fog and predicts the inevitable trajectory", b: "Encyclopedic historical experience, ready for every situation", dA: ["Ni"], dB: ["Si"], w: 1 },
        { q: "On the road to extremes, you value more:", a: "Absolute faith and obsession with the final grand vision", b: "Perfect insistence and polishing of every microscopic detail", dA: ["Ni"], dB: ["Si"], w: 1 },
        { q: "The transcendent attitude you'd want is:", a: "Indifference to instant gain, all serving the fated long-term layout", b: "Fearless of the unknown — feet on the ground, defending each daily inch", dA: ["Ni"], dB: ["Si"], w: 1 },
        { q: "The value of history is:", a: "It's the cyclical track — used to predict the inevitable future", b: "It's hard evidence of what really happened — the cornerstone of defense", dA: ["Ni"], dB: ["Si"], w: 1 }
    ];
    const m3Data_C = [
        { q: "The ultimate trial of a hero is:", a: "Cutting personal ties with your own hand for the greater efficiency", b: "Bearing collective contempt to defend truth", dA: ["Te", "Fi"], dB: ["Ti", "Fe"], w: 1.5 },
        { q: "After full transformation, you wish to:", a: "Use forceful real-world means to protect the soft beliefs inside", b: "Use exquisite underlying logic to weave a net of happiness for everyone", dA: ["Te", "Fi"], dB: ["Ti", "Fe"], w: 1.5 },
        { q: "Your deepest hidden desire is actually:", a: "Cold on the outside — but craving someone to understand your high moral purity", b: "Fitting in with the group — but craving someone to see your absolute objective wisdom", dA: ["Te", "Fi"], dB: ["Ti", "Fe"], w: 1.5 },
        { q: "True salvation comes from:", a: "Building flawless order so every soul has fair shelter", b: "Tearing down every fallacy so the group resonates in absolute truth", dA: ["Te", "Fi"], dB: ["Ti", "Fe"], w: 1.5 },
        { q: "You envy people who paradoxically combine:", a: "Extreme performance dictator with an untouchable romantic core", b: "Extremely tender beloved figure with a machine-cold mind", dA: ["Te", "Fi"], dB: ["Ti", "Fe"], w: 1.5 },
        { q: "If you could heal the fatal flaw of personality, you'd pick:", a: "No more derailing plans by clinging too hard to personal principle", b: "No more covering critical logical errors out of social regard", dA: ["Te", "Fi"], dB: ["Ti", "Fe"], w: 1.5 },
        { q: "The highest state you yearn for:", a: "Strongarming abstract soul-belief into concrete reality", b: "Tenderly translating cold logical law for the whole world", dA: ["Te", "Fi"], dB: ["Ti", "Fe"], w: 1.5 },
        { q: "At life's end, you want to say:", a: "\"I spent my life defending the things I knew were worth defending.\"", b: "\"I finally saw through it all — and gave that wisdom to everyone.\"", dA: ["Te", "Fi"], dB: ["Ti", "Fe"], w: 1.5 },
        { q: "True foresight must include:", a: "Inevitable long-term projection plus absolute control of present physical resources", b: "Divergence over parallel possibilities plus deep absorption of historical experience", dA: ["Ni", "Se"], dB: ["Ne", "Si"], w: 1.5 },
        { q: "In extreme chaos, you want to display:", a: "Beast-like physical instinct paired with chess-master endgame projection", b: "Magician-like strange association paired with historian-level precision of memory", dA: ["Ni", "Se"], dB: ["Ne", "Si"], w: 1.5 },
        { q: "Combining two extreme gifts, you'd pick:", a: "Strike fatally in an instant, while every step lays groundwork for the future", b: "Find infinite life in the seeming dead-end, while every backup is rock-solid", dA: ["Ni", "Se"], dB: ["Ne", "Si"], w: 1.5 },
        { q: "The most fascinating tension in life is:", a: "Fated long convergence colliding with the present's blazing instant", b: "Mind's infinite divergence pulling against the rigid safe boundary", dA: ["Ni", "Se"], dB: ["Ne", "Si"], w: 1.5 },
        { q: "Blind spot you want to overcome:", a: "Stop losing real-world action because of over-fantasizing", b: "Stop killing every chance of change out of fear of the unknown", dA: ["Ni", "Se"], dB: ["Ne", "Si"], w: 1.5 },
        { q: "The \"god's-eye view\" you most want to experience:", a: "Become a hawk — see from above the single endpoint of time's flow", b: "Become a creator — build countless wildly different universes in the head", dA: ["Ni", "Se"], dB: ["Ne", "Si"], w: 1.5 },
        { q: "True groundedness comes from:", a: "Driving an ethereal vision into reality with raw physical force", b: "Stabilizing wild flying inspiration through rigorous standardized process", dA: ["Ni", "Se"], dB: ["Ne", "Si"], w: 1.5 },
        { q: "The ultimate balance you yearn for:", a: "Predict the era at the macro level, yet savor the texture of one cup of coffee at the micro", b: "Break tradition without limit, yet revere precious past memory", dA: ["Ni", "Se"], dB: ["Ne", "Si"], w: 1.5 }
    ];
    const m4Data_C = [
        { q: "When you fully overcome your weakness, you'll:", a: "Shift from a fantasy-dweller to a master of matter and reality", b: "Shift from a change-refuser to an explorer embracing every unknown", dA: ["Se"], dB: ["Ne"], w: 2 },
        { q: "Your soul's hidden form deep inside is:", a: "A dictator who craves to protect the weak by building absolute authority", b: "A hermit who craves to sever every bond by perceiving the universe's truth", dA: ["Te"], dB: ["Ti"], w: 2 },
        { q: "If you fully \"went dark,\" it'd most likely be because:", a: "You saw humanity has no future and decided to end it early", b: "You carried too much of others' hopes and got swallowed by collective emotion", dA: ["Ni"], dB: ["Fe"], w: 2 },
        { q: "If your mind were a fortress, you'd want it to have:", a: "Walls indestructible against any physical attack", b: "An inner sanctum holding the purest art and morality", dA: ["Si"], dB: ["Fi"], w: 2 },
        { q: "What you secretly crave but rarely show is:", a: "Drop every long-term concern and unleash sensory desire without restraint", b: "Ignore every worldly metric of efficiency, indulge in useless inspiration", dA: ["Se"], dB: ["Ne"], w: 2 },
        { q: "The light of humanity will ultimately shine in:", a: "Facing past trauma and turning it into the safe foundation of forward motion", b: "Holding the deepest values, even at the cost of total isolation", dA: ["Si"], dB: ["Fi"], w: 2 },
        { q: "What you most want to say to your past, immature self:", a: "\"Don't fear showing dominance — your strength brings real order.\"", b: "\"Don't fear seeking group acknowledgment — your tenderness is not weakness.\"", dA: ["Te"], dB: ["Fe"], w: 2 },
        { q: "The \"cure\" you've been chasing your whole life is:", a: "A perfect logic that lets you find absolute right and wrong in chaos", b: "A place to drop every defense and show pure self", dA: ["Ti"], dB: ["Fi"], w: 2 },
        { q: "In old age, you wish to be:", a: "An elder who has seen through the world and gives uncannily accurate predictions", b: "A walking library — vast experience, precisely recounting countless historical details", dA: ["Ni"], dB: ["Si"], w: 2 },
        { q: "To reach true self-actualization, you must learn to:", a: "Embrace chaos and divergence — allow yourself seemingly meaningless attempts", b: "Face physical reality — exchange action and sweat for tangible result", dA: ["Ne"], dB: ["Se"], w: 2 },
        { q: "What kind of strength do you most want to be remembered for?", a: "Execution that moves vast organizations and resources, reshaping the world map", b: "Influence that gathers strangers and makes them cry over the same idea", dA: ["Te"], dB: ["Fe"], w: 2 },
        { q: "Facing the vastness of the universe, you crave to:", a: "Decode its structure with the most rigorous underlying mathematics", b: "Feel its beauty with the purest art and inner soul", dA: ["Ti"], dB: ["Fi"], w: 2 },
        { q: "The limit of your potential lies in:", a: "Cashing out your grand vision into the world by force, perfectly", b: "Stabilizing your unbounded ideas through rigorous historical experience", dA: ["Ni", "Te"], dB: ["Ne", "Si"], w: 2 },
        { q: "The hero's journey ending you most yearn for:", a: "After extreme sensory adventure, see through the underlying logic and choose retreat", b: "After countless emotional betrayals, still embrace the world with love", dA: ["Se", "Ti"], dB: ["Fe", "Ni"], w: 2 },
        { q: "The hardest yet most worthwhile life-discipline:", a: "Admit you don't know the future and learn to enjoy the uncertainty of now", b: "Admit you over-rely on logic and learn to accept your own emotional fragility", dA: ["Ne", "Si"], dB: ["Ti", "Fe"], w: 2 },
        { q: "In the end, what do you want your existence to mean to the world?", a: "An unfalling lighthouse — providing absolute objective and cold guidance", b: "An unending campfire — providing absolute warmth and selfless protection", dA: ["Te", "Ni"], dB: ["Fe", "Si"], w: 2 }
    ];

    // Expose
    window.QUESTIONS_EN = {
        AXIS_PROBES: AXIS_PROBES,
        PROBES: PROBES,
        m1Data_A: m1Data_A, m2Data_A: m2Data_A, m3Data_A: m3Data_A, m4Data_A: m4Data_A,
        m1Data_B: m1Data_B, m2Data_B: m2Data_B, m3Data_B: m3Data_B, m4Data_B: m4Data_B,
        m1Data_C: m1Data_C, m2Data_C: m2Data_C, m3Data_C: m3Data_C, m4Data_C: m4Data_C,
        mData_Likert_D: mData_Likert_D, mData_Forced_D: mData_Forced_D, mData_SJT_D: mData_SJT_D, mData_Ranking_D: mData_Ranking_D,
        mData_Likert_E: mData_Likert_E, mData_Forced_E: mData_Forced_E, mData_SJT_E: mData_SJT_E, mData_Ranking_E: mData_Ranking_E,
        mData_Likert_F: mData_Likert_F, mData_Forced_F: mData_Forced_F, mData_SJT_F: mData_SJT_F, mData_Ranking_F: mData_Ranking_F
    };

    // 拿單一 bank（locale=en 且 bank 存在才回傳；否則 null 讓 caller fallback 中文）
    window.pickEnBank = function (key) {
        try {
            const loc = (typeof window.getLocale === 'function')
                ? window.getLocale()
                : (localStorage.getItem('mbti_locale') || 'zh-Hant');
            if (loc !== 'en') return null;
            return window.QUESTIONS_EN[key] || null;
        } catch (_) { return null; }
    };
})();
