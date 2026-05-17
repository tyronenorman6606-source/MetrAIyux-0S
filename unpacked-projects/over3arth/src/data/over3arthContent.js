export const realms = [
  {
    id: 'body',
    name: 'Body Temple',
    sigil: '✦',
    color: 'cyan',
    promise: 'Strength, vitality, sleep, food, movement, and physical discipline.',
    starterGoal: 'Train my body into a reliable vessel of energy.'
  },
  {
    id: 'wealth',
    name: 'Wealth Forge',
    sigil: '◆',
    color: 'gold',
    promise: 'Money skills, income systems, savings, sales, assets, and financial command.',
    starterGoal: 'Build income momentum with repeatable daily money moves.'
  },
  {
    id: 'craft',
    name: 'Craft Citadel',
    sigil: '⬡',
    color: 'violet',
    promise: 'Career, business, learning, mastery, shipping, skill, and public proof.',
    starterGoal: 'Ship visible proof of my strongest skill every week.'
  },
  {
    id: 'mind',
    name: 'Mind Observatory',
    sigil: '◈',
    color: 'blue',
    promise: 'Focus, study, attention, emotional regulation, planning, and mental clarity.',
    starterGoal: 'Command my attention instead of letting noise command me.'
  },
  {
    id: 'heart',
    name: 'Heart Dominion',
    sigil: '✧',
    color: 'rose',
    promise: 'Relationships, communication, family, friendship, intimacy, repair, and belonging.',
    starterGoal: 'Show up with more presence and cleaner communication.'
  },
  {
    id: 'spirit',
    name: 'Spirit Nexus',
    sigil: '☉',
    color: 'green',
    promise: 'Meaning, values, faith, identity, gratitude, purpose, and inner alignment.',
    starterGoal: 'Return to the values that make me powerful under pressure.'
  }
];

export const archetypes = [
  {
    id: 'sovereign',
    name: 'Sovereign',
    icon: '♛',
    mantra: 'I do not wait for permission. I govern my focus and move with command.',
    gift: 'authority',
    challenge: 'turn power into consistent systems instead of one violent burst'
  },
  {
    id: 'architect',
    name: 'Architect',
    icon: '⌬',
    mantra: 'I turn vision into structure, structure into rhythm, and rhythm into reality.',
    gift: 'design',
    challenge: 'stop perfecting the blueprint long enough to lay the first stone'
  },
  {
    id: 'alchemist',
    name: 'Alchemist',
    icon: '⚗',
    mantra: 'I convert pressure into fuel, setbacks into data, and chaos into gold.',
    gift: 'transmutation',
    challenge: 'finish the transformation instead of chasing the next spark'
  },
  {
    id: 'oracle',
    name: 'Oracle',
    icon: '◉',
    mantra: 'I listen deeply, see clearly, and choose the move that serves the highest path.',
    gift: 'insight',
    challenge: 'use clarity as a trigger for action, not as a hiding place'
  },
  {
    id: 'titan',
    name: 'Titan',
    icon: '▰',
    mantra: 'I endure, build, protect, and advance. My discipline is a living force.',
    gift: 'discipline',
    challenge: 'make recovery part of strength instead of treating rest like weakness'
  },
  {
    id: 'muse',
    name: 'Muse',
    icon: '✺',
    mantra: 'I create from overflow. My expression becomes signal, beauty, and proof.',
    gift: 'expression',
    challenge: 'ship the imperfect art before the feeling fades'
  }
];

export const starterAffirmations = [
  'I am not trapped inside the old version of my life. I am building the next one through action.',
  'My attention is sacred. Where I place it, I create movement.',
  'I turn intention into behavior, behavior into evidence, and evidence into identity.',
  'I do not need perfect energy to begin. Beginning creates energy.',
  'I am allowed to want more, build more, receive more, and become more.',
  'My reality responds to repeated choices. Today I choose the reality I am forging.',
  'I can honor the obstacle without obeying it.',
  'Every completed action is a vote for the world I claim to live in.',
  'I act like the future version of me has already sent instructions back to today.',
  'My power is not fantasy. It is focus, repetition, repair, and proof.'
];

export const ritualPrompts = [
  'What reality are you feeding today?',
  'What one action proves your future self is already online?',
  'Where is your energy leaking, and what boundary seals it?',
  'What obstacle is predictable enough to pre-defeat with an if–then plan?',
  'What would your highest version do in the next 30 minutes?',
  'What signal do you need to stop consuming and start becoming?',
  'What small proof can you create before the day ends?',
  'What value are you protecting by showing up today?'
];

