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

    // Expose
    window.QUESTIONS_EN = {
        AXIS_PROBES: AXIS_PROBES,
        PROBES: PROBES,
        m1Data_A: null, m2Data_A: null, m3Data_A: null, m4Data_A: null,
        m1Data_B: null, m2Data_B: null, m3Data_B: null, m4Data_B: null,
        m1Data_C: null, m2Data_C: null, m3Data_C: null, m4Data_C: null,
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