export const questTemplates = [
  'Do the smallest visible action toward this goal for 13 minutes.',
  'Write the if–then plan for the obstacle that usually steals your momentum.',
  'Create one piece of proof: a message sent, a rep logged, a draft made, a task completed.',
  'Remove one friction point from the environment around this goal.',
  'Capture one lesson from today and convert it into tomorrow’s first move.',
  'Ask: what would make this 10% easier to repeat? Then do that.'
];

export const researchPrinciples = [
  {
    label: 'Values affirmation',
    appMechanic: 'Affirmations are tied to identity, values, and self-integrity rather than empty hype.'
  },
  {
    label: 'Implementation intentions',
    appMechanic: 'Every serious goal can become an if–then battle plan: if obstacle appears, then action follows.'
  },
  {
    label: 'Mental contrasting / WOOP',
    appMechanic: 'Users name the desired outcome and the obstacle so motivation becomes grounded.'
  },
  {
    label: 'Self-determination',
    appMechanic: 'The app supports autonomy, competence, and relatedness through chosen worlds, skill progress, and reflection.'
  },
  {
    label: 'Expressive writing',
    appMechanic: 'Notes and rituals help users process emotion, extract meaning, and convert chaos into action.'
  },
  {
    label: 'Flow design',
    appMechanic: 'Quests stay clear, immediate, and adjustable so challenge and skill can stay balanced.'
  }
];


export const worldBlueprints = [
  {
    id: 'business-genesis',
    name: 'Business Genesis',
    tagline: 'Launch signal, sales proof, operating rhythm, and money movement.',
    goals: [
      {
        title: 'Ship one public offer with a clear promise',
        realm: 'craft',
        why: 'A real offer turns private ambition into market-facing proof.',
        desiredOutcome: 'People can understand what I sell, who it helps, and what to do next.',
        obstacle: 'Overbuilding before the offer is visible.',
        ifThen: 'If I start polishing instead of publishing, then I will ship the simplest clear version today.'
      },
      {
        title: 'Create a daily sales/prospecting proof loop',
        realm: 'wealth',
        why: 'Income momentum needs repeated contact with opportunity.',
        desiredOutcome: 'Every day has at least one visible money move.',
        obstacle: 'Waiting until the offer feels perfect.',
        ifThen: 'If I feel uncertain, then I will send one honest outreach message anyway.'
      },
      {
        title: 'Build a weekly operating review',
        realm: 'mind',
        why: 'What gets reviewed gets refined.',
        desiredOutcome: 'I know what moved, what stalled, and what gets fixed next.',
        obstacle: 'Letting weeks blur together without proof.',
        ifThen: 'If Friday arrives, then I will complete the Over3arth review before starting new work.'
      }
    ]
  },
  {
    id: 'body-temple-reset',
    name: 'Body Temple Reset',
    tagline: 'Energy, sleep, movement, and recovery without fake perfection.',
    goals: [
      {
        title: 'Move my body for 20 minutes four times this week',
        realm: 'body',
        why: 'Energy becomes easier to command when the body receives consistent movement.',
        desiredOutcome: 'I feel physically awake, less stuck, and more reliable.',
        obstacle: 'All-or-nothing thinking when I miss a day.',
        ifThen: 'If I miss the ideal workout, then I will do a 10-minute minimum proof move.'
      },
      {
        title: 'Protect a realistic sleep shutdown ritual',
        realm: 'body',
        why: 'Recovery is part of power, not a reward after burnout.',
        desiredOutcome: 'My nights stop stealing from tomorrow.',
        obstacle: 'Late-night scrolling and unfinished loops.',
        ifThen: 'If I reach my shutdown time, then I will write tomorrow’s first move and close the loop.'
      },
      {
        title: 'Capture one body signal per day',
        realm: 'mind',
        why: 'Awareness turns vague fatigue into usable data.',
        desiredOutcome: 'I can see which habits give or drain energy.',
        obstacle: 'Ignoring signals until they become problems.',
        ifThen: 'If I feel off, then I will log the signal instead of judging it.'
      }
    ]
  },
  {
    id: 'wealth-circuit',
    name: 'Wealth Circuit',
    tagline: 'Money awareness, repeatable income action, and cleaner decisions.',
    goals: [
      {
        title: 'Track every money move for seven days',
        realm: 'wealth',
        why: 'Money command starts with visibility.',
        desiredOutcome: 'I know what came in, what went out, and what deserves adjustment.',
        obstacle: 'Avoiding numbers when they feel uncomfortable.',
        ifThen: 'If I avoid checking money, then I will open the ledger for five minutes only.'
      },
      {
        title: 'Create one asset or offer that can compound',
        realm: 'craft',
        why: 'Compounding starts when effort becomes reusable.',
        desiredOutcome: 'One piece of work can create repeated value instead of dying after one use.',
        obstacle: 'Only doing urgent tasks.',
        ifThen: 'If the day fills with urgent noise, then I will spend 13 minutes on the asset first.'
      },
      {
        title: 'Make one value-first money ask',
        realm: 'heart',
        why: 'Selling is cleaner when the ask is tied to service and clarity.',
        desiredOutcome: 'I practice asking without shrinking.',
        obstacle: 'Fear of being annoying or rejected.',
        ifThen: 'If fear shows up, then I will make the ask respectful, direct, and useful.'
      }
    ]
  },
  {
    id: 'creative-ascension',
    name: 'Creative Ascension',
    tagline: 'Expression, shipping rhythm, audience signal, and identity proof.',
    goals: [
      {
        title: 'Publish one imperfect creative proof this week',
        realm: 'craft',
        why: 'Expression becomes real when it leaves the private vault.',
        desiredOutcome: 'My work has a public signal, even before it is perfect.',
        obstacle: 'Waiting for the exact right feeling.',
        ifThen: 'If I start hiding behind revision, then I will publish a smaller version.'
      },
      {
        title: 'Capture ten raw ideas without judging them',
        realm: 'spirit',
        why: 'Creative energy needs collection before it needs criticism.',
        desiredOutcome: 'I have a living bank of sparks to build from.',
        obstacle: 'Killing ideas too early.',
        ifThen: 'If an idea feels rough, then I will capture it as raw signal, not final work.'
      },
      {
        title: 'Create a repeatable creative ritual',
        realm: 'mind',
        why: 'Ritual makes inspiration easier to enter.',
        desiredOutcome: 'I know how to start without waiting for motivation.',
        obstacle: 'Opening too many inputs before creating.',
        ifThen: 'If I want to consume first, then I will create for 13 minutes before taking in more signal.'
      }
    ]
  }
];

export const realityContractTemplates = [
  {
    id: 'thirteen-day-spark',
    name: '13-Day Spark Contract',
    days: 13,
    dailyProof: 'Complete one 13-minute proof move before the day ends.',
    boundary: 'No punishment language. Missed days become recovery rites, not identity damage.'
  },
  {
    id: 'thirty-day-arc',
    name: '30-Day Ascension Arc',
    days: 30,
    dailyProof: 'Move the selected realm forward with one visible proof action.',
    boundary: 'Do not add new goals until the current command has proof.'
  },
  {
    id: 'seven-day-cleanse',
    name: '7-Day Energy Cleanse',
    days: 7,
    dailyProof: 'Remove one friction point and record the energy shift.',
    boundary: 'No doom-scrolling before the first command action.'
  }
];

export const planLanes = [
  {
    id: 'forge',
    name: 'Forge',
    price: '$0 preview',
    promise: 'Local-first world building, quests, rituals, notes, reviews, and export.',
    features: ['World Genesis', 'Reality Ledger', 'Blueprint Packs', 'Manual Proof Quests']
  },
  {
    id: 'ascendant',
    name: 'Ascendant',
    price: '$13/mo target',
    promise: 'Premium retention layer planned for synced worlds, deeper analytics, and expanded packs.',
    features: ['Cloud Sync Slot', 'Advanced Insights', 'Share Cards', 'Extended Blueprint Library']
  },
  {
    id: 'sovereign',
    name: 'Sovereign',
    price: '$31/mo target',
    promise: 'Operator-grade lane planned for coaches, creators, small teams, and guided transformation programs.',
    features: ['Multi-World Spaces', 'Coach Dashboard', 'Program Templates', 'Client Export Packets']
  }
];

export const focusSessionTemplates = [
  {
    id: 'thirteen-minute-spark',
    name: '13-Minute Spark',
    minutes: 13,
    realm: 'craft',
    intent: 'Create the smallest visible proof before resistance gets a vote.'
  },
  {
    id: 'twenty-five-minute-forge',
    name: '25-Minute Forge',
    minutes: 25,
    realm: 'craft',
    intent: 'Build one meaningful block of the intended reality with no input switching.'
  },
  {
    id: 'wealth-command-block',
    name: 'Wealth Command Block',
    minutes: 31,
    realm: 'wealth',
    intent: 'Complete one direct money move: outreach, offer, invoice, budget, asset, or follow-up.'
  },
  {
    id: 'mind-clean-room',
    name: 'Mind Clean Room',
    minutes: 20,
    realm: 'mind',
    intent: 'Clear noise, define the next command, and leave with one written decision.'
  }
];


export const anchorTemplates = [
  {
    id: 'morning-command',
    name: 'Morning Command Anchor',
    realm: 'mind',
    cue: 'When I first touch my phone or open my laptop',
    action: 'I open Over3arth and seal today’s ritual before consuming feeds.',
    environment: 'Home screen, desk, lock screen, or browser start page',
    friction: 'Move distracting apps one folder away and place Over3arth first.',
    reward: 'Reality Charge rises before the world makes demands.'
  },
  {
    id: 'wealth-first-move',
    name: 'Wealth First Move',
    realm: 'wealth',
    cue: 'When the workday starts',
    action: 'I complete one money move before busywork: outreach, offer, invoice, follow-up, or asset creation.',
    environment: 'Pinned tab, CRM, notes app, or offer dashboard',
    friction: 'Keep a prepared list of five money moves so there is no decision drag.',
    reward: 'Income momentum gets proof before avoidance can negotiate.'
  },
  {
    id: 'body-reset-gate',
    name: 'Body Reset Gate',
    realm: 'body',
    cue: 'When I feel sluggish, scattered, or stuck',
    action: 'I do a 7-minute reset: water, movement, breath, or walk.',
    environment: 'Water bottle, shoes, mat, or hallway route',
    friction: 'Make the reset so small that resistance has no useful argument.',
    reward: 'Energy becomes a lever instead of a mystery.'
  },
  {
    id: 'shutdown-oracle',
    name: 'Shutdown Oracle',
    realm: 'spirit',
    cue: 'When the day is ending',
    action: 'I log one lesson, one proof, and tomorrow’s first command.',
    environment: 'Bedside notebook, Over3arth notes, or calendar closeout',
    friction: 'No long journaling requirement. Three lines are enough.',
    reward: 'Tomorrow starts with instructions instead of fog.'
  }
];


export const epochTemplates = [
  {
    id: 'thirteen-day-ignition',
    name: '13-Day Ignition Epoch',
    days: 13,
    realm: 'mind',
    horizon: 'Short burst reset',
    northStar: 'Create fast proof that the new identity is already moving.',
    milestones: ['Choose one command', 'Prove it daily', 'Seal the lesson and raise the standard']
  },
  {
    id: 'thirty-day-reality-arc',
    name: '30-Day Reality Arc',
    days: 30,
    realm: 'craft',
    horizon: 'One focused monthly build',
    northStar: 'Turn intention into a visible system, skill, offer, body rhythm, or relationship upgrade.',
    milestones: ['Define the outcome', 'Build weekly proof', 'Review and refine the operating loop']
  },
  {
    id: 'ninety-day-dominion',
    name: '90-Day Dominion Quest',
    days: 90,
    realm: 'wealth',
    horizon: 'Quarter-scale transformation',
    northStar: 'Create durable evidence that one major realm is no longer being run by the old pattern.',
    milestones: ['Install the foundation', 'Increase visible output', 'Package proof and decide the next epoch']
  }
];

export const allianceTemplates = [
  {
    id: 'mirror-witness',
    name: 'Mirror Witness',
    role: 'Witness',
    cadence: 'Weekly',
    ask: 'Ask me what proof I created and what pattern tried to pull me backward.'
  },
  {
    id: 'builder-ally',
    name: 'Builder Ally',
    role: 'Action Partner',
    cadence: 'Twice weekly',
    ask: 'Exchange one build target, one blocker, and one completed proof.'
  },
  {
    id: 'guardian-boundary',
    name: 'Boundary Guardian',
    role: 'Boundary Keeper',
    cadence: 'As needed',
    ask: 'Remind me of the standard I set when I start negotiating with the old loop.'
  },
  {
    id: 'celebration-oracle',
    name: 'Celebration Oracle',
    role: 'Proof Celebrator',
    cadence: 'Weekly',
    ask: 'Help me notice wins instead of instantly raising the bar without receiving the proof.'
  }
];

export const canonTemplates = [
  {
    id: 'proof-before-mood',
    realm: 'mind',
    law: 'Proof before mood. I do not wait to feel ready before I create evidence.'
  },
  {
    id: 'energy-is-directed',
    realm: 'spirit',
    law: 'Energy is directed by attention, environment, language, and repeated action.'
  },
  {
    id: 'money-moves-visible',
    realm: 'wealth',
    law: 'Money movement becomes visible daily through offers, follow-ups, budgets, assets, or delivery.'
  },
  {
    id: 'body-is-altar',
    realm: 'body',
    law: 'My body is not punishment territory. It is the altar that carries the mission.'
  },
  {
    id: 'repair-is-power',
    realm: 'heart',
    law: 'Repair is power. I communicate cleaner instead of silently building resentment.'
  },
  {
    id: 'ship-the-signal',
    realm: 'craft',
    law: 'Ship the signal. Imperfect public proof beats perfect private intention.'
  }
];
