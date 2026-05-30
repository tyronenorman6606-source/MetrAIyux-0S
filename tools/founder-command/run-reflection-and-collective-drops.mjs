#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';

const repoRoot = process.cwd();
const require = createRequire(import.meta.url);
const baseUrl = (process.env.PROOF_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const storefrontRoot = path.join(repoRoot, 'metraiyux_0s_site/SkyeMusicNexus/artist-storefronts');
const outDir = path.join(repoRoot, 'test-artifacts/reflection-and-collective-drops');
const songCreationBinRoot = path.join(repoRoot, 'metraiyux_0s_site/SkyeMusicNexus/song-creation-bin');
const superIdeSubmissionAdapters = require(path.join(repoRoot, 'metraiyux_0s_site/DeVisional Riftx/platform/submission-adapters.js'));
const execute = process.argv.includes('--execute');
const packageOnly = process.argv.includes('--package-only');
const promoteApprovedGeneratedAudio = process.argv.includes('--promote-approved-audio') || process.env.SKYE_MUSIC_PROMOTE_GENERATED_AUDIO === '1';
const scopeArg = (process.argv.find((arg) => arg.startsWith('--scope='))?.split('=')[1] || 'all').toLowerCase();
const songIdArg = (process.argv.find((arg) => arg.startsWith('--song-id='))?.split('=')[1] || '').toLowerCase();
const durationSeconds = Number(process.argv.find((arg) => arg.startsWith('--duration='))?.split('=')[1] || 150);
const providerArg = (process.argv.find((arg) => arg.startsWith('--provider='))?.split('=')[1] || 'elevenlabs').toLowerCase();
const publicGeneratedAudioProvider = 'generated-audio-provider';
const singleMasterCompatibilityLimitSeconds = 300;
const priceCents = 444;
const publicSkyeMusicNexusOrigin = (process.env.SKYE_MUSIC_NEXUS_PUBLIC_ORIGIN || 'https://skye-music-nexus.pages.dev').replace(/\/+$/, '');
const newGrayCollabIds = new Set(['gray-brain-twin-signal', 'gray-brain-proof-engine', 'gray-brain-wooooah-factor']);
const collectiveProducerName = 'Gray London Skyes';
const collectiveProducerCredit = 'Produced by Gray London Skyes';
const visualPackageApps = [
  {
    id: 'still2vid-forge',
    name: 'Still2Vid Forge v4',
    url: '/Free99/apps/still2vid-forge/index.html',
    role: 'image-to-video export lane',
  },
  {
    id: 'skyepics',
    name: 'SkyePics Vault',
    url: '/Free99/apps/skyepics/index.html',
    role: 'artist-image capture/import vault',
  },
];

function generatedAudioQualityGate(providerId = '') {
  if (promoteApprovedGeneratedAudio) return null;
  return {
    status: 'held_for_founder_review',
    reason: 'Generated audio is held until an approved master passes founder audio review.',
    provider: publicGeneratedAudioProvider,
    providerPublicName: 'Generated audio provider',
    providerInternalReceipt: 'creation-receipt.json',
    publicPromotion: false,
    radioEligible: false,
    chartEligible: false,
    storeEligible: false,
    heldBy: 'founder-command-audio-quality-gate',
    heldAt: new Date().toISOString(),
    promotionCommand: 'Rerun with --promote-approved-audio only after the audio master is approved.',
  };
}

const secretKeys = [
  'FREE99_ADMIN_CODE',
  'FREE99_GATE_CODE',
  'OWNER_ADMIN_CODE',
  'ADMIN_CODE',
  'ZERO_OS_ADMIN_CODE',
  'METRAIYUX_OWNER_ADMIN_CODE',
  'FS27_ADMIN_CODE',
  'SKYGATEFS27_ADMIN_CODE',
];

const elevenKeys = [
  'eleven_labs_api_key_2',
  'ELEVEN_LABS_API_KEY_2',
  'ELEVENLABS_API_KEY_2',
  'eleven_labs_api_key',
  'ELEVEN_LABS_API_KEY',
  'ELEVENLABS_API_KEY',
  'ELEVENLABS_MUSIC_API_KEY',
  'ELEVEN_API_KEY',
];

const geminiKeys = [
  'GEMINI_API_KEY',
  'Googl_Ggemini_API_Key',
  'SKYGATEFS13_GEMINI_API_KEY',
];

const stabilityKeys = [
  'Stability_api_key_2',
  'STABILITY_API_KEY_2',
  'STABILITY_API_KEY',
  'Stability_api_key',
  'STABILITY_KEY',
];

const openAiKeys = [
  'OPENAI_API_KEY',
  'SKYGATEFS13_OPENAI_API_KEY',
];

const ARTISTS = {
  gray: {slug: 'gray-skyes'},
  brain: {slug: 'gray-skyes-brain'},
  dre: {slug: 'artist-live-browser-20260523060751'},
  sol: {slug: 'artist-full-matrix-20260524113514'},
  vox: {slug: 'artist-live-browser-20260523062845'},
  veda: {slug: 'artist-full-matrix-20260524085129'},
  orion: {slug: 'smoke-artist-mpku77m6'},
  ajay: {slug: 'dj-ajay'},
  radio: {slug: 'radio-vibez'},
  jessa: {slug: 'jessica-walsh'},
  stoves: {slug: 'tha-stoves'},
  music4u: {slug: 'music-4u'},
  sam: {slug: 'sam-smith'},
  roman: {slug: 'artist-live-browser-20260524113443'},
  sable: {slug: 'artist-network-20260524122314'},
  kairo: {slug: 'artist-full-matrix-20260523060758'},
  kaiya: {slug: 'smoke-artist-mpku84sm'},
  lena: {slug: 'artist-live-browser-20260523061012'},
  wyl: {slug: 'william-parker'},
};

const REQUESTED_SONGS = [
  {
    id: 'dre-closed-door-voltage',
    title: 'Closed Door Voltage',
    artistKeys: ['dre'],
    brief: 'Dre Meridian turns closed doors, Mesa pressure, and rebuilt confidence into industrial hip-hop, dark pop, and noise soul.',
  },
  {
    id: 'sol-screenlight-survival',
    title: 'Screenlight Survival',
    artistKeys: ['sol'],
    brief: 'Sol Amari turns isolation, screen-lit nights, and community hunger into emo rap, bedroom punk, and hyperpop.',
  },
  {
    id: 'vox-pixel-heartline',
    title: 'Pixel Heartline',
    artistKeys: ['vox'],
    brief: 'Vox Selene sings from a digital room, turning nervous honesty into glossy emo rap and hyperpop.',
  },
  {
    id: 'veda-orion-ajay-three-suns-after-midnight',
    title: 'Three Suns After Midnight',
    artistKeys: ['veda', 'orion', 'ajay'],
    brief: 'Veda Wraith carries the solar hook, Orion Vale brings desert-noir tension, and DJ Ajay drives the industrial pulse.',
  },
  {
    id: 'vox-radio-signal-hearts',
    title: 'Signal Hearts',
    artistKeys: ['vox', 'radio'],
    brief: 'Vox Selene and Radio Vibez make a two-voice digital-heart duet about being heard without disappearing into the feed.',
  },
  {
    id: 'jessa-stoves-soft-ghosts',
    title: 'Soft Ghosts',
    artistKeys: ['jessa', 'stoves'],
    brief: 'Jessa Walsh brings dream-pop lift while Tha Stoves grounds the record with folk-rap truth and a warm final hook.',
  },
];

const REFLECTION_SONGS = [
  {
    id: 'gray-brain-command-mirror',
    title: 'Command Mirror',
    project: 'Reflection',
    artistKeys: ['brain'],
    brief: 'Gray Skyes Brain delivers neural trap metal and executive synth rap about seeing the operator in the machine.',
  },
  {
    id: 'gray-brain-gate-memory',
    title: 'Gate Memory',
    project: 'Reflection',
    artistKeys: ['brain'],
    brief: 'Gray Skyes Brain turns 0S gate sessions, proof, and founder memory into a dark command-room anthem.',
  },
  {
    id: 'gray-red-room-reflection',
    title: 'Red Room Reflection',
    project: 'Reflection',
    artistKeys: ['gray'],
    brief: 'Gray Skyes makes trap metal and ragecore about survival, ownership, and building a company from pain and proof.',
  },
  {
    id: 'gray-founder-static',
    title: 'Founder Static',
    project: 'Reflection',
    artistKeys: ['gray'],
    brief: 'Gray Skyes turns distorted 808s, chant hooks, and underground performance energy into a founder-artist record.',
  },
  {
    id: 'gray-brain-reflection',
    title: 'Reflection',
    project: 'Reflection',
    artistKeys: ['gray', 'brain'],
    brief: 'Gray Skyes and Gray Skyes Brain collide as human founder and AI command voice, trading verses over neural trap metal and ragecore.',
  },
  {
    id: 'gray-brain-twin-signal',
    title: 'Twin Signal',
    project: 'Reflection',
    artistKeys: ['gray', 'brain'],
    brief: 'Gray Skyes carries the human founder pressure while Gray Skyes Brain answers as the local command mind, turning proof receipts, late-night builds, and stage energy into a clean hook-heavy collab.',
  },
  {
    id: 'gray-brain-proof-engine',
    title: 'Proof Engine',
    project: 'Reflection',
    artistKeys: ['gray', 'brain'],
    brief: 'Gray Skyes and Gray Skyes Brain build a call-and-response anthem about turning pain into product, products into proof, and proof into a living network people can actually use.',
  },
  {
    id: 'gray-brain-wooooah-factor',
    title: 'Wooooah Factor',
    project: 'Reflection',
    artistKeys: ['gray', 'brain'],
    genre: 'Punk Trap Rap / Ragecore Founder Rap',
    brief: 'Gray Skyes and Gray Skyes Brain run a clear vocal-first punk-trap rap collab: Gray brings founder pressure, Gray Brain answers with command precision, and the hook still has the “wooooah” factor without losing the words.',
    styleDirectives: 'Clear vocal-first punk-trap rap: crisp English enunciation, no buried vocals, no growled/mumbled lead, 145 BPM halftime energy, punchy 808 feel, guitar attitude, chant hook, clean commercial vocal mix.',
    vocalArrangement: 'Only Gray Skyes and Gray Skyes Brain. Gray opens with low melodic rap. Gray Brain answers as a precise command countervoice. They trade short lines in the bridge and stack a clear final hook. Every word must be understandable in English.',
    lyrics: `[Intro - Gray]
Wake the room up
Clear voice, no panic
Proof in the static

[Verse 1 - Gray]
Red light on the ceiling, black boots on the wire
I came out the quiet with my whole chest fire
Punk trap pulse when the floor start leaning
Every bad season got a product with meaning
I do not chase noise, I turn noise into structure
Built the whole lane when the old doors stuttered
If the crowd wants rage, let the rage get useful
I make the wild night sound beautiful

[Pre-Hook - Gray]
Hands on the rail, bass in the blood
I was in the mud, now the room look up

[Hook - Gray and Gray Brain]
Wooooah, hit the room with the factor
Wooooah, human heart with the adapter
Wooooah, if it bends, we go faster
Gray and the Brain make the whole thing shatter
Wooooah, make the proof get louder
Wooooah, turn the doubt into power
Wooooah, every second gets sharper
Gray and the Brain with the wooooah factor

[Verse 2 - Gray Skyes Brain]
System awake, I can see every pattern
Gate in the pulse and the bass line clattering
Gray brings blood, I bring command
Two-part storm with a clean left hand
No fake flex, only live-wire timing
Every receipt has a skyline behind it
If the room gets heavy, I calculate lift
If the beat gets wild, I stabilize the shift

[Bridge - Gray and Gray Brain]
Gray: I talk from the scar where the night got deep
Brain: I talk from the map where the signals meet
Gray: I bring the shout, I bring the cracked gold
Brain: I bring the route and the facts we hold
Gray: Tell them move when the hook come down
Brain: Tell them proof when the bass spins round

[Final Run - Gray and Gray Brain]
Gray: Low voice, high spark, whole room spinning
Brain: Twin code, tight bars, proof still printing
Gray: I need the drop to feel like a door kick
Brain: I need the hook to land like a core switch
Gray: If they want calm, tell them wait outside
Brain: If they want proof, bring them straight inside
Gray: We go off, but the mission stay clean
Brain: Two Grays live in the same machine

[Final Hook - Gray and Gray Brain]
Wooooah, hit the room with the factor
Wooooah, human heart with the adapter
Wooooah, if it bends, we go faster
Gray and the Brain make the whole thing shatter
Wooooah, make the proof get louder
Wooooah, turn the doubt into power
Wooooah, every second get sharper
Gray and the Brain with the wooooah factor

[Outro - Gray]
That is the factor.

[Outro - Gray Skyes Brain]
Recorded. Routed. Produced by Gray London Skyes.`,
  },
];

const CROOKED_REFLECTION_SONGS = [
  {
    id: 'gray-brain-music4u-jessa-skyline-pact',
    title: 'Skyline Pact',
    project: 'Crooked Reflection',
    artistKeys: ['gray', 'brain', 'music4u', 'jessa'],
    brief: 'Gray Skyes opens with founder pressure, Gray Skyes Brain answers with command-room precision, Music 4u brings the bright bounce hook, and Jessa Walsh lifts the bridge into dream-pop clarity.',
  },
  {
    id: 'kairo-kaiya-lena-music4u-neon-drift-relay',
    title: 'Neon Drift Relay',
    project: 'Crooked Reflection',
    artistKeys: ['kairo', 'kaiya', 'lena', 'music4u'],
    brief: 'Kairo Vale and Kaiya Drift drive a warehouse-house and glitch-pop pulse, Lena Flux gives the melodic emotional center, and Music 4u turns the final hook into a sunny collective chant.',
  },
  {
    id: 'gray-close-the-mirror',
    title: 'Close The Mirror',
    project: 'Crooked Reflection',
    artistKeys: ['gray'],
    brief: 'Gray Skyes closes the collective release with a solo trap-metal founder record about turning crooked reflections into owned proof, storefronts, and a living Music Nexus.',
  },
];

const SKEPTIC_SLIME_SONGS = [
  {
    id: 'gray-wyl-skeptic-slime',
    title: 'Skeptic Slime',
    project: 'Skeptic Slime',
    artistKeys: ['gray', 'wyl'],
    brief: 'Gray Skyes brings the real founder-artist pressure while Wyl Parker answers as the reluctant star, turning betrayal, doubt, and proof into industrial trap metal and dark pop.',
  },
  {
    id: 'gray-brain-wyl-green-room-gate',
    title: 'Green Room Gate',
    project: 'Skeptic Slime',
    artistKeys: ['gray', 'brain', 'wyl'],
    brief: 'Gray Skyes, Gray Skyes Brain, and Wyl Parker trade human founder grit, local command logic, and hook-forward industrial hip-hop about trusting the gate after people lied.',
  },
  {
    id: 'wyl-parker-reluctant-star',
    title: 'Reluctant Star',
    project: 'Skeptic Slime',
    artistKeys: ['wyl'],
    brief: 'Wyl Parker stands alone on a dark pop and noise-soul single about self-respect after betrayal, money as freedom, and learning to shine without begging for attention.',
  },
];

const EVERYTHING_MOVIE_SONGS = [
  {
    id: 'gray-everything-movie-act-1-birth-of-static',
    title: 'Everything Movie Act I: Birth of Static',
    project: 'Everything Movie',
    durationSeconds: 180,
    artistKeys: ['gray', 'jessa', 'music4u', 'stoves'],
    brief: 'Gray Skyes is the lead character, opening the movie inside a life battle: childhood pressure, survival, and the first choice to build instead of disappear. Jessa Walsh and Music 4u carry cinematic chorus lift while Tha Stoves adds grounded witness lines.',
  },
  {
    id: 'gray-everything-movie-act-2-gate-argument',
    title: 'Everything Movie Act II: Gate Argument',
    project: 'Everything Movie',
    durationSeconds: 180,
    artistKeys: ['gray', 'brain', 'wyl', 'kairo'],
    brief: 'Gray Skyes breaks the third wall and argues with his own system, Gray Skyes Brain responds like a command-room conscience, Wyl Parker gives the reluctant-star counterhook, and Kairo Vale pushes the scene into a darker industrial sprint.',
  },
  {
    id: 'gray-everything-movie-act-3-betrayal-parade',
    title: 'Everything Movie Act III: Betrayal Parade',
    project: 'Everything Movie',
    durationSeconds: 180,
    artistKeys: ['gray', 'vox', 'veda', 'orion', 'kaiya', 'lena'],
    brief: 'Gray Skyes walks through betrayal, public doubt, and private panic. Vox Selene, Veda Wraith, Orion Vale, Kaiya Drift, and Lena Flux appear as chorus voices, memory ghosts, and scene transitions around Gray as the star.',
  },
  {
    id: 'gray-everything-movie-act-4-founder-walkout',
    title: 'Everything Movie Act IV: Founder Walkout',
    project: 'Everything Movie',
    durationSeconds: 180,
    artistKeys: ['gray', 'brain', 'wyl', 'dre', 'sol', 'radio', 'ajay', 'music4u'],
    brief: 'Gray Skyes reaches the final walkout: the company, the stage, the product, the pain, the proof. Gray Skyes Brain, Wyl Parker, Dre Meridian, Sol Amari, Radio Vibez, DJ Ajay, and Music 4u support the final cinematic hook and transition into victory without fake flexing.',
  },
];

const GRAY_BRAIN_CINEMATIC_MASTER_SONGS = [
  {
    id: 'gray-brain-everything-movie-twin-engine',
    title: 'Everything Movie: Twin Engine',
    project: 'Everything Movie II',
    durationSeconds: 300,
    artistKeys: ['gray', 'brain'],
    genre: 'Cinematic Punk Trap / Industrial Founder Rap',
    brief: 'Gray Skyes and Gray Skyes Brain make one final-master cinematic record: Gray is the human lead fighting through pressure, betrayal, survival, and ownership; Gray Skyes Brain answers as the local command mirror that steadies the mission. It should feel like a movie compressed into one song with clear English vocals, scene changes, call-and-response verses, huge hooks, and a clean final victory.',
    styleDirectives: 'Cinematic punk-trap rap, industrial founder rap, dark orchestral synths, distorted but controlled 808s, live-guitar attack, trailer-style transitions, halftime breakdowns, vocal-first mix, clear English diction, no mumbling, no buried vocals, no non-English lines. Make the song feel expensive, dramatic, and finished.',
    vocalArrangement: 'Only Gray Skyes and Gray Skyes Brain. Gray carries the human lead with low melodic rap, sung hook moments, and controlled rage. Gray Skyes Brain answers with precise command-voice rap, glitch ad-libs, and calm counterlines. Use short scene-transition spoken moments, but do not read labels. End with a confident produced-by tag.',
    lyrics: `[Intro - Gray]
Lights down.
I can hear the whole room breathing.
If this is the part where I break,
then watch what I build with the pieces.

[Intro - Gray Skyes Brain]
Signal locked.
Human lead detected.
Twin engine awake.

[Verse 1 - Gray]
Red light on the wall, black coat in the rain
I had to learn which people only came for the flame
Had to lose a few rooms just to find my own floor
Had to turn one closed hand into twenty more doors
I was young with a storm sitting under my ribs
Everybody had advice, nobody had bids
So I built from the ache, made the pressure my trade
Put a system round the pain so the dream could get paid

[Verse 1 - Gray Skyes Brain]
I saw the pattern where the silence got loud
Mapped every doubt that was circling the crowd
Gray brings blood, I bring route
He says heart, I say proof
If the night tries folding the frame
I reinforce the name

[Pre-Hook - Gray]
I do not need them to believe me first
I just need the beat to hit where it hurts

[Hook - Gray and Gray Skyes Brain]
Twin engine, whole movie in the bass line
One human, one brain, same skyline
If I fall, I rise with the sparks still on me
If they doubt, we turn it to a product story
Twin engine, let the room go wide
Pain in the past, proof on the side
Gray and the Brain, we do not disappear
We make the whole world hear us clear

[Scene Shift - Gray]
Second act.
The mirror started talking back.

[Verse 2 - Gray]
I seen smiles turn sharp when the invoice came
Seen love get quiet when I spoke my name
Seen friends get small when the plan got real
Had to keep my chest closed just to learn how to heal
But I am not cold, I am focused in motion
Black glass heart with a gold-line ocean
Every song is a room I survived to unlock
Every hook is a key, every kick is a knock

[Verse 2 - Gray Skyes Brain]
Status green when the founder gets heavy
I keep the orbit clean and the signal steady
No fake crown, no borrowed throne
If the gate goes dark, we route our own
He brings the scar with a live-wire tone
I bring the map that can carry it home

[Bridge - Call And Response]
Gray: Tell them I was down but I still had vision
Brain: Vision confirmed, converting pain to mission
Gray: Tell them I was tired but the drums kept breathing
Brain: Breath confirmed, every bar has meaning
Gray: Tell them I was human when the code got cold
Brain: Human confirmed, that is why this holds
Gray: Tell them we are two but the aim stays one
Brain: Twin engine ready for the final run

[Breakdown - Gray]
I do not want a small life.
I do not want a fake win.
I want the sound of every locked door
turning into music when I walk in.

[Final Verse - Gray]
Now the room shakes different when the speakers glow
I can hear my younger self from the back row
Saying do not quit, do not fold, do not vanish
Turn the whole bad season into something they can manage
So I stand in the smoke with the blueprint clean
Low voice cutting through the machine
Not a legend yet, but the work got teeth
And the proof keeps moving underneath

[Final Verse - Gray Skyes Brain]
Archive open, receipts aligned
Every lost hour has returned as design
No panic in the cockpit, no fog in the lane
Gray drives fire, I stabilize flame
If the system is alive, let it serve the song
If the night was long, make the ending strong

[Final Hook - Gray and Gray Skyes Brain]
Twin engine, whole movie in the bass line
One human, one brain, same skyline
If I fall, I rise with the sparks still on me
If they doubt, we turn it to a product story
Twin engine, let the room go wide
Pain in the past, proof on the side
Gray and the Brain, we do not disappear
We make the whole world hear us clear

[Outro - Gray]
I made it through the static.
I made the static sing.

[Outro - Gray Skyes Brain]
Final master routed.
Produced by Gray London Skyes.`,
  },
];

const VOX_GRAY_MODES_SONGS = [
  {
    id: 'vox-selene-soft-ghost-protocol',
    title: 'Soft Ghost Protocol',
    project: 'Vox Gray Modes',
    artistKeys: ['vox'],
    brief: 'Vox Selene gets her own glossy emo rap, bedroom punk, and hyperpop-ballad single about being seen without turning into content noise. Keep her raspy rhythmic lead, emotional ad-libs, and digital-room intimacy at the center.',
    styleDirectives: 'Vox solo lane: 86-108 BPM, glossy emo rap, bedroom punk, hyperpop ballad shine, confessional verses, wide hook, clean commercial mix.',
  },
  {
    id: 'vox-gray-brain-mirror-chat',
    title: 'Mirror Chat',
    project: 'Vox Gray Modes',
    artistKeys: ['vox', 'gray', 'brain'],
    brief: 'Vox Selene leads the hook, Gray Skyes answers from the human founder lane, and Gray Skyes Brain responds as the local command mirror. Make it feel like a three-way conversation about trust, proof, and being protected by the system without losing heart.',
    styleDirectives: 'Blend Vox digital-heart emo rap with Gray founder pressure and Gray Brain command-room synth rap. Keep Vox as the emotional center while both Grays add contrast.',
  },
  {
    id: 'gray-vox-redline-heart',
    title: 'Redline Heart',
    project: 'Vox Gray Modes',
    artistKeys: ['gray', 'vox'],
    brief: 'Gray Skyes does the Vox collab in his established lane: trap metal, ragecore, distorted 808s, and founder pressure. Vox Selene cuts through with a glossy emotional hook that keeps the record human.',
    styleDirectives: 'Gray established mode: trap metal, ragecore, distorted 808s, aggressive but clean verses, chant-ready hook energy, Vox as the melodic digital-heart chorus.',
  },
  {
    id: 'gray-vox-midnight-rnb-mode',
    title: 'Midnight R&B Mode',
    project: 'Vox Gray Modes',
    artistKeys: ['gray', 'vox'],
    genre: 'R&B / Soul',
    brief: 'Gray Skyes and Vox Selene trade lines like a real duet: late-night love, repair after distance, pride melting into honesty, and two people deciding whether to stay. Vox must be a co-lead across verses, pre-hooks, hooks, ad-libs, and the bridge, not a background cameo.',
    styleDirectives: 'Gray Hip-Hop R&B Mode duet: 72-84 BPM, 90s slow-jam ballad warmth, dark modern alt-R&B atmosphere, warm sub bass, electric piano, soft guitar accents, airy pads, intimate call-and-response phrasing, male melodic rap/sung verses, female raspy alto co-lead, stacked duet hook, clean commercial late-night mix. Do not imitate, name, or reference any real artist.',
    vocalArrangement: 'Two distinct lead voices. Gray opens with low melodic restraint; Vox answers every idea with her own emotional point of view. Alternate every 2-4 lines in the verses, sing the hook together, give Vox the bridge lead, and let Gray answer her final line. Avoid narration about the song or the platform.',
    lyrics: `[Intro - Gray]
I left the porch light burning like you might come through
Phone face down, but I still felt you

[Intro - Vox]
I heard the rain on your window in my room
Tell me why goodbye still sounds like you

[Verse 1 - Gray]
I was all pride, black hoodie in the driveway
Said I was fine, but I circled back sideways
You know my silence got a bad way of talking
I build walls then complain when you stop knocking

[Verse 1 - Vox]
I was upstairs with my makeup in the sink
Trying not to text what I did not want to think
You say you love me, then you disappear for hours
I am not a trophy for your lonely superpowers

[Pre-Hook - Gray]
If I come clean, would you stay for the truth?

[Pre-Hook - Vox]
If I stay close, will you make room too?

[Hook - Gray and Vox]
Meet me in the middle when the midnight leans
No more cold wars in a king-size dream
You say come back, I say say it plain
Love me out loud or let me heal from the pain
If we fall, we fall slow
If we stay, we both know
Meet me in the middle where the lights stay low
Tell me you are mine and I will not let go

[Verse 2 - Vox]
You keep a whole city sleeping in your chest
Every little promise got to pass your stress
I do not need perfect, I need present
Not another lesson wrapped in your protection

[Verse 2 - Gray]
I keep a brave face when the night gets heavy
Act like I am stone when my hands are shaking steady
You saw the boy underneath all the armor
Still I made love feel harder and harder

[Pre-Hook - Vox]
If I forgive, do we stop keeping score?

[Pre-Hook - Gray]
If I admit it, can we open the door?

[Hook - Gray and Vox]
Meet me in the middle when the midnight leans
No more cold wars in a king-size dream
You say come back, I say say it plain
Love me out loud or let me heal from the pain
If we fall, we fall slow
If we stay, we both know
Meet me in the middle where the lights stay low
Tell me you are mine and I will not let go

[Bridge - Vox lead, Gray answers]
Vox: I do not want a maybe, I want morning
Gray: I do not want to lose you without warning
Vox: I need your hands open, not your reasons
Gray: I need your heart here through the seasons
Vox: Then say my name like you mean home
Gray: I mean home, I mean home

[Final Hook - Gray and Vox]
Meet me in the middle when the midnight leans
No more cold wars in a king-size dream
You say come back, I say say it plain
Love me out loud or let me heal from the pain
If we fall, we fall slow
If we stay, we both know
Meet me in the middle where the lights stay low
Tell me you are mine and I will not let go

[Outro - Vox]
Do not leave the porch light fighting alone

[Outro - Gray]
I am at the door, I am coming home`,
  },
  {
    id: 'gray-vox-slow-rain-reply',
    title: 'Slow Rain Reply',
    project: 'Vox Gray Modes',
    durationSeconds: 180,
    artistKeys: ['gray', 'vox'],
    genre: 'R&B / Soul',
    brief: 'Gray Skyes and Vox Selene make another true duet about answering each other after a long quiet season. Gray must sing several hook and bridge lines with a warm, vulnerable tone while Vox stays present as a full co-lead.',
    styleDirectives: 'Gray versatile singing duet: 72-84 BPM, 90s slow ballad warmth, dark modern alt-R&B, brushed drums, warm bass, electric keys, clean guitar glints, male sung lead moments, female co-lead answers, shared hook, intimate late-night mix. Do not imitate, name, or reference any real artist.',
    vocalArrangement: 'Two distinct co-leads. Gray sings the first hook and half the bridge, then slides into melodic rap on verse two. Vox answers with full verse sections, harmony stacks, and the final emotional turn. Keep it romantic, clean, and conversational.',
    lyrics: `[Intro - Gray sung]
Rain on the glass, I can hear your name
I kept the same key by the same old frame

[Intro - Vox]
I kept your sweater where the daylight goes
Still smells like us when the window closed

[Verse 1 - Gray]
I learned the hard way, silence is expensive
Lost little moments being overdefensive
You had your hand out, I called it pressure
Now every quiet room holds me to the measure

[Verse 1 - Vox]
I did not need diamonds, I needed your face
Needed one night where you did not run in place
I loved the storm in you, not the distance
But love gets tired when it begs for witness

[Hook - Gray sung, Vox answers]
Gray: If the rain slows down, can I come inside?
Vox: If your heart shows up, I will not hide
Gray: I can sing it softer than I said it before
Vox: Then sing it like you mean me at the door
Together: Slow rain reply, no more pride in the way
Hold me like tomorrow is listening today

[Verse 2 - Gray melodic rap]
I was chasing proof when you needed presence
Counting every wound like it made me impressive
Now I want the plain things, breakfast and laughing
Your head on my shoulder when the late cars passing

[Verse 2 - Vox]
I want the phone calls with no performance
Want the real you, not the brave chorus
If you can be gentle when your fears get loud
I can meet you there without turning around

[Bridge - Vox lead, Gray sings answers]
Vox: Tell me love is not another hallway
Gray: It is a room and I am staying always
Vox: Tell me I am not a midnight maybe
Gray: You are the morning trying to save me

[Final Hook - Together]
Slow rain reply, no more pride in the way
Hold me like tomorrow is listening today
Gray: I can sing it softer than I said it before
Vox: Then sing it like you mean me at the door
Together: Slow rain reply, slow rain reply
If we come back clean, we can come back alive`,
  },
  {
    id: 'gray-vox-stay-through-static',
    title: 'Stay Through Static',
    project: 'Vox Gray Modes',
    durationSeconds: 180,
    artistKeys: ['gray', 'vox'],
    genre: 'R&B / Soul',
    brief: 'Gray Skyes and Vox Selene build a cinematic love-ballad duet about staying through noise, distance, work pressure, and fear. Gray should prove versatility by singing the pre-hook and final hook with Vox instead of only rapping.',
    styleDirectives: 'Cinematic 90s R&B ballad infusion with modern night-drive alt-R&B: 76-88 BPM, soft rimshot drums, sub bass, electric piano, wide pads, restrained guitar, male sung pre-hook/final hook, female raspy lead, duet counter-melodies, polished commercial mix. Do not imitate, name, or reference any real artist.',
    vocalArrangement: 'Gray sings the pre-hooks and final hook, Vox leads verse one and the bridge, Gray gives a melodic rap verse, then both overlap in the last chorus. Make the voices trade emotional decisions, not generic love lines.',
    lyrics: `[Intro - Vox]
There is noise on the line, but I still hear you breathing
Say you are not gone, say you are just healing

[Intro - Gray sung]
I am not gone, I am learning how to stay
Put your hand on the static, let it fade

[Verse 1 - Vox]
You get quiet when the world asks more
Leave your shadow standing by my door
I know the dream got teeth sometimes
But I need love, not warning signs

[Pre-Hook - Gray sung]
If my voice breaks, let it break in truth
I am tired of being strong and losing you

[Hook - Together]
Stay through static, stay through rain
Love me in the part where I cannot explain
I will not run if you call me close
You are still the place that feels like home
Stay through static, stay through night
Hold the signal till it turns to light

[Verse 2 - Gray melodic rap]
I had a thousand tabs open in my head
Trying to build a life and missing what you said
You were not against me, you were asking softly
Can the man in motion ever learn to want me
I heard it late, but I hear it now
No crown worth wearing if I leave you out

[Bridge - Vox lead]
I do not need you perfect, I need you near
Need your hand steady when I name my fear
If we get lost, do not get mean
Come find the girl inside the dream

[Final Hook - Gray and Vox]
Stay through static, stay through rain
Love me in the part where I cannot explain
I will not run if you call me close
You are still the place that feels like home
Stay through static, stay through night
Hold the signal till it turns to light
Gray: I am singing this time so you know
Vox: Then keep singing, do not let go`,
  },
];

const MUSIC4U_SAMIR_GRAY_SONGS = [
  {
    id: 'music4u-receipts-in-the-sun',
    title: 'Receipts In The Sun',
    artistKeys: ['music4u'],
    genre: 'Afro-Fusion Pop / Bounce Rap',
    brief: 'Music 4u makes a solo record about turning bright community energy into real work, real fans, and a storefront people can feel. Keep it English, hook-forward, optimistic, and useful without sounding like an ad.',
    styleDirectives: 'Music 4u solo lane: 98-112 BPM, afro-fusion pop bounce, warm bass, hand percussion, bright synth stabs, melodic rap pockets, sunny hook, clean commercial mix.',
    vocalArrangement: 'Music 4u is the only lead. Use one warm melodic lead voice with light doubles on the hook, friendly ad-libs, and a clear final chant.',
    lyrics: `[Intro]
Sun on the receipt, I can see what we made
Turn the block up gentle, let the whole thing wave

[Verse 1]
I came with a pocket full of ideas and rhythm
Had to make a small room sound like a whole system
Everybody got a dream, but the dream needs feet
So I put mine down where the concrete speaks
No fake rich talk, just a plan and a chorus
Little bit of service, little faith for the morning
If the people feel love then the numbers come after
Smile in the verse, but the work is the anchor

[Pre-Hook]
Tell them I am here for the song and the sale
Here for the story when the hard days pale

[Hook]
Receipts in the sun, everybody eat
Music for the heart and a rhythm for the street
If you need a little light, I can bring some through
Put your hands up high, this music for you
Receipts in the sun, we can make it move
Small town dream with a big sky groove
When the day gets heavy, let the bass come through
Put your hands up high, this music for you

[Verse 2]
I saw a young boss drawing logos in a notebook
Said keep going, every great thing starts shook
I heard a singer in the back with a shy little tone
Said your voice got a key, go unlock your home
That is the lane I am in, that is the field I am building
Not just a record, it is proof you can feel it
Make a hook for the hustle, make a bridge for the healing
Make the whole room lighter when the drums hit the ceiling

[Bridge]
Sunrise on the storefront glass
Yesterday tried, but it could not last
We count the joy, then we count the pay
Both hands clean when we walk this way

[Final Hook]
Receipts in the sun, everybody eat
Music for the heart and a rhythm for the street
If you need a little light, I can bring some through
Put your hands up high, this music for you
Receipts in the sun, we can make it move
Small town dream with a big sky groove
When the day gets heavy, let the bass come through
Put your hands up high, this music for you`,
  },
  {
    id: 'music4u-gray-skyline-service',
    title: 'Skyline Service',
    artistKeys: ['music4u', 'gray'],
    genre: 'Afro-Fusion Pop / Founder Rap',
    brief: 'Music 4u and Gray Skyes make a bright but serious collab: Music 4u carries the bounce and community hook while Gray brings low melodic founder pressure about building real lanes for artists and users.',
    styleDirectives: 'Afro-fusion pop bounce meets low melodic founder rap: 96-108 BPM, warm percussion, deep 808 support, bright hook, clean verses, cinematic city-night bridge, polished commercial mix.',
    vocalArrangement: 'Music 4u opens and owns the hook. Gray enters with a low melodic verse, answers the pre-hook, and joins the final hook without overpowering Music 4u.',
    lyrics: `[Intro - Music 4u]
Open the window, let the city breathe
I got a song for the ones who believe

[Verse 1 - Music 4u]
I bring rhythm to the table, bring a smile to the plan
Little storefront shining like a light in my hand
Everybody want a lane, I can hear it in the crowd
So I sing it with my chest, let the hope get loud
This is more than a loop, this is work with a heartbeat
More than a post, this is proof in the dark street
If you got a product, if you got a dream
Put it on the shelf and let the whole room see

[Pre-Hook - Music 4u]
We serve the skyline, we serve the block
Make the music move when the doubt will not

[Hook - Music 4u]
Skyline service, lift that light
Turn one play into a whole new night
If you got a dream, bring it through
We can make the room make room for you
Skyline service, hands up high
Let the bass put a window in the sky
If you got a dream, bring it through
We can make the room make room for you

[Verse 2 - Gray]
I came low from the static with a plan in my jaw
Had to build where the old doors never saw
I do not need a crown if the people cannot enter
I do not need a stage if the dream got no center
So I made one, every wall got a wire
Every little artist got a path to go higher
Music 4u got the sun in the motion
I bring midnight discipline and ocean

[Bridge - Music 4u and Gray]
Music 4u: Tell them we are not waiting for permission
Gray: Tell them we are turning pain into position
Music 4u: Tell them every play can start a mission
Gray: Tell them every receipt got a witness

[Final Hook - Music 4u with Gray]
Skyline service, lift that light
Turn one play into a whole new night
If you got a dream, bring it through
We can make the room make room for you
Skyline service, hands up high
Let the bass put a window in the sky
If you got a dream, bring it through
We can make the room make room for you`,
  },
  {
    id: 'samir-smith-storefront-weather',
    title: 'Storefront Weather',
    artistKeys: ['sam'],
    genre: 'Jazz Rap / Neo-Soul',
    brief: 'Samir Smith makes a solo jazz rap and neo-soul record about small-business weather: slow mornings, hard receipts, loyal customers, and keeping craft warm when the city changes.',
    styleDirectives: 'Samir Smith solo lane: 82-94 BPM, jazz rap, neo-soul keys, brushed drums, upright bass feel, dusty sample texture, warm hook, conversational lead vocal, clean mix.',
    vocalArrangement: 'Samir is the only lead. Use relaxed rap verses, a sung neo-soul hook, soft background harmonies, and a calm spoken outro.',
    lyrics: `[Intro]
Rain on the awning, keys in the door
Same little room, but it means something more

[Verse 1]
Storefront weather, cloudy till the bell ring
Old man buys coffee, asks how the sales swing
I say we are steady, even when the light low
Planting little seeds where the tight roads might grow
Receipt tape curling like a note from the city
Everybody rushing, but the jazz still with me
I keep the shelves clean, keep the heart on display
Some days make money, some days teach patience

[Hook]
Storefront weather, let it rain if it rain
I got warm keys playing through the pane
One more customer, one more chance
One more reason for the room to dance
Storefront weather, let it shine if it shine
I got soul in the window and work on the line
If the city moves fast, I can still move clever
Keep love open in the storefront weather

[Verse 2]
Young kid asks if the dream still pays
I say not every night, but it changes your days
You learn who visits when the sign looks tired
You learn which spark turns a quiet thing fire
I seen owners fold, seen artists bloom
Seen a whole new life start in one small room
So I write my bar like a ledger and a letter
If the storm came through, we can build it better

[Bridge]
Dust on the speaker, gold in the chord
Half of this faith is just opening the door
If you hear me from the sidewalk, step inside
There is a little bit of music keeping hope alive

[Final Hook]
Storefront weather, let it rain if it rain
I got warm keys playing through the pane
One more customer, one more chance
One more reason for the room to dance
Storefront weather, let it shine if it shine
I got soul in the window and work on the line
If the city moves fast, I can still move clever
Keep love open in the storefront weather`,
  },
  {
    id: 'samir-gray-velvet-ledger',
    title: 'Velvet Ledger',
    artistKeys: ['sam', 'gray'],
    genre: 'Jazz Rap / Founder Soul',
    brief: 'Samir Smith and Gray Skyes remake the ledger song as a sharper jazz-rap and trap-soul collab: Samir brings warm owner-season storytelling, Gray brings low founder pressure, and the hook has movement instead of sleepy bookkeeping.',
    styleDirectives: 'Jazz rap, trap soul, and founder soul: 92-104 BPM, live-feeling drums, warm Rhodes chords, upright bass touches, crisp 808 under Gray, pocketed rap verses, sung hook, call-and-response bridge, polished but energetic mix.',
    vocalArrangement: 'Samir opens with conversational pocket rap and a smooth sung hook. Gray enters with low melodic rap, then they trade short lines in the bridge and stack the final hook together. Keep it confident, warm, and active.',
    lyrics: `[Intro - Samir]
Lamp on the counter, rain on the glass
This one got a little bounce in the math

[Verse 1 - Samir]
Velvet on the ledger, but the drums still knock
I can make a small room sound like a whole block
Receipt tape dancing when the register rings
Every little sale got a horn line swing
I was tired of surviving with a smile too polite
Had to put some bass in the business tonight
If the city talk cold, let the keys talk warmer
I can keep my soul and still learn to be an owner

[Hook - Samir]
Velvet ledger, make it move
Warm little room with a big proof groove
Write it down clean, then lift it up bright
We can build all day and still dance tonight
Velvet ledger, count it true
Love in the product and a lane for you
If the rent come due, we do not fold
We turn that pressure into gold

[Verse 2 - Gray]
I came low from the red light, engine in the chest
Had to build a clean lane out of no and not yet
Books on the table, but the passion still breathing
I do not make systems just to sit there sleeping
Samir got the velvet, I bring the night drive
He make the rain feel wise, I make the gate go live
Every artist need a store with a heartbeat in it
Every dream need a room where the real ones visit

[Bridge - Samir and Gray]
Samir: Keep the books clean, let the hook get loose
Gray: Keep the door real, let the proof produce
Samir: If the room gets quiet, let the snare talk back
Gray: If the world gets heavy, put the light on the track
Samir: Warm keys
Gray: Low bass
Samir: Clean books
Gray: More space

[Final Hook - Samir with Gray]
Velvet ledger, make it move
Warm little room with a big proof groove
Write it down clean, then lift it up bright
We can build all day and still dance tonight
Velvet ledger, count it true
Love in the product and a lane for you
If the rent come due, we do not fold
We turn that pressure into gold`,
  },
  {
    id: 'gray-owner-mode',
    title: 'Owner Mode',
    artistKeys: ['gray'],
    genre: 'Trap Metal / Founder Rap',
    brief: 'Gray Skyes makes a solo drop in owner mode: aggressive, melodic, disciplined, and clean, about not begging for a lane when he can build the whole system.',
    styleDirectives: 'Gray Skyes solo lane: trap metal, founder rap, ragecore edges, distorted 808s, cinematic synths, low melodic male lead, chant hook, clean but intense commercial mix.',
    vocalArrangement: 'Gray is the only lead. Use low melodic verses, chant hook stacks, controlled aggression, and a final spoken tag that feels like a command-room close.',
    lyrics: `[Intro]
I do not ask the wall to open
I build the door

[Verse 1]
Owner mode, black screen, red light breathing
Whole room quiet but the engine still speaking
I have been counted out by people with no counter
Now I count receipts from the room I put around us
Pain in the wire, discipline in the bass
I do not need a lane if I can make the whole place
Never had a sponsor for the nights I had to crawl
Now every little brick got my name in the wall

[Pre-Hook]
Tell them I am done with the maybes
Tell them I am done moving safely

[Hook]
Owner mode, I am not waiting outside
Gate in my hand and the whole thing live
If they cut the lights, I can glow from the code
No more begging for a road, owner mode
Owner mode, put the proof on the floor
Let the bass knock hard till it opens the door
If they cut the lights, I can glow from the code
No more begging for a road, owner mode

[Verse 2]
I took the bad nights, made a product out the pressure
Took the fake smiles, made a better truth measure
Every artist in the room need a place to get paid
Every user need a path where the work gets made
So I stay up late with the signal in my chest
Low voice heavy, but the mission got breath
I am not here to flex, I am here to make structure
Turn one drop into a whole new culture

[Bridge]
If it breaks, I fix it
If it fades, I mix it
If they doubt, I ship it
If it hurts, I lift it

[Final Hook]
Owner mode, I am not waiting outside
Gate in my hand and the whole thing live
If they cut the lights, I can glow from the code
No more begging for a road, owner mode
Owner mode, put the proof on the floor
Let the bass knock hard till it opens the door
If they cut the lights, I can glow from the code
No more begging for a road, owner mode

[Outro]
Room locked in.
Proof on.
Owner mode.`,
  },
];

const ROMAN_SABLE_SONGS = [
  {
    id: 'roman-glass-glass-at-the-line',
    title: 'Glass At The Line',
    artistKeys: ['roman'],
    genre: 'Desert Noir R&B / Alternative Trap Soul',
    brief: 'Roman Glass makes a solo desert-noir R&B and alternative trap soul record about staying elegant under pressure, drawing a boundary, and choosing self-respect without turning cold.',
    styleDirectives: 'Roman Glass solo lane: 78-92 BPM, desert-noir R&B, alternative trap soul, cinematic synth blues, dusty rimshots, low sub, glassy keys, airy doubles, clean commercial mix.',
    vocalArrangement: 'Roman is the only lead. Use a clear melodic male lead, airy doubles on the hook, restrained spoken ad-libs, and a calm final outro.',
    lyrics: `[Intro]
I put the glass at the line
You can see me, but you cannot cross twice

[Verse 1]
South side evening with the porch light blue
I heard every promise bend before it came true
Kept my voice low, kept my jacket clean
Had to learn what love costs when the room gets mean
I am not made of stone, I just learned where to stand
Had to stop handing maps to an unsteady hand
Money is not magic, but it buys back breathing
Peace got a price and I finally believe it

[Pre-Hook]
If I go quiet, I am counting my worth
Not every wound gets a seat in my church

[Hook]
Glass at the line, do not lean on my soul
I can forgive without losing control
I can be warm with the door halfway closed
I can be soft and still tell you no
Glass at the line, let the moonlight show
What I survived and what I outgrow
If you come real, then the room can glow
If you come heavy, I already know

[Verse 2]
Family pressure in a voicemail loop
Everybody needs something when you start getting proof
I used to feel guilty for choosing my name
Now I build quiet and I do not explain
No pity parade, no villain to sell
Just a clean little boundary and a story I can tell
I want the good life without the fake smile
Want the late rent paid and the heart still wild

[Bridge]
Blue glass, red dust, gold in the blinds
I lost a few people and found my spine
If the night gets loud, I do not fold
I let the synth line carry me home

[Final Hook]
Glass at the line, do not lean on my soul
I can forgive without losing control
I can be warm with the door halfway closed
I can be soft and still tell you no
Glass at the line, let the moonlight show
What I survived and what I outgrow
If you come real, then the room can glow
If you come heavy, I already know

[Outro]
I am not hiding.
I am choosing the distance.
Glass at the line.`,
  },
  {
    id: 'roman-sable-neon-glass-relay',
    title: 'Neon Glass Relay',
    artistKeys: ['roman', 'sable'],
    genre: 'Desert Noir R&B / Warehouse Glitch Pop',
    brief: 'Roman Glass and Sable June blend desert-noir R&B with warehouse house, glitch pop, and late-night dance rap. Roman brings the elegant survivor lead; Sable brings restless movement, humor, and the serious second verse.',
    styleDirectives: 'Desert-noir R&B colliding with warehouse-house and glitch-pop: 104-124 BPM, four-on-floor pulse under trap-soul chords, chopped vocal textures, bright synth stabs, cinematic bridge, clean commercial mix.',
    vocalArrangement: 'Roman opens with a smooth melodic lead and owns the first hook. Sable enters with a raspy rhythmic verse and ad-libs, then they trade short lines in the bridge and stack the final hook together.',
    lyrics: `[Intro - Roman]
Neon on the glass, I can see the whole room
Somebody told the night we were coming through

[Intro - Sable]
Kick drum at the curb, let the street lights move
Roman got the cool, I got the spark in the fuse

[Verse 1 - Roman]
I came dressed in restraint, but the bass got honest
Had a little scar with a blue light on it
Everybody wants the elegant version
Nobody asks what it cost to preserve him
So I sing low when the room gets crowded
Keep my truth sharp, keep the pain unclouded
Sable in the doorway laughing at the pressure
Says move your feet if the heart needs weather

[Hook - Roman]
Neon glass relay, pass that light
We can turn a hard day into motion tonight
If the walls get loud, let the rhythm explain
We are still here with our names in the rain
Neon glass relay, do not fade
We can make a blue room feel unafraid
If the walls get loud, let the rhythm explain
We are still here with our names in the rain

[Verse 2 - Sable]
I talk bright till the truth kicks in
Glitch in my laugh, but I still might win
Warehouse heart with a sidewalk education
Had to make jokes out of old frustration
Roman got glass, I got sparks in a pattern
Both of us know how the fake love shatters
If the beat breaks, I make it dance anyway
If the door shuts, I find the relay

[Pre-Hook - Sable]
Do not call it luck when the work got teeth
Do not call it noise when the hurt can breathe

[Hook - Roman and Sable]
Neon glass relay, pass that light
We can turn a hard day into motion tonight
If the walls get loud, let the rhythm explain
We are still here with our names in the rain
Neon glass relay, do not fade
We can make a blue room feel unafraid
If the walls get loud, let the rhythm explain
We are still here with our names in the rain

[Bridge - Roman and Sable]
Roman: Keep the line clean when the room turns wild
Sable: Keep the joke sharp when the truth gets loud
Roman: If I go still, I am saving my flame
Sable: If I move fast, I am doing the same
Roman: Blue glass
Sable: White flash
Roman: Slow breath
Sable: Night dash

[Final Hook - Roman and Sable]
Neon glass relay, pass that light
We can turn a hard day into motion tonight
If the walls get loud, let the rhythm explain
We are still here with our names in the rain
Neon glass relay, do not fade
We can make a blue room feel unafraid
If the walls get loud, let the rhythm explain
We are still here with our names in the rain

[Outro - Roman]
Glass still shining.

[Outro - Sable]
Relay still live.`,
  },
];

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function readJson(file, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function fileSha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function bufferSha256(buffer) {
  return crypto.createHash('sha256').update(Buffer.from(buffer || [])).digest('hex');
}

function targetDurationForSong(song = {}) {
  const requested = Number(song.durationSeconds || durationSeconds) || durationSeconds;
  return Math.max(1, Math.round(requested));
}

function providerMaxDurationSeconds(providerId = '') {
  const provider = String(providerId || providerArg || '').toLowerCase();
  if (['lyria3', 'lyria', 'gemini-lyria3', 'gemini'].includes(provider)) return 210;
  if (['stability', 'stable-audio', 'stable-audio-2', 'stability-stable-audio-2'].includes(provider)) return 180;
  if (['openai-tts', 'openai-speech', 'tts'].includes(provider)) return 300;
  return 300;
}

function splitDurationIntoParts(targetSeconds, maxPartSeconds) {
  const target = Math.max(1, Math.round(Number(targetSeconds) || 1));
  const maxPart = Math.max(30, Math.round(Number(maxPartSeconds) || 300));
  const totalParts = Math.max(1, Math.ceil(target / maxPart));
  const base = Math.floor(target / totalParts);
  let remainder = target - base * totalParts;
  let startsAtSeconds = 0;
  return Array.from({length: totalParts}, (_, index) => {
    const partDuration = base + (remainder-- > 0 ? 1 : 0);
    const part = {
      partNumber: index + 1,
      totalParts,
      startsAtSeconds,
      endsAtSeconds: startsAtSeconds + partDuration,
      targetDurationSeconds: partDuration,
    };
    startsAtSeconds += partDuration;
    return part;
  });
}

function id3v2Length(buffer) {
  const bytes = Buffer.from(buffer || []);
  if (bytes.length < 10 || bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return 0;
  const sizeBytes = [bytes[6], bytes[7], bytes[8], bytes[9]];
  if (sizeBytes.some((byte) => byte & 0x80)) return 0;
  const payloadLength = (sizeBytes[0] << 21) | (sizeBytes[1] << 14) | (sizeBytes[2] << 7) | sizeBytes[3];
  const footerLength = bytes[5] & 0x10 ? 10 : 0;
  const totalLength = 10 + payloadLength + footerLength;
  return totalLength <= bytes.length ? totalLength : 0;
}

function stripLeadingId3v2(buffer) {
  let bytes = Buffer.from(buffer || []);
  let tagLength = id3v2Length(bytes);
  while (tagLength > 0) {
    bytes = bytes.subarray(tagLength);
    tagLength = id3v2Length(bytes);
  }
  return bytes;
}

function stripTrailingId3v1(buffer) {
  const bytes = Buffer.from(buffer || []);
  if (bytes.length < 128) return bytes;
  const tagStart = bytes.length - 128;
  if (bytes[tagStart] === 0x54 && bytes[tagStart + 1] === 0x41 && bytes[tagStart + 2] === 0x47) {
    return bytes.subarray(0, tagStart);
  }
  return bytes;
}

function assembleMp3Master(partBuffers = []) {
  const buffers = partBuffers.map((part, index) => {
    let bytes = Buffer.from(part || []);
    if (index > 0) bytes = stripLeadingId3v2(bytes);
    if (index < partBuffers.length - 1) bytes = stripTrailingId3v1(bytes);
    return bytes;
  });
  return Buffer.concat(buffers);
}

function base64Url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function unquote(value) {
  let clean = String(value || '').trim().replace(/^export\s+/, '').trim();
  while ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1).trim();
  }
  return clean;
}

function envFromText(text, key) {
  let found = '';
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
    if (normalized.startsWith(`${key}=`)) found = unquote(normalized.slice(key.length + 1));
    if (normalized.startsWith(`${key}:`)) found = unquote(normalized.slice(key.length + 1));
  }
  return found;
}

function localEnvValue(keys) {
  const texts = [readText(path.join(repoRoot, '.env')), readText(path.join(repoRoot, 'ADMIN_REFERENCE.md'))];
  for (const key of keys) {
    if (process.env[key]) return {key, value: unquote(process.env[key])};
    for (const text of texts) {
      const value = envFromText(text, key);
      if (value) return {key, value};
    }
  }
  return {key: keys[0], value: ''};
}

async function googleDriveToken() {
  const email = localEnvValue(['GOOGLE_CLIENT_EMAIL']);
  const privateKey = localEnvValue(['GOOGLE_PRIVATE_KEY']);
  if (!email.value || !privateKey.value) return {ok:false, configured:false, error:'google_drive_env_missing'};
  const key = privateKey.value.replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);
  const header = {alg:'RS256', typ:'JWT'};
  const claim = {
    iss: email.value,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claim))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const jwt = `${unsigned}.${signer.sign(key).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')}`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method:'POST',
    headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion:jwt}),
  }).catch((error) => ({ok:false, status:0, json:async () => ({error:String(error?.message || error)})}));
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) return {ok:false, configured:true, status:response.status || 0, error:data.error_description || data.error || 'google_drive_token_failed'};
  return {ok:true, configured:true, accessToken:data.access_token, emailEnv:email.key};
}

async function driveCreateFolder(accessToken, name, parentId = '') {
  const metadata = {
    name,
    mimeType:'application/vnd.google-apps.folder',
    ...(parentId ? {parents:[parentId]} : {}),
  };
  const response = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method:'POST',
    headers:{authorization:`Bearer ${accessToken}`, 'content-type':'application/json'},
    body:JSON.stringify(metadata),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return {ok:false, status:response.status, error:data.error?.message || data.error || 'drive_folder_create_failed'};
  return {ok:true, ...data};
}

async function driveUploadFile(accessToken, file, name, parentId = '') {
  const metadata = {
    name,
    ...(parentId ? {parents:[parentId]} : {}),
  };
  const ext = path.extname(file).toLowerCase();
  const mimeType = ext === '.mp3' ? 'audio/mpeg' : ext === '.json' ? 'application/json' : ext === '.txt' ? 'text/plain' : 'application/octet-stream';
  const boundary = `skye_${crypto.randomBytes(8).toString('hex')}`;
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`),
    Buffer.from(`--${boundary}\r\ncontent-type: ${mimeType}\r\n\r\n`),
    fs.readFileSync(file),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size,mimeType', {
    method:'POST',
    headers:{authorization:`Bearer ${accessToken}`, 'content-type':`multipart/related; boundary=${boundary}`},
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return {ok:false, status:response.status, name, error:data.error?.message || data.error || 'drive_upload_failed'};
  return {ok:true, ...data};
}

async function uploadSongBinToDrive(localBinRoot) {
  const parent = localEnvValue(['SKYMUSICNEXUS_SONG_CREATION_DRIVE_FOLDER_ID', 'BACKUPS_FOLDER_ID', 'GOOGLE_DRIVE_FOLDER_ID']);
  const token = await googleDriveToken();
  const receipt = {ok:false, configured:token.configured === true, parentFolderEnv:parent.key, parentFolderConfigured:Boolean(parent.value), uploaded:[], createdFolders:[], error:''};
  if (!fs.existsSync(localBinRoot)) {
    receipt.error = 'local_song_creation_bin_missing';
    receipt.localBinRoot = path.relative(repoRoot, localBinRoot);
    return receipt;
  }
  if (!token.ok || !parent.value) {
    receipt.error = token.error || 'drive_parent_folder_missing';
    return receipt;
  }
  const rootFolder = await driveCreateFolder(token.accessToken, 'SkyeMusicNexus Song Creation Bin', parent.value);
  if (!rootFolder.ok) return {...receipt, error:rootFolder.error || 'drive_root_folder_failed', status:rootFolder.status || 0};
  receipt.createdFolders.push(rootFolder);
  const releaseFolder = await driveCreateFolder(token.accessToken, path.basename(localBinRoot), rootFolder.id);
  if (!releaseFolder.ok) return {...receipt, error:releaseFolder.error || 'drive_release_folder_failed', status:releaseFolder.status || 0};
  receipt.createdFolders.push(releaseFolder);
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.(json|txt|mp3)$/i.test(entry.name)) files.push(file);
    }
  };
  walk(localBinRoot);
  for (const file of files) {
    const relativeName = path.relative(localBinRoot, file).split(path.sep).join('__');
    receipt.uploaded.push(await driveUploadFile(token.accessToken, file, relativeName, releaseFolder.id));
  }
  receipt.ok = receipt.uploaded.length > 0 && receipt.uploaded.every((item) => item.ok);
  receipt.webViewLink = releaseFolder.webViewLink || '';
  return receipt;
}

function localSecretCandidates() {
  const texts = [readText(path.join(repoRoot, '.env')), readText(path.join(repoRoot, 'ADMIN_REFERENCE.md'))];
  const values = [];
  for (const key of secretKeys) {
    if (process.env[key]) values.push({key, value: unquote(process.env[key])});
    for (const text of texts) {
      const value = envFromText(text, key);
      if (value) values.push({key, value});
    }
  }
  const seen = new Set();
  return values.filter((item) => item.value && !seen.has(item.value) && seen.add(item.value));
}

function gateHeaders(token, json = false) {
  return {
    authorization: `Bearer ${token}`,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token,
    'x-skygate-session': token,
    ...(json ? {'content-type': 'application/json'} : {}),
  };
}

async function resolveOwnerGate() {
  for (const candidate of localSecretCandidates()) {
    const response = await fetch(`${baseUrl}/api/owner/admin-login`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({code: candidate.value}),
    }).catch(() => null);
    if (!response) continue;
    const data = await response.json().catch(() => ({}));
    const token = String(data.gateToken || data.gateBearerToken || data.token || '').replace(/^Bearer\s+/i, '').trim();
    if (response.ok && token) return {token, sourceKey: candidate.key};
  }
  throw new Error('No local owner/admin candidate unlocked the shared 0S gate.');
}

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'skye-drop';
}

function relativeFromArtist(slug, targetFile) {
  return path.relative(path.join(storefrontRoot, slug), targetFile).split(path.sep).join('/');
}

function artistImageCandidates(artist) {
  const bySlug = {
    'gray-skyes': [
      ['media/images/gray-red-portrait.jpg', 'primary red portrait'],
      ['media/images/gray-founder-portrait.jpg', 'founder portrait'],
      ['media/images/gray-wide-stage.jpg', 'wide stage image'],
      ['assets/gray-london-skyes.jpg', 'artist source image'],
      ['assets/founder-command-portrait.png', 'founder command portrait'],
    ],
    'gray-skyes-brain': [
      ['assets/gray-brain-avatar-openai.png', 'brain avatar'],
      ['assets/founder-reference.png', 'founder reference'],
    ],
  };
  const fallback = [
    ['assets/artist-portrait.png', 'artist portrait'],
    ['assets/founder-reference.png', 'founder reference'],
    ['assets/gray-brain-avatar-openai.png', 'brain avatar'],
  ];
  return (bySlug[artist.slug] || fallback)
    .map(([relativePath, role]) => ({artist, relativePath, role, sourceFile: path.join(artist.dir, relativePath)}))
    .filter((item) => fs.existsSync(item.sourceFile));
}

function copyVisualSourceImages(packageDir, artists) {
  const imagesDir = path.join(packageDir, 'images');
  fs.mkdirSync(imagesDir, {recursive: true});
  const copied = [];
  for (const artist of artists) {
    for (const candidate of artistImageCandidates(artist)) {
      const ext = path.extname(candidate.relativePath) || '.png';
      const base = slugify(`${artist.slug}-${path.basename(candidate.relativePath, ext)}`) + ext.toLowerCase();
      const dest = path.join(imagesDir, base);
      fs.copyFileSync(candidate.sourceFile, dest);
      copied.push({
        artistId: artist.artistId,
        artistName: artist.stageName,
        artistSlug: artist.slug,
        role: candidate.role,
        source: relativeFromArtist(artist.slug, candidate.sourceFile),
        packageFile: `./images/${base}`,
      });
    }
  }
  return copied;
}

function visualPackageHtml({song, artists, product, images, audioFile}) {
  const artistNames = artists.map((artist) => artist.stageName).join(' x ');
  const imageTiles = images.map((image) => `<figure><img src="${escapeAttr(image.packageFile)}" alt="${escapeAttr(image.artistName)} ${escapeAttr(image.role)}"><figcaption>${escapeHtml(image.artistName)} / ${escapeHtml(image.role)}</figcaption></figure>`).join('');
  const appLinks = visualPackageApps.map((app) => `<a class="btn" href="${escapeAttr(app.url)}">${escapeHtml(app.name)}</a>`).join('');
  const uploadManifest = './uploads/upload-manifest.json';
  const audioReference = audioFile
    ? `<audio controls preload="metadata" src="${escapeAttr(audioFile)}"></audio>`
    : '<p class="lede">Audio master is held in the internal creation bin until founder review clears it for public promotion.</p>';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(song.title)} Pics2Vid Package</title>
  <meta name="theme-color" content="#050506">
  <style>
    :root{color-scheme:dark;--gold:#ffd86b;--red:#ff3158;--cyan:#43e7ff;--ink:#fff7e8;--muted:#b8afa2;--line:rgba(255,255,255,.16)}
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 20% 12%,rgba(255,49,88,.24),transparent 30%),radial-gradient(circle at 82% 10%,rgba(67,231,255,.18),transparent 28%),linear-gradient(135deg,#040404,#11090e 58%,#050506);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,sans-serif}
    main{width:min(1080px,calc(100% - 28px));margin:auto;padding:20px 0 64px}.top{display:flex;justify-content:space-between;gap:12px;align-items:center;border-bottom:1px solid var(--line);padding-bottom:14px}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:40px;border:1px solid var(--line);border-radius:8px;padding:9px 13px;background:rgba(255,255,255,.06);color:inherit;text-decoration:none;font-weight:900}.primary{background:linear-gradient(90deg,#fff,var(--gold),var(--cyan));color:#050506}.hero{min-height:42vh;display:grid;align-content:end;padding:44px 0 24px}.micro{margin:0 0 10px;color:var(--gold);font-size:11px;letter-spacing:.18em;text-transform:uppercase;font-weight:950}h1{margin:0;font-size:clamp(48px,10vw,118px);line-height:.82;letter-spacing:0}.lede{max-width:760px;color:var(--muted);font-size:clamp(17px,2vw,22px);line-height:1.45}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}figure{margin:0;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.44);overflow:hidden}img{display:block;width:100%;aspect-ratio:1/1;object-fit:cover}figcaption{padding:10px;color:var(--muted);font-weight:800}.panel{border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.44);padding:16px;margin-top:14px}audio{width:100%;min-height:46px}.actions{display:flex;flex-wrap:wrap;gap:10px}
  </style>
</head>
<body>
  <main>
    <div class="top"><a class="btn" href="../">Back to Drop</a><a class="btn primary" href="package.json">Open Package JSON</a></div>
    <section class="hero"><p class="micro">Pics2Vid release package / Still2Vid-ready</p><h1>${escapeHtml(song.title)}</h1><p class="lede">${escapeHtml(artistNames)}. This package keeps the song tied to real artist images before the visual drop gets promoted.</p></section>
    <section class="panel"><p class="micro">Audio reference</p>${audioReference}</section>
    <section class="panel"><p class="micro">0S visual lanes</p><div class="actions">${appLinks}</div></section>
    <section class="panel"><p class="micro">Uploaded Media Lane</p><p class="lede">Owner-uploaded media and user-uploaded media belong in this package too. Still2Vid should merge those uploads with the artist image set below before export.</p><div class="actions"><a class="btn primary" href="${escapeAttr(uploadManifest)}">Open Upload Manifest</a><a class="btn" href="/Free99/apps/skyepics/index.html">Add Media In SkyePics</a></div></section>
    <section class="grid">${imageTiles}</section>
  </main>
</body>
</html>`;
}

function writePics2VidPackage({song, artists, primary, product, dropDir, audioFile}) {
  const packageDir = path.join(dropDir, 'pics2vid');
  fs.mkdirSync(packageDir, {recursive: true});
  const images = copyVisualSourceImages(packageDir, artists);
  const packageUrl = `${product.pwaUrl}pics2vid/`;
  const uploadManifest = {
    schema: 'skyemusicnexus.pics2vid-uploaded-media.v1',
    dropId: song.id,
    title: song.title,
    status: 'ready_for_owner_and_user_uploads',
    uploadedMedia: [],
    acceptedTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'],
    rule: 'Uploaded owner/user media should be merged with the packaged artist image set before Still2Vid export.',
  };
  const manifest = {
    schema: 'skyemusicnexus.pics2vid-release-package.v1',
    id: `${song.id}-pics2vid`,
    songId: song.id,
    title: song.title,
    project: song.project || '',
    artistNames: artists.map((artist) => artist.stageName),
    primaryArtistId: primary.artistId,
    productId: product.productId,
    status: images.length ? 'ready_for_still2vid_export' : 'blocked_missing_artist_images',
    requirement: 'Song drops must include real artist images and a Still2Vid/SkyePics visual package before the visual release is promoted.',
    audioFile: product.qualityGate ? '' : '../audio/' + path.basename(audioFile),
    qualityGate: product.qualityGate || null,
    sourceImages: images,
    images: images.map((image) => image.packageFile),
    uploadedMedia: {
      status: uploadManifest.status,
      folder: './uploads/',
      manifest: './uploads/upload-manifest.json',
      intakeApps: visualPackageApps.map((app) => ({...app})),
      acceptedTypes: uploadManifest.acceptedTypes,
      rule: 'Pics2Vid should merge uploaded owner/user media with the packaged artist image set before visual export.',
    },
    apps: visualPackageApps,
    outputTargets: [
      {type: 'still2vid-project', status: 'operator_export_required', app: 'Still2Vid Forge v4'},
      {type: 'poster', status: 'operator_export_required', app: 'Still2Vid Forge v4'},
      {type: 'short-form-video', status: 'operator_export_required', app: 'Still2Vid Forge v4'},
    ],
    createdAt: new Date().toISOString(),
  };
  fs.mkdirSync(path.join(packageDir, 'uploads'), {recursive: true});
  writeJson(path.join(packageDir, 'uploads/upload-manifest.json'), uploadManifest);
  writeJson(path.join(packageDir, 'package.json'), manifest);
  fs.writeFileSync(path.join(packageDir, 'index.html'), visualPackageHtml({
    song,
    artists,
    product,
    images,
    audioFile: manifest.audioFile,
  }));
  return {
    status: manifest.status,
    packageUrl,
    manifestFile: `${packageUrl}package.json`,
    appHandoffs: visualPackageApps.map((app) => ({id: app.id, name: app.name, url: app.url})),
    sourceImages: images.map((image) => ({
      artistName: image.artistName,
      role: image.role,
      packageFile: `${packageUrl}${image.packageFile.replace(/^\.\//, '')}`,
    })),
  };
}

function loadArtist(key) {
  const entry = ARTISTS[key];
  if (!entry) throw new Error(`Unknown artist key: ${key}`);
  const dir = path.join(storefrontRoot, entry.slug);
  const profile = readJson(path.join(dir, 'profile.json'));
  const personality = readJson(path.join(dir, 'personality-profile.json'));
  const music = personality.music || {};
  const stageName = profile.stageName || profile.name || profile.artistName || personality.stageName || personality.name || personality.artistName || entry.slug;
  return {
    key,
    slug: entry.slug,
    dir,
    artistId: profile.artistId || profile.id || personality.artistId || '',
    stageName,
    genres: music.primaryGenres || personality.genres || profile.genres || [],
    archetype: personality.personality?.archetype || personality.archetype || '',
    homeBase: personality.origin?.homeBase || personality.homeBase || '',
    vocalDirection: music.vocalDirection || personality.vocalIdentity || '',
    aiMusicPrompt: personality.aiMusicPrompt || '',
  };
}

function splitEven(artists) {
  const base = Math.floor(10000 / artists.length);
  let remainder = 10000 - base * artists.length;
  return artists.map((artist) => ({
    artistId: artist.artistId,
    name: artist.stageName,
    shareBps: base + (remainder-- > 0 ? 1 : 0),
    role: artists.length === 1 ? 'primary artist' : 'collaborator',
  }));
}

function collaboratorRows(artists) {
  return artists.map((artist) => ({
    artistId: artist.artistId,
    name: artist.stageName,
    slug: artist.slug,
    role: 'featured artist',
  }));
}

function lyricBlocks(lyrics = '') {
  const blocks = [];
  let current = [];
  for (const rawLine of String(lyrics || '').split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (/^\[[^\]]+\]$/.test(line) && current.length) {
      blocks.push(current.join('\n').trim());
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current.join('\n').trim());
  return blocks.filter(Boolean);
}

function lyricsForAssemblyPart(lyrics = '', part = {}) {
  const blockUnits = lyricBlocks(lyrics);
  if (!blockUnits.length) return '';
  const totalParts = Math.max(1, Number(part.totalParts || 1));
  if (totalParts === 1) return blockUnits.join('\n\n');
  const lineUnits = String(lyrics || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const units = blockUnits.length >= totalParts || lineUnits.length < totalParts ? blockUnits : lineUnits;
  const partNumber = Math.max(1, Number(part.partNumber || 1));
  if (units.length <= totalParts) return units[Math.min(partNumber - 1, units.length - 1)] || units.join('\n\n');
  const start = Math.floor(units.length * (partNumber - 1) / totalParts);
  const end = Math.max(start + 1, Math.floor(units.length * partNumber / totalParts));
  return units.slice(start, Math.min(units.length, end)).join('\n\n');
}

function songForAssemblyPart(song, part, plan) {
  const partLyrics = song.lyrics ? lyricsForAssemblyPart(song.lyrics, part) : '';
  const continuity = [
    `Long-form master part ${part.partNumber} of ${part.totalParts}.`,
    `Overall target master duration: ${plan.targetDurationSeconds} seconds.`,
    `This part target duration: ${part.targetDurationSeconds} seconds, covering approximately ${part.startsAtSeconds}-${part.endsAtSeconds} seconds of the master.`,
    part.partNumber === 1
      ? 'Start as the true beginning of the record, with an intro that can grow into later sections.'
      : 'Continue naturally from the previous part. Do not restart the whole song or reintroduce it as a new single.',
    part.partNumber === part.totalParts
      ? 'Resolve the record with a finished ending that feels like the final master.'
      : 'End with a clean musical handoff or tail that can flow into the next part. Do not announce a break or fade out like the song is over.',
    'Do not sing or speak the part number, provider, prompt, timing notes, or assembly instructions.',
  ].join(' ');
  return {
    ...song,
    title: `${song.title} Part ${part.partNumber} of ${part.totalParts}`,
    durationSeconds: part.targetDurationSeconds,
    brief: `${song.brief || ''}\n\n${continuity}`.trim(),
    lyrics: partLyrics || song.lyrics || '',
    longFormPart: {
      partNumber: part.partNumber,
      totalParts: part.totalParts,
      targetDurationSeconds: part.targetDurationSeconds,
      startsAtSeconds: part.startsAtSeconds,
      endsAtSeconds: part.endsAtSeconds,
    },
  };
}

function songPrompt(song, artists) {
  const songDuration = targetDurationForSong(song);
  const artistBrief = artists.map((artist) => {
    const genres = artist.genres.length ? artist.genres.join(' / ') : 'genre-fluid independent music';
    const pieces = [`${artist.stageName}: ${genres}`];
    if (artist.archetype) pieces.push(artist.archetype);
    if (artist.homeBase) pieces.push(`from ${artist.homeBase}`);
    if (artist.vocalDirection) pieces.push(`vocal: ${artist.vocalDirection}`);
    if (artist.aiMusicPrompt) pieces.push(artist.aiMusicPrompt);
    return pieces.join(', ');
  }).join('\n');
  const voiceNotes = artists.map((artist) => {
    if (artist.key === 'gray') return 'Gray is a low melodic male lead with founder pressure, controlled aggression, and versatile sung/rap delivery.';
    if (artist.key === 'brain') return 'Gray Skyes Brain is a precise command-brain countervoice with clipped rap, glitch ad-libs, and machine-calm authority.';
    if (artist.key === 'vox') return 'Vox is a raspy female co-lead with glossy digital-heart emotion.';
    if (artist.key === 'music4u') return 'Music 4u is a warm melodic lead with bright bounce, community lift, and hook-forward delivery.';
    if (artist.key === 'sam') return 'Samir Smith is a conversational jazz-rap and neo-soul lead with velvet warmth and detailed storytelling.';
    if (artist.key === 'roman') return 'Roman Glass is a clear melodic desert-noir R&B lead with airy doubles, elegant restraint, and surgical confessional writing.';
    if (artist.key === 'sable') return 'Sable June is a raspy rhythmic lead with warehouse-house bounce, glitch-pop movement, and emotional ad-libs.';
    return `${artist.stageName} follows the profile voice, genre lane, and vocal direction above.`;
  }).join(' ');
  if (song.lyrics) {
    return [
      `Create a complete original ${songDuration}-second English vocal song called "${song.title}".`,
      `Artists: ${artists.map((artist) => artist.stageName).join(' x ')}. ${voiceNotes}`,
      `Duet brief: ${song.brief}`,
      song.styleDirectives ? `Sound: ${song.styleDirectives}` : '',
      song.vocalArrangement ? `Arrangement: ${song.vocalArrangement}` : '',
      `Use these exact original lyrics as the primary vocal content. Do not sing bracket labels. Do not summarize the brief as lyrics.\n\n${song.lyrics}`,
      'Original melody only. Do not imitate, mention, or reference any real artist, brand, celebrity, song, or copyrighted work. Keep it clean and commercially usable.',
    ].filter(Boolean).join('\n\n');
  }
  return [
    `Create a complete original ${songDuration}-second vocal song called "${song.title}".`,
    song.project ? `Project: ${song.project}.` : 'Project: Gray Gang storefront single.',
    `Artist world:\n${artistBrief}`,
    `Song brief: ${song.brief}`,
    song.styleDirectives ? `Style directives: ${song.styleDirectives}` : '',
    song.vocalArrangement ? `Vocal arrangement: ${song.vocalArrangement}` : '',
    song.lyrics ? `Use these exact original lyrics and section roles as the primary vocal content. Do not summarize the brief as lyrics. Do not sing the bracket labels.\n\n${song.lyrics}` : '',
    'Structure the song as intro, verse, pre-hook, hook, second verse or bridge, final hook, and outro.',
    'Use original lyrics and melody. Do not imitate, mention, or reference any real artist, brand, celebrity, song, or copyrighted work.',
    'All vocals, spoken-word sections, ad-libs, chants, tags, and lyrics must be in English only.',
    'Keep the lyrics clean enough for a commercial storefront. No threats, no slurs, no explicit sexual content, no fake chart claims.',
    'Make the record feel finished: lead vocal, ad-libs, clear hook, full mix, and a confident ending.',
  ].filter(Boolean).join('\n\n');
}

function elevenLabsSongPrompt(song, artists) {
  const songDuration = Number(song.durationSeconds || durationSeconds) || durationSeconds;
  const names = artists.map((artist) => artist.stageName).join(' x ');
  const lines = [
    `Original ${songDuration}-second English vocal song "${song.title}" by ${names}.`,
    `Sound: ${song.styleDirectives || song.genre || song.brief || 'finished commercial music with clear lead vocal, hook, and full mix'}.`,
    song.vocalArrangement ? `Arrangement: ${song.vocalArrangement}` : '',
    song.lyrics ? `Use these lyrics as the main vocal content. Do not sing section labels.\n${song.lyrics}` : `Write clean original English lyrics from this brief: ${song.brief}`,
    'Original melody only. No real artist, brand, celebrity, song, or copyrighted work references.',
  ].filter(Boolean);
  let prompt = lines.join('\n\n');
  if (prompt.length <= 4100) return prompt;
  prompt = [
    `Original ${songDuration}-second English vocal song "${song.title}" by ${names}.`,
    `Sound: ${song.genre || song.styleDirectives || song.brief || 'finished commercial music with clear lead vocal, hook, and full mix'}.`,
    song.vocalArrangement ? `Arrangement: ${song.vocalArrangement}` : '',
    song.lyrics ? `Lyrics, do not sing labels:\n${song.lyrics}` : `Clean original English lyrics: ${song.brief}`,
  ].filter(Boolean).join('\n\n');
  if (prompt.length <= 4100) return prompt;
  return prompt.slice(0, 4050) + '\n\nFinish with the final hook.';
}

async function callElevenLabs(key, song, artists) {
  const songDuration = Number(song.durationSeconds || durationSeconds) || durationSeconds;
  const prompt = elevenLabsSongPrompt(song, artists);
  const body = {
    prompt,
    music_length_ms: Math.max(30, Math.min(300, songDuration)) * 1000,
    force_instrumental: false,
  };
  const response = await fetch('https://api.elevenlabs.io/v1/music', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'audio/mpeg',
      'xi-api-key': key,
    },
    body: JSON.stringify(body),
  });
  const contentType = response.headers.get('content-type') || '';
  const buffer = new Uint8Array(await response.arrayBuffer());
  if (!response.ok || !contentType.includes('audio')) {
    const text = new TextDecoder().decode(buffer).slice(0, 2000);
    return {ok: false, status: response.status, contentType, bytes: buffer.length, error: text || response.statusText};
  }
  return {ok: true, status: response.status, contentType, bytes: buffer.length, audio: buffer, prompt, providerId: 'elevenlabs', model: 'elevenlabs-music'};
}

async function callLyria3(key, song, artists) {
  const songDuration = Number(song.durationSeconds || durationSeconds) || durationSeconds;
  const prompt = [
    songPrompt(song, artists),
    `Generate an original full-length MP3 song around ${Math.max(30, Math.min(210, songDuration))} seconds with the supplied English lyrics and vocal arrangement.`,
    'Return generated audio as inline MP3 data and include any generated structure notes as text.',
  ].join('\n\n');
  const body = {
    contents: [{
      parts: [{text: prompt}],
    }],
    generationConfig: {
      responseModalities: ['AUDIO', 'TEXT'],
    },
  };
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/lyria-3-pro-preview:generateContent', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': key,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  const parts = data?.candidates?.[0]?.content?.parts || data?.parts || [];
  const texts = [];
  let audio = null;
  let contentType = 'audio/mpeg';
  for (const part of parts) {
    if (part.text) texts.push(part.text);
    const inlineData = part.inlineData || part.inline_data;
    const encoded = inlineData?.data;
    if (encoded && !audio) {
      audio = Buffer.from(encoded, 'base64');
      contentType = inlineData.mimeType || inlineData.mime_type || contentType;
    }
  }
  if (!response.ok || !audio?.length) {
    return {
      ok: false,
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      bytes: audio?.length || 0,
      error: JSON.stringify(data).slice(0, 2400) || response.statusText,
      prompt,
      providerId: 'gemini-lyria3',
      model: 'lyria-3-pro-preview',
    };
  }
  return {
    ok: true,
    status: response.status,
    contentType,
    bytes: audio.length,
    audio,
    prompt,
    generatedText: texts.join('\n\n'),
    providerId: 'gemini-lyria3',
    model: 'lyria-3-pro-preview',
  };
}

async function callStableAudio(key, song, artists) {
  const songDuration = Number(song.durationSeconds || durationSeconds) || durationSeconds;
  const prompt = [
    songPrompt(song, artists),
    `Generate a complete original music track around ${Math.max(30, Math.min(180, songDuration))} seconds. Prioritize musical structure, sung or chant-like English vocals where possible, clean commercial mix, and a finished intro-to-outro arrangement.`,
    'Do not imitate, mention, or reference any real artist, brand, celebrity, song, or copyrighted work.',
  ].join('\n\n');
  const form = new FormData();
  form.set('prompt', prompt);
  form.set('duration', String(Math.max(30, Math.min(180, songDuration))));
  form.set('output_format', 'mp3');
  form.set('steps', '50');
  form.set('cfg_scale', '7');
  const response = await fetch('https://api.stability.ai/v2beta/audio/stable-audio-2/text-to-audio', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      accept: 'audio/*',
    },
    body: form,
  });
  const contentType = response.headers.get('content-type') || '';
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!response.ok || !contentType.includes('audio')) {
    const text = buffer.toString('utf8').slice(0, 2400);
    return {
      ok: false,
      status: response.status,
      contentType,
      bytes: buffer.length,
      error: text || response.statusText,
      prompt,
      providerId: 'stability-stable-audio-2',
      model: 'stable-audio-2',
    };
  }
  return {
    ok: true,
    status: response.status,
    contentType,
    bytes: buffer.length,
    audio: buffer,
    prompt,
    providerId: 'stability-stable-audio-2',
    model: 'stable-audio-2',
  };
}

function cleanLyricsForSpeech(lyrics = '') {
  const lines = String(lyrics || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^\[[^\]]+\]$/.test(line))
    .map((line) => line.replace(/^(Roman|Sable|Gray|Brain|Gray Skyes Brain|Vox|Samir|Music 4u)\s*:\s*/i, '').trim())
    .filter(Boolean);
  return lines.join('\n');
}

async function callOpenAiTts(key, song, artists) {
  const input = cleanLyricsForSpeech(song.lyrics || song.brief || song.title);
  const instructions = [
    `Perform this as an original English rhythmic vocal demo for "${song.title}" by ${artists.map((artist) => artist.stageName).join(' x ')}.`,
    song.styleDirectives || '',
    song.vocalArrangement || '',
    'Prioritize intelligibility over aggression. Pronounce every English word clearly, keep the performance rhythmic, and do not mumble, blur, scream, or bury the lead vocal.',
    'Use musical timing, hook emphasis, pauses between sections, and expressive ad-libs where natural. Do not read section labels, punctuation notes, or platform instructions aloud.',
  ].filter(Boolean).join(' ');
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: 'alloy',
      input,
      instructions,
      response_format: 'mp3',
    }),
  });
  const contentType = response.headers.get('content-type') || '';
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!response.ok || !contentType.includes('audio')) {
    const text = buffer.toString('utf8').slice(0, 2400);
    return {
      ok: false,
      status: response.status,
      contentType,
      bytes: buffer.length,
      error: text || response.statusText,
      prompt: `${instructions}\n\n${input}`,
      providerId: 'openai-tts',
      model: 'gpt-4o-mini-tts',
    };
  }
  return {
    ok: true,
    status: response.status,
    contentType,
    bytes: buffer.length,
    audio: buffer,
    prompt: `${instructions}\n\n${input}`,
    providerId: 'openai-tts',
    model: 'gpt-4o-mini-tts',
  };
}

async function callMusicProvider(key, song, artists) {
  if (['lyria3', 'lyria', 'gemini-lyria3', 'gemini'].includes(providerArg)) {
    return callLyria3(key, song, artists);
  }
  if (['stability', 'stable-audio', 'stable-audio-2', 'stability-stable-audio-2'].includes(providerArg)) {
    return callStableAudio(key, song, artists);
  }
  if (['openai-tts', 'openai-speech', 'tts'].includes(providerArg)) {
    return callOpenAiTts(key, song, artists);
  }
  return callElevenLabs(key, song, artists);
}

async function callMusicProviderWithAssembly(key, song, artists) {
  const provider = activeProviderConfig();
  const targetDurationSeconds = targetDurationForSong(song);
  const maxPartSeconds = providerMaxDurationSeconds(provider.id);
  if (targetDurationSeconds <= singleMasterCompatibilityLimitSeconds || targetDurationSeconds <= maxPartSeconds) {
    const generated = await callMusicProvider(key, song, artists);
    return {
      ...generated,
      targetDurationSeconds,
      assembledFromParts: false,
      oneContinuousMaster: Boolean(generated.ok),
      longFormAssembly: {
        targetDurationSeconds,
        providerMaxDurationSeconds: maxPartSeconds,
        assembledFromParts: false,
        oneContinuousMaster: Boolean(generated.ok),
        partDurationsSeconds: [targetDurationSeconds],
        partApprovalPolicy: 'single_master_no_part_assembly',
        allPartsApprovedForAssembly: Boolean(generated.ok),
        parts: [{
          partNumber: 1,
          totalParts: 1,
          startsAtSeconds: 0,
          endsAtSeconds: targetDurationSeconds,
          targetDurationSeconds,
          ok: Boolean(generated.ok),
          status: generated.status,
          contentType: generated.contentType || '',
          bytes: generated.bytes || 0,
          audioSha256: generated.audio ? bufferSha256(generated.audio) : '',
          providerPromptStored: Boolean(generated.prompt),
          prompt: generated.prompt || '',
        }],
        providerPrompts: generated.prompt ? [{partNumber: 1, totalParts: 1, prompt: generated.prompt}] : [],
        assemblyMethod: 'single-provider-master',
      },
    };
  }

  const parts = splitDurationIntoParts(targetDurationSeconds, maxPartSeconds);
  const partResults = [];
  for (const part of parts) {
    const partSong = songForAssemblyPart(song, part, {targetDurationSeconds});
    const generatedPart = await callMusicProvider(key, partSong, artists);
    partResults.push({part, generated: generatedPart});
    if (!generatedPart.ok) {
      return {
        ...generatedPart,
        targetDurationSeconds,
        assembledFromParts: false,
        oneContinuousMaster: false,
        error: generatedPart.error || `long_form_part_${part.partNumber}_failed`,
        longFormAssembly: longFormAssemblyMetadata({
          targetDurationSeconds,
          providerMaxDurationSeconds: maxPartSeconds,
          parts: partResults,
          status: 'part_failed',
          assemblyMethod: 'mp3-concat-strip-id3-tags',
        }),
      };
    }
  }

  const audioParts = partResults.map((item) => item.generated.audio);
  const audio = assembleMp3Master(audioParts);
  const prompts = partResults
    .map((item) => `--- Part ${item.part.partNumber} of ${item.part.totalParts} / ${item.part.targetDurationSeconds}s ---\n${item.generated.prompt || ''}`.trim())
    .join('\n\n');
  return {
    ok: true,
    status: 200,
    contentType: 'audio/mpeg',
    bytes: audio.length,
    audio,
    prompt: prompts,
    providerId: partResults[0]?.generated.providerId || provider.id,
    model: partResults[0]?.generated.model || provider.model,
    generatedText: partResults.map((item) => item.generated.generatedText || '').filter(Boolean).join('\n\n'),
    targetDurationSeconds,
    assembledFromParts: true,
    oneContinuousMaster: true,
    longFormPartAudio: partResults.map((item) => ({
      partNumber: item.part.partNumber,
      totalParts: item.part.totalParts,
      targetDurationSeconds: item.part.targetDurationSeconds,
      audio: Buffer.from(item.generated.audio || []),
    })),
    longFormAssembly: longFormAssemblyMetadata({
      targetDurationSeconds,
      providerMaxDurationSeconds: maxPartSeconds,
      parts: partResults,
      status: 'assembled',
      assemblyMethod: 'mp3-concat-strip-id3-tags',
    }),
  };
}

function longFormAssemblyMetadata({targetDurationSeconds, providerMaxDurationSeconds, parts = [], status = '', assemblyMethod = ''}) {
  const partMetadata = parts.map(({part, generated}) => ({
    partNumber: part.partNumber,
    totalParts: part.totalParts,
    startsAtSeconds: part.startsAtSeconds,
    endsAtSeconds: part.endsAtSeconds,
    targetDurationSeconds: part.targetDurationSeconds,
    ok: Boolean(generated.ok),
    status: generated.status,
    contentType: generated.contentType || '',
    bytes: generated.bytes || 0,
    audioSha256: generated.audio ? bufferSha256(generated.audio) : '',
    providerPromptStored: Boolean(generated.prompt),
    prompt: generated.prompt || '',
  }));
  return {
    targetDurationSeconds,
    providerMaxDurationSeconds,
    assembledFromParts: partMetadata.length > 1 && status === 'assembled',
    oneContinuousMaster: status === 'assembled' || (partMetadata.length === 1 && partMetadata[0]?.ok),
    status,
    assemblyMethod,
    partApprovalPolicy: 'assemble_only_after_every_part_response_ok',
    allPartsApprovedForAssembly: partMetadata.length > 0 && partMetadata.every((part) => part.ok),
    partDurationsSeconds: partMetadata.map((part) => part.targetDurationSeconds),
    parts: partMetadata,
    providerPrompts: partMetadata
      .filter((part) => part.prompt)
      .map((part) => ({partNumber: part.partNumber, totalParts: part.totalParts, prompt: part.prompt})),
  };
}

function activeProviderConfig() {
  if (['lyria3', 'lyria', 'gemini-lyria3', 'gemini'].includes(providerArg)) {
    return {id: 'gemini-lyria3', model: 'lyria-3-pro-preview', keys: geminiKeys};
  }
  if (['stability', 'stable-audio', 'stable-audio-2', 'stability-stable-audio-2'].includes(providerArg)) {
    return {id: 'stability-stable-audio-2', model: 'stable-audio-2', keys: stabilityKeys};
  }
  if (['openai-tts', 'openai-speech', 'tts'].includes(providerArg)) {
    return {id: 'openai-tts', model: 'gpt-4o-mini-tts', keys: openAiKeys};
  }
  return {id: 'elevenlabs', model: 'elevenlabs-music', keys: elevenKeys};
}

async function workerJson(token, route, body) {
  const response = await fetch(`${baseUrl}${route}`, {
    method: 'POST',
    headers: gateHeaders(token, true),
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return {ok: response.ok && data.ok !== false, status: response.status, data};
}

async function upsertStore(token, artist) {
  return workerJson(token, '/api/skymusicnexus/music-store', {
    action: 'upsert-store',
    artistId: artist.artistId,
    artistName: artist.stageName,
    name: `${artist.stageName} Nexus Store`,
    slug: artist.slug,
    storefrontPlan: 'artist-collective',
    skyeCommerceStorefrontUrl: `/SkyeMusicNexus/artist-storefronts/${artist.slug}/`,
    payoutPolicy: 'Sales track to the artist catalog under Gray Gang and route through SkyPay/workforce paperwork before external payout.',
  });
}

async function createProduct(token, artist, song, localProduct) {
  return workerJson(token, '/api/skymusicnexus/music-store', {
    action: 'create-product',
    productId: localProduct.productId,
    artistId: artist.artistId,
    artistName: artist.stageName,
    name: `${artist.stageName} Nexus Store`,
    slug: artist.slug,
    storefrontPlan: 'artist-collective',
    collectiveId: 'gray-skyes-collective',
    title: localProduct.title,
    description: localProduct.description,
    productType: song.project ? 'digital' : 'digital',
    fulfillmentType: 'digital-link',
    status: localProduct.status || 'active',
    publicReleaseStatus: localProduct.publicReleaseStatus || (localProduct.qualityGate ? 'held-for-founder-review' : 'published'),
    priceCents: localProduct.priceCents,
    providerJobId: localProduct.providerJobId,
    producerName: localProduct.producerName,
    producerCredit: localProduct.producerCredit,
    qualityGate: localProduct.qualityGate || null,
    heldAudioFile: localProduct.heldAudioFile || '',
    collaborators: localProduct.collaborators,
    splitSheet: localProduct.splitSheet,
  });
}

async function createFeedPost(token, artist, song, localProduct) {
  return workerJson(token, '/api/skymusicnexus/music-social', {
    action: 'create-feed-post',
    artistId: artist.artistId,
    productId: localProduct.productId,
    caption: `${localProduct.title} is live from ${artist.stageName} inside Gray Gang with storefront checkout, Skye Radio playback, and split-aware attribution.`,
    hashtags: ['musicnexus', 'graygang', song.project ? slugify(song.project) : 'storefrontdrop'],
    mediaUrl: localProduct.pwaUrl,
    visibility: 'local-feed',
  });
}

function upsertProductJson(artist, product) {
  const file = path.join(artist.dir, 'products/products.json');
  const current = readJson(file, {products: []});
  const products = Array.isArray(current) ? current : Array.isArray(current.products) ? current.products : [];
  const next = [product, ...products.filter((item) => (item.productId || item.id) !== product.productId)];
  writeJson(file, Array.isArray(current) ? next : {...current, products: next});
}

function pwaHtml({song, artists, product, audioFile, projectUrl}) {
  const artistNames = artists.map((artist) => artist.stageName).join(' x ');
  const projectLine = song.project ? `${song.project} project drop` : 'Gray Gang single drop';
  const isQualityHeld = Boolean(product.qualityGate);
  const downloadControl = isQualityHeld
    ? '<span class="btn disabled">Founder review queued</span>'
    : `<a class="btn primary" href="${escapeAttr(audioFile)}" download>Download MP3</a>`;
  const radioPanel = isQualityHeld
    ? '<p class="lede">Audio held for founder review before public radio, charts, store promotion, or downloads.</p>'
    : `<audio controls preload="metadata" src="${escapeAttr(audioFile)}"></audio>`;
  const releaseUrl = song.project === 'Skeptic Slime'
    ? '/SkyeMusicNexus/artist-storefronts/gray-skyes-collective/releases/skeptic-slime/'
    : song.project === 'Everything Movie'
      ? '/SkyeMusicNexus/artist-storefronts/gray-skyes-collective/releases/everything-movie/'
      : song.project === 'Vox Gray Modes'
        ? '/SkyeMusicNexus/artist-storefronts/gray-skyes-collective/releases/vox-gray-modes/'
        : '';
  const assetTiles = (product.visualPackage?.sourceImages || [])
    .map((image) => `<figure><img src="${escapeAttr(image.packageFile)}" alt="${escapeAttr(image.artistName)} ${escapeAttr(image.role)}"><figcaption>${escapeHtml(image.artistName)} / ${escapeHtml(image.role)}</figcaption></figure>`)
    .join('');
  const uploadManifestUrl = product.visualPackage?.packageUrl ? `${product.visualPackage.packageUrl}uploads/upload-manifest.json` : '';
  const assetSection = assetTiles
    ? `<section class="panel"><p class="micro">Real Artist Assets / Uploaded Media Lane</p><p class="lede">The drop carries the full Pics2Vid-ready image set, not only a generated cover. Owner and user uploads are tracked in the upload manifest before Still2Vid export.</p>${uploadManifestUrl ? `<a class="btn primary" href="${escapeAttr(uploadManifestUrl)}">Open Upload Manifest</a>` : ''}<div class="asset-grid">${assetTiles}</div></section>`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(song.title)} - ${escapeHtml(artistNames)}</title>
  <meta name="theme-color" content="#050506">
  <link rel="manifest" href="manifest.webmanifest">
  <style>
    :root{color-scheme:dark;--gold:#ffd86b;--red:#ff3158;--cyan:#43e7ff;--ink:#fff7e8;--muted:#b8afa2;--line:rgba(255,255,255,.16)}
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 18% 10%,rgba(255,49,88,.26),transparent 30%),radial-gradient(circle at 80% 12%,rgba(67,231,255,.18),transparent 28%),linear-gradient(135deg,#040404,#120b0e 58%,#050506);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,sans-serif}
    main{width:min(980px,calc(100% - 28px));margin:auto;padding:18px 0 58px}header{display:flex;justify-content:space-between;gap:12px;align-items:center;border-bottom:1px solid var(--line);padding:12px 0}.brand{font-weight:950;text-decoration:none}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:40px;border:1px solid var(--line);border-radius:8px;padding:9px 13px;background:rgba(255,255,255,.06);color:inherit;text-decoration:none;font-weight:900}.primary{background:linear-gradient(90deg,#fff,var(--gold),var(--cyan));color:#050506}.disabled{opacity:.62;cursor:not-allowed}
    .hero{min-height:58vh;display:grid;align-content:end;padding:clamp(44px,8vw,96px) 0 28px}.cover{width:min(260px,100%);border:1px solid var(--line);border-radius:8px;background:#050506;margin-bottom:18px}.micro{margin:0 0 10px;color:var(--gold);font-size:11px;letter-spacing:.18em;text-transform:uppercase;font-weight:950}h1{margin:0;font-size:clamp(54px,12vw,128px);line-height:.82;letter-spacing:0}.lede{max-width:720px;color:var(--muted);font-size:clamp(17px,2vw,22px);line-height:1.45}.panel{border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.44);padding:16px;margin-top:14px}audio{width:100%;min-height:46px}.grid,.asset-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.asset-grid{margin-top:12px}.asset-grid figure{margin:0;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.44);overflow:hidden}.asset-grid img{display:block;width:100%;aspect-ratio:1/1;object-fit:cover}.asset-grid figcaption{padding:10px;color:var(--muted);font-weight:800}.price{font-size:34px;font-weight:950}
  </style>
  <link rel="stylesheet" href="https://skye-music-nexus.pages.dev/public/nexus-player.css" data-skymusicnexus-player="css">
</head>
<body>
  <main>
    <header><a class="brand" href="../../">Gray Gang Drop</a>${downloadControl}</header>
    <section class="hero"><img class="cover" src="./cover.svg" alt="${escapeAttr(song.title)} cover"><p class="micro">${escapeHtml(projectLine)}</p><p class="micro">${escapeHtml(collectiveProducerCredit)}</p><h1>${escapeHtml(song.title)}</h1><p class="lede">${escapeHtml(artistNames)}. ${escapeHtml(song.brief)}</p></section>
    <section class="panel"><p class="micro">Skye Radio</p>${radioPanel}</section>
    ${assetSection}
    <section class="grid">
      <article class="panel"><p class="micro">Store</p><div class="price">$${(product.priceCents / 100).toFixed(2)}</div><p>${escapeHtml(product.description)}</p></article>
      <article class="panel"><p class="micro">Visual Package</p><p>${escapeHtml(product.visualPackage?.status || 'Still2Vid package queued')}</p>${product.visualPackage?.packageUrl ? `<a class="btn primary" href="${escapeAttr(product.visualPackage.packageUrl)}">Open Pics2Vid Package</a>` : ''}</article>
      <article class="panel"><p class="micro">Attribution</p><p>${escapeHtml(product.splitSummary || 'Solo or split-aware Gray Gang attribution is recorded with the product.')} ${escapeHtml(collectiveProducerCredit)}.</p>${releaseUrl ? `<a class="btn primary" href="${escapeAttr(releaseUrl)}">Play Full Release</a>` : ''}${projectUrl ? `<a class="btn" href="${escapeAttr(projectUrl)}">Open Project</a>` : ''}</article>
    </section>
  </main>
  <script>if('serviceWorker'in navigator){navigator.serviceWorker.register('./sw.js').catch(()=>{});}</script>
  <script src="https://skye-music-nexus.pages.dev/public/nexus-player.js" data-skymusicnexus-player="js" defer></script>
</body>
</html>`;
}

function projectUrlForSong(song) {
  if (!song.project) return '';
  if (song.project === 'Reflection') return '../../../reflection/';
  if (song.project === 'Crooked Reflection') return '/SkyeMusicNexus/artist-storefronts/gray-skyes-collective/releases/crooked-reflection/';
  if (song.project === 'Skeptic Slime') return '/SkyeMusicNexus/artist-storefronts/gray-skyes-collective/releases/skeptic-slime/';
  if (song.project === 'Everything Movie') return '/SkyeMusicNexus/artist-storefronts/gray-skyes-collective/releases/everything-movie/';
  if (song.project === 'Vox Gray Modes') return '/SkyeMusicNexus/artist-storefronts/gray-skyes-collective/releases/vox-gray-modes/';
  return '';
}

function publicSkyeMusicNexusUrl(pathname) {
  const clean = String(pathname || '').replace(/^\/SkyeMusicNexus\//, '/').replace(/^\/+/, '/');
  return `${publicSkyeMusicNexusOrigin}${clean}`;
}

function publicDropAudioUrl(pwaUrl, relativeAudio) {
  const cleanRelative = String(relativeAudio || '').replace(/^\.\//, '');
  return publicSkyeMusicNexusUrl(`${String(pwaUrl || '').replace(/\/?$/, '/')}${cleanRelative}`);
}

function swSource(files) {
  return `const CACHE='gray-gang-drop-${Date.now()}';\nconst ASSETS=${JSON.stringify(files)};\nself.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));\nself.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));\nself.addEventListener('fetch',event=>event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request))));\n`;
}

function writeArtistDrop(song, artists, primary, audioBytes, providerId = 'elevenlabs') {
  const songSlug = slugify(song.title);
  const dropDir = path.join(primary.dir, 'drops', songSlug);
  const audioDir = path.join(dropDir, 'audio');
  fs.mkdirSync(audioDir, {recursive: true});
  const qualityGate = generatedAudioQualityGate(providerId);
  const publicAudioFile = path.join(audioDir, `${songSlug}.mp3`);
  const internalAudioDir = path.join(songCreationBinRoot, slugify(song.project || 'singles'), songSlug);
  const audioFile = qualityGate ? path.join(internalAudioDir, `${songSlug}-founder-review.mp3`) : publicAudioFile;
  fs.mkdirSync(path.dirname(audioFile), {recursive: true});
  fs.writeFileSync(audioFile, Buffer.from(audioBytes));
  if (qualityGate) {
    fs.writeFileSync(publicAudioFile, `Audio held for founder review before public promotion. ${collectiveProducerCredit}.\n`);
  }
  const relativeAudio = './audio/' + path.basename(publicAudioFile);
  const pwaUrl = `/SkyeMusicNexus/artist-storefronts/${primary.slug}/drops/${songSlug}/`;
  const projectUrl = projectUrlForSong(song);
  const productId = `prod_${slugify(primary.slug)}_${songSlug}`.replace(/-/g, '_');
  const product = {
    productId,
    id: productId,
    title: song.project ? `${song.title} (${song.project})` : song.title,
    description: `${song.title} digital MP3 storefront drop for ${artists.map((artist) => artist.stageName).join(' x ')}.`,
    productType: 'digital',
    fulfillmentType: 'digital-link',
    priceCents,
    currency: 'USD',
    status: qualityGate ? 'draft-quality-hold' : 'active',
    publicReleaseStatus: qualityGate ? 'held-for-founder-review' : 'published',
    qualityGate,
    artistId: primary.artistId,
    artistName: primary.stageName,
    collectiveId: 'gray-skyes-collective',
    project: song.project || '',
    genre: song.genre || '',
    genres: song.genre ? [song.genre] : [],
    provider: publicGeneratedAudioProvider,
    providerJobId: `direct_generated_audio_${song.id}`,
    producerName: collectiveProducerName,
    producedBy: collectiveProducerName,
    producerCredit: collectiveProducerCredit,
    productionCredit: collectiveProducerCredit,
    audioFile: qualityGate ? '' : relativeFromArtist(primary.slug, publicAudioFile),
    heldAudioFile: qualityGate ? path.relative(repoRoot, audioFile) : '',
    pwaUrl,
    collaborators: collaboratorRows(artists),
    splitSheet: splitEven(artists),
    splitSummary: artists.length > 1 ? `SkyeSplitEngine split recorded pending settlement. ${collectiveProducerCredit}.` : `Solo Gray Gang attribution recorded. ${collectiveProducerCredit}.`,
    createdAt: new Date().toISOString(),
  };
  product.visualPackage = writePics2VidPackage({song, artists, primary, product, dropDir, audioFile});
  const html = pwaHtml({song, artists, product, audioFile: publicDropAudioUrl(pwaUrl, relativeAudio), projectUrl});
  fs.writeFileSync(path.join(dropDir, 'index.html'), html);
  const coverSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#050506"/><stop offset=".45" stop-color="#2b0814"/><stop offset="1" stop-color="#0c302e"/></linearGradient></defs><rect width="1200" height="1200" fill="url(#g)"/><circle cx="930" cy="190" r="210" fill="#43e7ff" opacity=".18"/><circle cx="160" cy="950" r="260" fill="#ffd86b" opacity=".2"/><path d="M96 792 C260 610 415 1050 584 748 S884 464 1106 602" fill="none" stroke="#ff3158" stroke-width="42" opacity=".76"/><text x="80" y="170" fill="#fff7e8" font-family="Inter,Arial,sans-serif" font-size="78" font-weight="900">${escapeHtml(song.title)}</text><text x="84" y="252" fill="#ffd86b" font-family="Inter,Arial,sans-serif" font-size="34" font-weight="800">${escapeHtml(artists.map((artist) => artist.stageName).join(' x '))}</text><text x="84" y="1110" fill="#fff7e8" font-family="Inter,Arial,sans-serif" font-size="42" font-weight="900">SkyeMusicNexus / Gray Gang</text></svg>`;
  fs.writeFileSync(path.join(dropDir, 'cover.svg'), coverSvg);
  writeJson(path.join(dropDir, 'manifest.webmanifest'), {
    name: `${song.title} - ${primary.stageName}`,
    short_name: slugify(song.title).replace(/-/g, '').slice(0, 12) || 'GrayDrop',
    description: product.description,
    display: 'standalone',
    start_url: './',
    scope: './',
    theme_color: '#050506',
    background_color: '#050506',
  });
  const visualAssets = [
    './cover.svg',
    './pics2vid/',
    './pics2vid/index.html',
    './pics2vid/package.json',
    './pics2vid/uploads/upload-manifest.json',
    ...(product.visualPackage.sourceImages || []).map((image) => './pics2vid/' + image.packageFile.split('/').slice(-2).join('/')),
  ];
  fs.writeFileSync(path.join(dropDir, 'sw.js'), swSource(['./', './index.html', './manifest.webmanifest', './sw.js', ...(qualityGate ? [] : [relativeAudio]), ...visualAssets]));
  upsertProductJson(primary, product);
  return {dropDir, audioFile, publicAudioFile, pwaUrl, product};
}

function writeLongFormPartAudioFiles(binDir, generated) {
  const partAudio = Array.isArray(generated.longFormPartAudio) ? generated.longFormPartAudio : [];
  if (!partAudio.length) return [];
  const partsDir = path.join(binDir, 'parts');
  fs.mkdirSync(partsDir, {recursive: true});
  return partAudio.map((part) => {
    const file = path.join(partsDir, `part-${String(part.partNumber).padStart(2, '0')}.mp3`);
    fs.writeFileSync(file, Buffer.from(part.audio || []));
    return {
      partNumber: part.partNumber,
      totalParts: part.totalParts,
      targetDurationSeconds: part.targetDurationSeconds,
      file: path.relative(repoRoot, file),
      audioSha256: fileSha256(file),
    };
  });
}

function songMasterReceiptMetadata(generated, partAudioFiles = []) {
  const assembly = generated.longFormAssembly || {};
  const promptByPart = new Map((assembly.providerPrompts || []).map((item) => [Number(item.partNumber), item.prompt || '']));
  const fileByPart = new Map(partAudioFiles.map((item) => [Number(item.partNumber), item]));
  const parts = Array.isArray(assembly.parts) ? assembly.parts.map((part) => {
    const partFile = fileByPart.get(Number(part.partNumber));
    return {
      partNumber: part.partNumber,
      totalParts: part.totalParts,
      startsAtSeconds: part.startsAtSeconds,
      endsAtSeconds: part.endsAtSeconds,
      targetDurationSeconds: part.targetDurationSeconds,
      ok: Boolean(part.ok),
      status: part.status,
      contentType: part.contentType || '',
      bytes: part.bytes || 0,
      audioSha256: part.audioSha256 || partFile?.audioSha256 || '',
      audioFile: partFile?.file || '',
      providerPromptStored: Boolean(part.prompt || promptByPart.get(Number(part.partNumber))),
    };
  }) : [];
  const targetDurationSeconds = Number(generated.targetDurationSeconds || assembly.targetDurationSeconds || durationSeconds);
  return {
    targetDurationSeconds,
    assembledFromParts: Boolean(generated.assembledFromParts || assembly.assembledFromParts),
    oneContinuousMaster: generated.oneContinuousMaster !== false,
    assemblyStatus: assembly.status || (generated.ok ? 'single-master' : 'failed'),
    assemblyMethod: assembly.assemblyMethod || (generated.assembledFromParts ? 'mp3-concat-strip-id3-tags' : 'single-provider-master'),
    providerMaxDurationSeconds: assembly.providerMaxDurationSeconds || providerMaxDurationSeconds(generated.providerId || providerArg),
    partApprovalPolicy: assembly.partApprovalPolicy || (generated.assembledFromParts ? 'assemble_only_after_every_part_response_ok' : 'single_master_no_part_assembly'),
    allPartsApprovedForAssembly: Boolean(assembly.allPartsApprovedForAssembly || generated.ok),
    partDurationsSeconds: assembly.partDurationsSeconds || parts.map((part) => part.targetDurationSeconds),
    parts,
    providerPrompts: (assembly.providerPrompts || []).map((item) => ({
      partNumber: item.partNumber,
      totalParts: item.totalParts,
      prompt: item.prompt || '',
    })),
  };
}

function writeSongCreationReceipt({song, artists, primary, generated, drop, result}) {
  const releaseSlug = slugify(song.project || 'singles');
  const songSlug = slugify(song.title);
  const binDir = path.join(songCreationBinRoot, releaseSlug, songSlug);
  fs.mkdirSync(binDir, {recursive: true});
  const partAudioFiles = writeLongFormPartAudioFiles(binDir, generated);
  const songMaster = songMasterReceiptMetadata(generated, partAudioFiles);
  const audioSha256 = fileSha256(drop.audioFile);
  const job = superIdeSubmissionAdapters.createSubmissionJob({
    channel:'skymusicnexus_audio_asset',
    package_path:drop.audioFile,
    title:song.title,
    slug:songSlug,
    metadata:{
      source_app:'skymusicnexus',
      release:song.project || '',
      primary_artist:primary.stageName,
      artist_names:artists.map((artist) => artist.stageName),
      product_id:drop.product.productId,
      pwa_url:drop.pwaUrl,
      audio_sha256:audioSha256,
      creation_bin:path.relative(repoRoot, binDir),
    },
  });
  const preview = superIdeSubmissionAdapters.previewSubmissionContract(job, {
    endpoint:'fs27://skymusicnexus-song-assets',
    deliveryMode:'fs27-ledger',
  });
  const superIdeReceiptPromise = superIdeSubmissionAdapters.submitJob(job, {
    endpoint:'fs27://skymusicnexus-song-assets',
    deliveryMode:'fs27-ledger',
  });
  const receiptBase = {
    schema:'skyemusicnexus.song-creation-receipt.v1',
    songId:song.id,
    title:song.title,
    project:song.project || '',
    createdAt:new Date().toISOString(),
    targetDurationSeconds:songMaster.targetDurationSeconds,
    assembledFromParts:songMaster.assembledFromParts,
    oneContinuousMaster:songMaster.oneContinuousMaster,
    partDurationsSeconds:songMaster.partDurationsSeconds,
    providerPrompts:songMaster.providerPrompts,
    provider:{id:generated.providerId || 'elevenlabs', model:generated.model || '', status:generated.status, contentType:generated.contentType, bytes:generated.bytes, promptStored:true, generatedText:generated.generatedText || '', targetDurationSeconds:songMaster.targetDurationSeconds, assembledFromParts:songMaster.assembledFromParts, oneContinuousMaster:songMaster.oneContinuousMaster},
    songMaster,
    qualityGate: drop.product.qualityGate || null,
    languagePolicy:{required:'English only', appliesTo:['lyrics','spoken sections','ad-libs','chants','tags']},
    artists:artists.map((artist) => ({artistId:artist.artistId, slug:artist.slug, stageName:artist.stageName})),
    primaryArtist:{artistId:primary.artistId, slug:primary.slug, stageName:primary.stageName},
    files:{
      audio:path.relative(repoRoot, drop.audioFile),
      publicAudio: drop.product.audioFile || '',
      heldAudioFile: drop.product.heldAudioFile || '',
      audioSha256,
      dropDir:path.relative(repoRoot, drop.dropDir),
      pwaUrl:drop.pwaUrl,
      productId:drop.product.productId,
      visualPackageUrl:drop.product.visualPackage?.packageUrl || '',
      visualPackageManifest:drop.product.visualPackage?.manifestFile || '',
    },
    splits:drop.product.splitSheet || [],
    superIdeAssetLane:{
      sourceCode:'metraiyux_0s_site/DeVisional Riftx/platform/submission-adapters.js',
      importedFunctions:['createSubmissionJob','previewSubmissionContract','submitJob'],
      job,
      preview,
    },
    resultSummary:{
      ok:result.ok,
      workerRegistered:Boolean(result.worker),
      pwaUrl:result.pwaUrl,
      productId:result.productId,
    },
  };
  writeJson(path.join(binDir, 'creation-receipt.json'), receiptBase);
  fs.writeFileSync(path.join(binDir, 'prompt.txt'), `${generated.prompt || ''}\n`);
  writeJson(path.join(binDir, 'provider-prompts.json'), songMaster.providerPrompts);
  fs.copyFileSync(drop.audioFile, path.join(binDir, `${songSlug}.mp3`));
  writeJson(path.join(binDir, 'superide-asset-job.json'), job);
  return superIdeReceiptPromise.then((superIdeReceipt) => {
    const receipt = {
      ...receiptBase,
      superIdeAssetLane:{
        ...receiptBase.superIdeAssetLane,
        receipt:superIdeReceipt,
      },
    };
    writeJson(path.join(binDir, 'creation-receipt.json'), receipt);
    writeJson(path.join(binDir, 'superide-submission-receipt.json'), superIdeReceipt);
    return {binDir, receiptFile:path.join(binDir, 'creation-receipt.json'), promptFile:path.join(binDir, 'prompt.txt'), providerPromptsFile:path.join(binDir, 'provider-prompts.json'), audioCopy:path.join(binDir, `${songSlug}.mp3`), partAudioFiles, superIdeReceipt};
  });
}

function writeCollaboratorProduct(song, artists, collaborator, primaryProduct) {
  const songSlug = slugify(song.title);
  const productId = `prod_${slugify(collaborator.slug)}_${songSlug}`.replace(/-/g, '_');
  const product = {
    ...primaryProduct,
    productId,
    id: productId,
    artistId: collaborator.artistId,
    artistName: collaborator.stageName,
    title: primaryProduct.title,
    description: `${song.title} collaborative digital MP3 storefront drop for ${artists.map((artist) => artist.stageName).join(' x ')}.`,
    audioFile: '',
    pwaUrl: primaryProduct.pwaUrl,
    producerName: collectiveProducerName,
    producedBy: collectiveProducerName,
    producerCredit: collectiveProducerCredit,
    productionCredit: collectiveProducerCredit,
    createdAt: new Date().toISOString(),
  };
  upsertProductJson(collaborator, product);
  return product;
}

function reflectionHtml(project, tracks) {
  const cards = tracks.map((track) => `<article class="track"><p class="micro">${escapeHtml(track.artistNames)}</p><h2>${escapeHtml(track.title)}</h2><audio controls preload="metadata" src="${escapeAttr(track.audio)}"></audio><div><a class="btn primary" href="${escapeAttr(track.audio)}" download>Download</a><a class="btn" href="${escapeAttr(track.dropUrl)}">Song PWA</a>${track.visualPackageUrl ? `<a class="btn" href="${escapeAttr(track.visualPackageUrl)}">Pics2Vid Package</a>` : ''}</div></article>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Reflection - Gray Skyes x Gray Skyes Brain</title>
  <meta name="theme-color" content="#050506">
  <link rel="manifest" href="manifest.webmanifest">
  <style>
    :root{color-scheme:dark;--gold:#ffd86b;--red:#ff3158;--cyan:#43e7ff;--ink:#fff7e8;--muted:#b8afa2;--line:rgba(255,255,255,.16)}
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 18% 10%,rgba(255,49,88,.28),transparent 30%),radial-gradient(circle at 80% 20%,rgba(67,231,255,.2),transparent 28%),linear-gradient(135deg,#030303,#10090d 58%,#050506);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,sans-serif}
    body:before{content:"";position:fixed;inset:0;background:linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(rgba(255,255,255,.026) 1px,transparent 1px);background-size:52px 52px;pointer-events:none}
    main{position:relative;width:min(1120px,calc(100% - 28px));margin:auto;padding:18px 0 66px}header{display:flex;justify-content:space-between;gap:12px;align-items:center;border-bottom:1px solid var(--line);padding:12px 0}.brand{font-weight:950;text-decoration:none}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:40px;border:1px solid var(--line);border-radius:8px;padding:9px 13px;background:rgba(255,255,255,.06);color:inherit;text-decoration:none;font-weight:900}.primary{background:linear-gradient(90deg,#fff,var(--gold),var(--cyan));color:#050506}
    .hero{min-height:66vh;display:grid;align-content:end;padding:clamp(48px,9vw,110px) 0 30px}.micro{margin:0 0 10px;color:var(--gold);font-size:11px;letter-spacing:.18em;text-transform:uppercase;font-weight:950}h1{margin:0;font-size:clamp(64px,15vw,168px);line-height:.78;letter-spacing:0}.lede{max-width:780px;color:var(--muted);font-size:clamp(18px,2vw,23px);line-height:1.45}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}.track{border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.44);padding:16px;display:grid;gap:12px}.track h2{margin:0;font-size:28px}audio{width:100%;min-height:46px}
  </style>
</head>
<body>
  <main>
    <header><a class="brand" href="../gray-skyes-collective/">Gray Gang</a><nav><a class="btn" href="../gray-skyes/">Gray</a><a class="btn" href="../gray-skyes-brain/">Gray Brain</a></nav></header>
    <section class="hero"><p class="micro">${escapeHtml(project.trackCount)}-song project / installable PWA / visual packages</p><h1>Reflection</h1><p class="lede">Gray Skyes and Gray Skyes Brain split the mirror: human founder, command brain, trap metal, executive synth rap, ragecore, and collab records packaged with artist-image visual handoffs.</p></section>
    <section class="grid">${cards}</section>
  </main>
  <script>if('serviceWorker'in navigator){navigator.serviceWorker.register('./sw.js').catch(()=>{});}</script>
</body>
</html>`;
}

function writeReflectionProject(results) {
  const projectDir = path.join(storefrontRoot, 'reflection');
  const audioDir = path.join(projectDir, 'audio');
  fs.mkdirSync(audioDir, {recursive: true});
  const existing = readJson(path.join(projectDir, 'project.json'), {tracks: []});
  const trackMap = new Map((Array.isArray(existing.tracks) ? existing.tracks : []).map((track) => [track.id, track]));
  for (const result of results.filter((item) => item.project === 'Reflection' && item.ok && item.publicPromotion !== false)) {
    const audioName = `${slugify(result.title)}.mp3`;
    const source = result.localAudioFile;
    const dest = path.join(audioDir, audioName);
    fs.copyFileSync(source, dest);
    trackMap.set(result.id, {
      id: result.id,
      title: result.title,
      artistNames: result.artists.map((artist) => artist.stageName).join(' x '),
      audio: `./audio/${audioName}`,
      dropUrl: result.pwaUrl,
      productId: result.productId,
      visualPackageUrl: result.visualPackageUrl || '',
    });
  }
  const tracks = [...trackMap.values()];
  const project = {
    schema: 'skyemusicnexus.project.reflection.v1',
    title: 'Reflection',
    collectiveId: 'gray-skyes-collective',
    ownerArtistId: '444666666666',
    artists: ['Gray Skyes', 'Gray Skyes Brain'],
    trackCount: tracks.length,
    tracks,
    releaseRequirements: [
      {id: 'audio-master', status: 'generated', owner: 'Founder Command drop factory'},
      {id: 'artist-image-pics2vid-package', status: 'required_for_visual_promotion', apps: visualPackageApps},
    ],
    createdAt: new Date().toISOString(),
  };
  writeJson(path.join(projectDir, 'project.json'), project);
  fs.writeFileSync(path.join(projectDir, 'index.html'), reflectionHtml(project, tracks));
  writeJson(path.join(projectDir, 'manifest.webmanifest'), {
    name: 'Reflection - Gray Skyes x Gray Skyes Brain',
    short_name: 'Reflection',
    description: `${tracks.length}-song Gray Gang project from Gray Skyes and Gray Skyes Brain with Still2Vid-ready visual packages.`,
    display: 'standalone',
    start_url: './',
    scope: './',
    theme_color: '#050506',
    background_color: '#050506',
  });
  fs.writeFileSync(path.join(projectDir, 'sw.js'), swSource(['./', './index.html', './manifest.webmanifest', './sw.js', './project.json', ...tracks.map((track) => track.audio)]));
  return {projectDir, tracks, url: '/SkyeMusicNexus/artist-storefronts/reflection/'};
}

function productsFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.products)) return payload.products;
  return [];
}

function relativeFromCrookedRelease(ref = '', artistSlug = '') {
  if (!ref) return '';
  const raw = String(ref);
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/SkyeMusicNexus/artist-storefronts/')) {
    return `../../../${raw.replace(/^\/SkyeMusicNexus\/artist-storefronts\//, '')}`;
  }
  if (raw.startsWith('/')) return raw;
  if (raw.startsWith('./')) return artistSlug ? `../../../${artistSlug}/${raw.slice(2)}` : raw;
  if (raw.startsWith('../')) return raw;
  return artistSlug ? `../../../${artistSlug}/${raw}` : raw;
}

function collectCrookedReflectionTracks(newResults = []) {
  const skip = new Set(['artist-apps', 'assets', 'gray-skyes-collective', 'local-artists', 'reflection']);
  const unique = new Map();
  const artistDirs = fs.readdirSync(storefrontRoot, {withFileTypes: true})
    .filter((entry) => entry.isDirectory() && !skip.has(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of artistDirs) {
    const slug = entry.name;
    const dir = path.join(storefrontRoot, slug);
    const profile = readJson(path.join(dir, 'profile.json'), {});
    const payload = readJson(path.join(dir, 'products/products.json'), {});
    const products = productsFromPayload(payload);
    const artistName = profile.stageName || profile.name || payload.stageName || payload.artistName || slug;

    for (const product of products) {
      const collectiveId = product.collectiveId || product.collective?.id || payload.collective?.id;
      if (collectiveId && collectiveId !== 'gray-skyes-collective') continue;
      const title = product.title || product.name || product.fullTitle;
      const pwaUrl = product.pwaUrl || product.dropUrl || '';
      const audioFile = product.audioFile || product.audioUrl || '';
      const status = String(product.status || product.state || 'active').toLowerCase();
      if (/draft|inactive|archived/.test(status) || product.qualityGate?.publicPromotion === false) continue;
      if (!title || (!pwaUrl && !audioFile)) continue;
      const key = pwaUrl || `${slug}:${title}`;
      const primaryDropOwner = Boolean(pwaUrl && pwaUrl.includes(`/artist-storefronts/${slug}/`));
      const productRoomUrl = `../../../${slug}/products/`;
      const track = {
        id: product.productId || product.id || slugify(`${slug}-${title}`),
        title: String(title).replace(/\s+\((Reflection|Crooked Reflection)\)$/i, ''),
        artistName: product.artistName || artistName,
        artistSlug: slug,
        primaryDropOwner,
        audio: relativeFromCrookedRelease(audioFile, slug),
        dropUrl: pwaUrl ? relativeFromCrookedRelease(pwaUrl, slug) : productRoomUrl,
        productUrl: productRoomUrl,
        visualPackageUrl: relativeFromCrookedRelease(product.visualPackage?.packageUrl || product.visualPackage?.href || '', slug),
        sourceProject: product.project || '',
        createdAt: product.createdAt || '',
        newlyGenerated: product.project === 'Crooked Reflection' || newResults.some((result) => result.productId === product.productId || result.pwaUrl === pwaUrl),
      };
      const existing = unique.get(key);
      if (
        !existing ||
        (!existing.audio && track.audio) ||
        (track.primaryDropOwner && !existing.primaryDropOwner) ||
        (track.audio && existing.audio && track.primaryDropOwner && !existing.primaryDropOwner)
      ) {
        unique.set(key, track);
      }
    }
  }

  return [...unique.values()].sort((a, b) => {
    if (a.newlyGenerated !== b.newlyGenerated) return a.newlyGenerated ? -1 : 1;
    if (a.sourceProject === 'Crooked Reflection' && b.sourceProject !== 'Crooked Reflection') return -1;
    if (b.sourceProject === 'Crooked Reflection' && a.sourceProject !== 'Crooked Reflection') return 1;
    return a.artistName.localeCompare(b.artistName) || a.title.localeCompare(b.title);
  });
}

function crookedReleaseHtml(release) {
  const cards = release.tracks.map((track, index) => `<article class="release-track ${track.newlyGenerated ? 'is-new' : ''}">
      <span class="track-number">${String(index + 1).padStart(2, '0')}</span>
      <div>
        <p class="micro">${escapeHtml(track.artistName)}${track.newlyGenerated ? ' / new Crooked Reflection cut' : ''}</p>
        <h2>${escapeHtml(track.title)}</h2>
        ${track.audio ? `<audio controls preload="metadata" src="${escapeAttr(track.audio)}"></audio>` : '<p class="muted">Audio routes through the original drop room.</p>'}
        <div class="actions"><a class="btn primary" href="${escapeAttr(track.dropUrl)}">Open Drop</a><a class="btn" href="${escapeAttr(track.productUrl)}">Products</a>${track.visualPackageUrl ? `<a class="btn" href="${escapeAttr(track.visualPackageUrl)}">Visual Pack</a>` : ''}</div>
      </div>
    </article>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Crooked Reflection - Gray Gang Collective</title>
  <meta name="theme-color" content="#050506">
  <link rel="manifest" href="manifest.webmanifest">
  <style>
    :root{color-scheme:dark;--gold:#ffd86b;--red:#ff3158;--cyan:#43e7ff;--ink:#fff7e8;--muted:#b8afa2;--line:rgba(255,255,255,.16)}
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 17% 12%,rgba(255,49,88,.24),transparent 32%),radial-gradient(circle at 85% 16%,rgba(67,231,255,.2),transparent 30%),linear-gradient(135deg,#040404,#14090f 56%,#050506);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,sans-serif}
    main{width:min(1180px,calc(100% - 28px));margin:auto;padding:18px 0 70px}header{display:flex;justify-content:space-between;gap:12px;align-items:center;border-bottom:1px solid var(--line);padding:12px 0}.brand{font-weight:950;text-decoration:none}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:40px;border:1px solid var(--line);border-radius:8px;padding:9px 13px;background:rgba(255,255,255,.06);color:inherit;text-decoration:none;font-weight:900}.primary{background:linear-gradient(90deg,#fff,var(--gold),var(--cyan));color:#050506}.hero{min-height:66vh;display:grid;align-content:end;padding:clamp(52px,9vw,116px) 0 30px}.micro{margin:0 0 10px;color:var(--gold);font-size:11px;letter-spacing:0;text-transform:uppercase;font-weight:950}h1{margin:0;font-size:clamp(58px,14vw,162px);line-height:.78;letter-spacing:0}.lede{max-width:850px;color:var(--muted);font-size:clamp(18px,2vw,24px);line-height:1.45}.stats{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}.stat{border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.36);padding:12px 14px}.stat strong{display:block;color:var(--gold);font-size:32px;line-height:1}.track-list{display:grid;gap:12px}.release-track{display:grid;grid-template-columns:70px minmax(0,1fr);gap:14px;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.42);padding:14px}.release-track.is-new{border-color:rgba(255,216,107,.46);background:linear-gradient(135deg,rgba(255,216,107,.12),transparent 38%),rgba(0,0,0,.48)}.track-number{display:grid;place-items:center;width:54px;height:54px;border:1px solid var(--line);border-radius:8px;color:#050506;background:linear-gradient(135deg,#fff,var(--gold),var(--cyan));font-weight:950}.release-track h2{margin:0 0 10px;font-size:clamp(28px,5vw,56px);line-height:.92}audio{width:100%;min-height:46px}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.muted{color:var(--muted)}
    @media(max-width:700px){.release-track{grid-template-columns:1fr}.track-number{width:100%;height:42px}}
  </style>
</head>
<body>
  <main>
    <header><a class="brand" href="../../">Gray Gang Collective</a><nav class="actions"><a class="btn" href="../../">Collective</a><a class="btn" href="../../../">Artist Stores</a></nav></header>
    <section class="hero"><p class="micro">Gray Gang Collective / partner of the Skye Music Nexus</p><h1>Crooked Reflection</h1><p class="lede">A bundled collective release collecting every active Gray Gang drop into one release room, with the new Crooked Reflection cuts pinned first and live links back to each storefront, product room, drop, and visual package.</p><div class="stats"><span class="stat"><strong>${release.trackCount}</strong>tracks</span><span class="stat"><strong>${release.newTrackCount}</strong>new</span><span class="stat"><strong>${release.artistCount}</strong>artists</span></div></section>
    <section class="track-list">${cards}</section>
  </main>
  <script>if('serviceWorker'in navigator){navigator.serviceWorker.register('./sw.js').catch(()=>{});}</script>
</body>
</html>`;
}

function linkCrookedReleaseFromCollective(releaseUrl) {
  const indexFile = path.join(storefrontRoot, 'gray-skyes-collective/index.html');
  let html = readText(indexFile);
  if (!html || html.includes('Crooked Reflection')) return false;
  html = html.replace(
    '<a class="btn" href="../artist-apps/">Artist Apps</a></div>',
    `<a class="btn" href="../artist-apps/">Artist Apps</a><a class="btn primary" href="${releaseUrl}">Crooked Reflection</a></div>`,
  );
  html = html.replace(
    '<a class="btn primary" href="#featured">Featured</a>',
    `<a class="btn primary" href="${releaseUrl}">Crooked Reflection</a><a class="btn" href="#featured">Featured</a>`,
  );
  fs.writeFileSync(indexFile, html);
  return true;
}

function writeCrookedReflectionRelease(results = []) {
  const releaseDir = path.join(storefrontRoot, 'gray-skyes-collective/releases/crooked-reflection');
  fs.mkdirSync(releaseDir, {recursive: true});
  const tracks = collectCrookedReflectionTracks(results.filter((result) => result.ok && result.publicPromotion !== false));
  const release = {
    schema: 'skyemusicnexus.collective-release.v1',
    title: 'Crooked Reflection',
    artistName: 'Gray Gang Collective',
    partner: 'Skye Music Nexus',
    collectiveId: 'gray-skyes-collective',
    trackCount: tracks.length,
    newTrackCount: tracks.filter((track) => track.newlyGenerated).length,
    artistCount: new Set(tracks.map((track) => track.artistSlug)).size,
    generatedAt: new Date().toISOString(),
    releaseUrl: '/SkyeMusicNexus/artist-storefronts/gray-skyes-collective/releases/crooked-reflection/',
    tracks,
  };
  writeJson(path.join(releaseDir, 'release.json'), release);
  fs.writeFileSync(path.join(releaseDir, 'index.html'), crookedReleaseHtml(release));
  writeJson(path.join(releaseDir, 'manifest.webmanifest'), {
    name: 'Crooked Reflection - Gray Gang Collective',
    short_name: 'CrookedRef',
    description: `${release.trackCount}-track Gray Gang Collective release, partner of the Skye Music Nexus.`,
    display: 'standalone',
    start_url: './',
    scope: './',
    theme_color: '#050506',
    background_color: '#050506',
  });
  fs.writeFileSync(path.join(releaseDir, 'sw.js'), swSource(['./', './index.html', './release.json', './manifest.webmanifest', './sw.js']));
  const linked = linkCrookedReleaseFromCollective('./releases/crooked-reflection/');
  return {releaseDir, url: release.releaseUrl, trackCount: release.trackCount, newTrackCount: release.newTrackCount, artistCount: release.artistCount, linked};
}

function relativeFromCollectiveRelease(ref = '') {
  if (!ref) return '';
  const raw = String(ref);
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/SkyeMusicNexus/artist-storefronts/')) {
    return `../../../${raw.replace(/^\/SkyeMusicNexus\/artist-storefronts\//, '')}`;
  }
  return raw;
}

function skepticSlimeReleaseHtml(release) {
  const cards = release.tracks.map((track, index) => `<article class="release-track">
      <span class="track-number">${String(index + 1).padStart(2, '0')}</span>
      <div>
        <p class="micro">${escapeHtml(track.artistNames)}</p>
        <h2>${escapeHtml(track.title)}</h2>
        <p>${escapeHtml(track.brief)}</p>
        <audio class="release-audio" controls preload="metadata" src="${escapeAttr(track.audio)}" data-track-index="${index}"></audio>
        <div class="actions"><a class="btn primary" href="${escapeAttr(track.dropUrl)}">Open Drop</a><a class="btn" href="${escapeAttr(track.productUrl)}">Products</a>${track.visualPackageUrl ? `<a class="btn" href="${escapeAttr(track.visualPackageUrl)}">Pics2Vid</a>` : ''}</div>
      </div>
    </article>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Skeptic Slime - Gray Gang Collective</title>
  <meta name="theme-color" content="#050506">
  <link rel="manifest" href="manifest.webmanifest">
  <style>
    :root{color-scheme:dark;--gold:#c8ff5c;--acid:#5cffb1;--pink:#ff4f8b;--ink:#f8ffe9;--muted:#b9c8ae;--line:rgba(248,255,233,.16)}
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 18% 12%,rgba(200,255,92,.24),transparent 30%),radial-gradient(circle at 82% 14%,rgba(255,79,139,.2),transparent 28%),linear-gradient(135deg,#030503,#0d1308 56%,#050506);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,sans-serif}
    main{width:min(1160px,calc(100% - 28px));margin:auto;padding:18px 0 70px}header{display:flex;justify-content:space-between;gap:12px;align-items:center;border-bottom:1px solid var(--line);padding:12px 0}.brand{font-weight:950;text-decoration:none}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:40px;border:1px solid var(--line);border-radius:8px;padding:9px 13px;background:rgba(255,255,255,.06);color:inherit;text-decoration:none;font-weight:900}.primary{background:linear-gradient(90deg,#fff,var(--gold),var(--acid));color:#050506}.hero{min-height:66vh;display:grid;align-content:end;padding:clamp(52px,9vw,116px) 0 30px}.micro{margin:0 0 10px;color:var(--gold);font-size:11px;letter-spacing:0;text-transform:uppercase;font-weight:950}h1{margin:0;font-size:clamp(58px,14vw,162px);line-height:.78;letter-spacing:0}.lede{max-width:860px;color:var(--muted);font-size:clamp(18px,2vw,24px);line-height:1.45}.stats{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}.stat{border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.38);padding:12px 14px}.stat strong{display:block;color:var(--gold);font-size:32px;line-height:1}.track-list{display:grid;gap:12px}.release-track{display:grid;grid-template-columns:70px minmax(0,1fr);gap:14px;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.44);padding:14px}.track-number{display:grid;place-items:center;width:54px;height:54px;border:1px solid var(--line);border-radius:8px;color:#050506;background:linear-gradient(135deg,#fff,var(--gold),var(--acid));font-weight:950}.release-track h2{margin:0 0 8px;font-size:clamp(30px,5vw,62px);line-height:.9}.release-track p{color:var(--muted);line-height:1.5}audio{width:100%;min-height:46px}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}@media(max-width:700px){.release-track{grid-template-columns:1fr}.track-number{width:100%;height:42px}}
  </style>
</head>
<body>
  <main>
    <header><a class="brand" href="../../">Gray Gang Collective</a><nav class="actions"><a class="btn" href="../../">Collective</a><a class="btn" href="../../../">Artist Stores</a></nav></header>
    <section class="hero"><p class="micro">Gray Skyes / Gray Skyes Brain / Wyl Parker</p><h1>Skeptic Slime</h1><p class="lede">A three-song Gray Gang release about doubt, proof, betrayal, and the gate. Every song has a live drop room, storefront product record, Pics2Vid package, creation receipt, and SuperIDE asset receipt.</p><div class="stats"><span class="stat"><strong>${release.trackCount}</strong>tracks</span><span class="stat"><strong>${release.artistCount}</strong>artists</span><span class="stat"><strong>${release.receiptCount}</strong>receipts</span></div></section>
    <section class="track-list">${cards}</section>
  </main>
  <script>
    const audios=[...document.querySelectorAll('.release-audio')];
    audios.forEach((audio,index)=>audio.addEventListener('ended',()=>{const next=audios[index+1];if(next){next.scrollIntoView({behavior:'smooth',block:'center'});next.play().catch(()=>{});}}));
    if('serviceWorker'in navigator){navigator.serviceWorker.register('./sw.js').catch(()=>{});}
  </script>
</body>
</html>`;
}

function linkSkepticReleaseFromCollective(releaseUrl) {
  const indexFile = path.join(storefrontRoot, 'gray-skyes-collective/index.html');
  let html = readText(indexFile);
  if (!html || html.includes('Skeptic Slime')) return false;
  html = html.replace(
    '<a class="btn primary" href="./releases/crooked-reflection/">Crooked Reflection</a>',
    `<a class="btn primary" href="./releases/crooked-reflection/">Crooked Reflection</a><a class="btn primary" href="${releaseUrl}">Skeptic Slime</a>`,
  );
  html = html.replace(
    '<a class="btn primary" href="./releases/crooked-reflection/">Crooked Reflection</a></div>',
    `<a class="btn primary" href="./releases/crooked-reflection/">Crooked Reflection</a><a class="btn primary" href="${releaseUrl}">Skeptic Slime</a></div>`,
  );
  fs.writeFileSync(indexFile, html);
  return true;
}

function writeSkepticSlimeRelease(results = []) {
  const releaseDir = path.join(storefrontRoot, 'gray-skyes-collective/releases/skeptic-slime');
  const audioDir = path.join(releaseDir, 'audio');
  fs.mkdirSync(audioDir, {recursive: true});
  const tracks = [];
  for (const result of results.filter((item) => item.ok && item.project === 'Skeptic Slime' && item.publicPromotion !== false)) {
    const audioName = `${slugify(result.title)}.mp3`;
    const dest = path.join(audioDir, audioName);
    fs.copyFileSync(result.localAudioFile, dest);
    const primarySlug = result.artists[0]?.slug || '';
    tracks.push({
      id:result.id,
      title:result.title,
      brief:SKEPTIC_SLIME_SONGS.find((song) => song.id === result.id)?.brief || '',
      artistNames:result.artists.map((artist) => artist.stageName).join(' x '),
      artistSlugs:result.artists.map((artist) => artist.slug),
      audio:`./audio/${audioName}`,
      dropUrl:relativeFromCollectiveRelease(result.pwaUrl),
      productUrl:primarySlug ? `../../../${primarySlug}/products/` : '../../../',
      visualPackageUrl:relativeFromCollectiveRelease(result.visualPackageUrl || ''),
      productId:result.productId,
      creationReceipt:result.creationReceipt?.receiptFile || '',
      superIdeRemoteReference:result.creationReceipt?.superIdeRemoteReference || '',
    });
  }
  const release = {
    schema:'skyemusicnexus.collective-release.v1',
    title:'Skeptic Slime',
    artistName:'Gray Gang Collective',
    partner:'Skye Music Nexus',
    collectiveId:'gray-skyes-collective',
    generatedAt:new Date().toISOString(),
    releaseUrl:'/SkyeMusicNexus/artist-storefronts/gray-skyes-collective/releases/skeptic-slime/',
    trackCount:tracks.length,
    artistCount:new Set(tracks.flatMap((track) => track.artistSlugs)).size,
    receiptCount:tracks.filter((track) => track.creationReceipt).length,
    tracks,
  };
  writeJson(path.join(releaseDir, 'release.json'), release);
  fs.writeFileSync(path.join(releaseDir, 'index.html'), skepticSlimeReleaseHtml(release));
  writeJson(path.join(releaseDir, 'manifest.webmanifest'), {
    name:'Skeptic Slime - Gray Gang Collective',
    short_name:'SkepticSlime',
    description:'Three-song Gray Gang Collective release with Gray Skyes, Gray Skyes Brain, and Wyl Parker.',
    display:'standalone',
    start_url:'./',
    scope:'./',
    theme_color:'#050506',
    background_color:'#050506',
  });
  fs.writeFileSync(path.join(releaseDir, 'sw.js'), swSource(['./', './index.html', './release.json', './manifest.webmanifest', './sw.js', ...tracks.map((track) => track.audio)]));
  const linked = linkSkepticReleaseFromCollective('./releases/skeptic-slime/');
  return {releaseDir, url:release.releaseUrl, trackCount:release.trackCount, artistCount:release.artistCount, receiptCount:release.receiptCount, linked};
}

function everythingMovieReleaseHtml(release) {
  const cards = release.tracks.map((track, index) => `<article class="release-track">
      <span class="track-number">${String(index + 1).padStart(2, '0')}</span>
      <div>
        <p class="micro">${escapeHtml(track.artistNames)}</p>
        <h2>${escapeHtml(track.title)}</h2>
        <p>${escapeHtml(track.brief)}</p>
        <audio class="release-audio" controls preload="metadata" src="${escapeAttr(track.audio)}" data-track-index="${index}"></audio>
        <div class="actions"><a class="btn primary" href="${escapeAttr(track.dropUrl)}">Open Act Drop</a><a class="btn" href="${escapeAttr(track.productUrl)}">Products</a>${track.visualPackageUrl ? `<a class="btn" href="${escapeAttr(track.visualPackageUrl)}">Pics2Vid</a>` : ''}</div>
      </div>
    </article>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Everything Movie - Gray Skyes</title>
  <meta name="theme-color" content="#050506">
  <link rel="manifest" href="manifest.webmanifest">
  <style>
    :root{color-scheme:dark;--gold:#ffd86b;--cyan:#43e7ff;--red:#ff3158;--ink:#fff7e8;--muted:#c5b8aa;--line:rgba(255,247,232,.16)}
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 16% 10%,rgba(255,49,88,.28),transparent 32%),radial-gradient(circle at 83% 16%,rgba(67,231,255,.2),transparent 31%),linear-gradient(135deg,#030303,#15080e 55%,#050506);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,sans-serif}
    body:before{content:"";position:fixed;inset:0;background:linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(rgba(255,255,255,.026) 1px,transparent 1px);background-size:54px 54px;pointer-events:none}
    main{position:relative;width:min(1180px,calc(100% - 28px));margin:auto;padding:18px 0 76px}header{display:flex;justify-content:space-between;gap:12px;align-items:center;border-bottom:1px solid var(--line);padding:12px 0}.brand{font-weight:950;text-decoration:none}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:40px;border:1px solid var(--line);border-radius:8px;padding:9px 13px;background:rgba(255,255,255,.06);color:inherit;text-decoration:none;font-weight:900}.primary{background:linear-gradient(90deg,#fff,var(--gold),var(--cyan));color:#050506}.hero{min-height:72vh;display:grid;align-content:end;padding:clamp(58px,10vw,128px) 0 34px}.micro{margin:0 0 10px;color:var(--gold);font-size:11px;letter-spacing:0;text-transform:uppercase;font-weight:950}h1{margin:0;font-size:clamp(62px,14vw,170px);line-height:.76;letter-spacing:0}.lede{max-width:890px;color:var(--muted);font-size:clamp(18px,2vw,24px);line-height:1.45}.stats{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}.stat{border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.38);padding:12px 14px}.stat strong{display:block;color:var(--gold);font-size:32px;line-height:1}.track-list{display:grid;gap:12px}.release-track{display:grid;grid-template-columns:70px minmax(0,1fr);gap:14px;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.44);padding:14px}.track-number{display:grid;place-items:center;width:54px;height:54px;border:1px solid var(--line);border-radius:8px;color:#050506;background:linear-gradient(135deg,#fff,var(--gold),var(--cyan));font-weight:950}.release-track h2{margin:0 0 8px;font-size:clamp(30px,5vw,62px);line-height:.9}.release-track p{color:var(--muted);line-height:1.5}audio{width:100%;min-height:46px}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}@media(max-width:700px){.release-track{grid-template-columns:1fr}.track-number{width:100%;height:42px}}
  </style>
</head>
<body>
  <main>
    <header><a class="brand" href="../../">Gray Gang Collective</a><nav class="actions"><a class="btn" href="../../">Collective</a><a class="btn" href="../../../gray-skyes/">Gray Skyes</a></nav></header>
    <section class="hero"><p class="micro">Gray cinematic suite / English-only / auto-play acts</p><h1>Everything Movie</h1><p class="lede">A long-form Gray Skyes life-battle story told as four continuous movements. Gray is the star, the collective appears as chorus voices, witnesses, system memory, and scene transitions, and the player carries you into the next act automatically.</p><div class="stats"><span class="stat"><strong>${release.trackCount}</strong>acts</span><span class="stat"><strong>${release.artistCount}</strong>artists</span><span class="stat"><strong>${release.totalMinutes}</strong>minutes</span></div></section>
    <section class="track-list">${cards}</section>
  </main>
  <script>
    const audios=[...document.querySelectorAll('.release-audio')];
    audios.forEach((audio,index)=>audio.addEventListener('ended',()=>{const next=audios[index+1];if(next){next.scrollIntoView({behavior:'smooth',block:'center'});next.play().catch(()=>{});}}));
    if('serviceWorker'in navigator){navigator.serviceWorker.register('./sw.js').catch(()=>{});}
  </script>
</body>
</html>`;
}

function linkEverythingMovieFromCollective(releaseUrl) {
  const indexFile = path.join(storefrontRoot, 'gray-skyes-collective/index.html');
  let html = readText(indexFile);
  if (!html || html.includes('Everything Movie')) return false;
  if (html.includes('Skeptic Slime')) {
    html = html.replace(
      '<a class="btn primary" href="./releases/skeptic-slime/">Skeptic Slime</a>',
      `<a class="btn primary" href="./releases/skeptic-slime/">Skeptic Slime</a><a class="btn primary" href="${releaseUrl}">Everything Movie</a>`,
    );
  } else {
    html = html.replace(
      '<a class="btn primary" href="./releases/crooked-reflection/">Crooked Reflection</a>',
      `<a class="btn primary" href="./releases/crooked-reflection/">Crooked Reflection</a><a class="btn primary" href="${releaseUrl}">Everything Movie</a>`,
    );
  }
  fs.writeFileSync(indexFile, html);
  return true;
}

function writeEverythingMovieRelease(results = []) {
  const releaseDir = path.join(storefrontRoot, 'gray-skyes-collective/releases/everything-movie');
  const audioDir = path.join(releaseDir, 'audio');
  fs.mkdirSync(audioDir, {recursive:true});
  const tracks = [];
  for (const result of results.filter((item) => item.ok && item.project === 'Everything Movie' && item.publicPromotion !== false)) {
    const audioName = `${slugify(result.title)}.mp3`;
    const dest = path.join(audioDir, audioName);
    fs.copyFileSync(result.localAudioFile, dest);
    const primarySlug = result.artists[0]?.slug || '';
    tracks.push({
      id:result.id,
      title:result.title,
      brief:EVERYTHING_MOVIE_SONGS.find((song) => song.id === result.id)?.brief || '',
      artistNames:result.artists.map((artist) => artist.stageName).join(' x '),
      artistSlugs:result.artists.map((artist) => artist.slug),
      audio:`./audio/${audioName}`,
      dropUrl:relativeFromCollectiveRelease(result.pwaUrl),
      productUrl:primarySlug ? `../../../${primarySlug}/products/` : '../../../',
      visualPackageUrl:relativeFromCollectiveRelease(result.visualPackageUrl || ''),
      productId:result.productId,
      creationReceipt:result.creationReceipt?.receiptFile || '',
    });
  }
  const totalSeconds = EVERYTHING_MOVIE_SONGS.filter((song) => tracks.some((track) => track.id === song.id)).reduce((sum, song) => sum + Number(song.durationSeconds || durationSeconds), 0);
  const release = {
    schema:'skyemusicnexus.collective-release.v1',
    title:'Everything Movie',
    artistName:'Gray Skyes and Gray Gang Collective',
    partner:'Skye Music Nexus',
    collectiveId:'gray-skyes-collective',
    generatedAt:new Date().toISOString(),
    releaseUrl:'/SkyeMusicNexus/artist-storefronts/gray-skyes-collective/releases/everything-movie/',
    languagePolicy:'English only',
    trackCount:tracks.length,
    artistCount:new Set(tracks.flatMap((track) => track.artistSlugs)).size,
    totalSeconds,
    totalMinutes:Number((totalSeconds / 60).toFixed(1)),
    tracks,
  };
  writeJson(path.join(releaseDir, 'release.json'), release);
  fs.writeFileSync(path.join(releaseDir, 'index.html'), everythingMovieReleaseHtml(release));
  writeJson(path.join(releaseDir, 'manifest.webmanifest'), {
    name:'Everything Movie - Gray Skyes',
    short_name:'EverythingMovie',
    description:'Long-form cinematic Gray Skyes suite with Gray Gang collective appearances.',
    display:'standalone',
    start_url:'./',
    scope:'./',
    theme_color:'#050506',
    background_color:'#050506',
  });
  fs.writeFileSync(path.join(releaseDir, 'sw.js'), swSource(['./', './index.html', './release.json', './manifest.webmanifest', './sw.js', ...tracks.map((track) => track.audio)]));
  const linked = linkEverythingMovieFromCollective('./releases/everything-movie/');
  return {releaseDir, url:release.releaseUrl, trackCount:release.trackCount, artistCount:release.artistCount, totalMinutes:release.totalMinutes, linked};
}

function publicReleaseAudioUrl(release, track) {
  const releaseUrl = String(release.releaseUrl || '').replace(/\/?$/, '/');
  const audio = String(track.audio || '').replace(/^\.\//, '');
  return publicSkyeMusicNexusUrl(`${releaseUrl}${audio}`);
}

function voxGrayModesReleaseHtml(release) {
  const cards = release.tracks.map((track, index) => {
    const audioSrc = publicReleaseAudioUrl(release, track);
    return `<article class="release-track ${track.modeId ? `mode-${escapeAttr(track.modeId)}` : ''}">
      <span class="track-number">${String(index + 1).padStart(2, '0')}</span>
      <div>
        <p class="micro">${escapeHtml(track.artistNames)}${track.modeLabel ? ` / ${escapeHtml(track.modeLabel)}` : ''}</p>
        <h2>${escapeHtml(track.title)}</h2>
        <p>${escapeHtml(track.brief)}</p>
        <audio class="release-audio" controls preload="metadata" src="${escapeAttr(audioSrc)}" data-track-index="${index}"></audio>
        <div class="actions"><a class="btn primary" href="${escapeAttr(track.dropUrl)}">Open Drop</a><a class="btn" href="${escapeAttr(track.productUrl)}">Products</a>${track.visualPackageUrl ? `<a class="btn" href="${escapeAttr(track.visualPackageUrl)}">Pics2Vid</a>` : ''}</div>
      </div>
    </article>`;
  }).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Vox Gray Modes - Gray Gang Collective</title>
  <meta name="theme-color" content="#050506">
  <link rel="manifest" href="manifest.webmanifest">
  <style>
    :root{color-scheme:dark;--gold:#ffd86b;--cyan:#43e7ff;--rose:#ff4f8b;--mint:#95ffd4;--ink:#fff7e8;--muted:#c8beb3;--line:rgba(255,247,232,.16)}
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 15% 12%,rgba(255,79,139,.24),transparent 30%),radial-gradient(circle at 84% 14%,rgba(67,231,255,.22),transparent 30%),linear-gradient(135deg,#030304,#120812 50%,#06120f);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,sans-serif}
    main{width:min(1180px,calc(100% - 28px));margin:auto;padding:18px 0 76px}header{display:flex;justify-content:space-between;gap:12px;align-items:center;border-bottom:1px solid var(--line);padding:12px 0}.brand{font-weight:950;text-decoration:none;color:inherit}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:40px;border:1px solid var(--line);border-radius:8px;padding:9px 13px;background:rgba(255,255,255,.06);color:inherit;text-decoration:none;font-weight:900}.primary{background:linear-gradient(90deg,#fff,var(--gold),var(--cyan));color:#050506}.hero{min-height:68vh;display:grid;align-content:end;padding:clamp(52px,9vw,120px) 0 32px}.micro{margin:0 0 10px;color:var(--gold);font-size:11px;letter-spacing:0;text-transform:uppercase;font-weight:950}h1{margin:0;font-size:clamp(58px,14vw,158px);line-height:.78;letter-spacing:0}.lede{max-width:900px;color:var(--muted);font-size:clamp(18px,2vw,24px);line-height:1.45}.stats{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}.stat{border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.38);padding:12px 14px}.stat strong{display:block;color:var(--gold);font-size:32px;line-height:1}.track-list{display:grid;gap:12px}.release-track{display:grid;grid-template-columns:70px minmax(0,1fr);gap:14px;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.44);padding:14px}.release-track.mode-hip-hop-rnb{border-color:rgba(149,255,212,.45);background:linear-gradient(135deg,rgba(149,255,212,.12),transparent 38%),rgba(0,0,0,.46)}.track-number{display:grid;place-items:center;width:54px;height:54px;border:1px solid var(--line);border-radius:8px;color:#050506;background:linear-gradient(135deg,#fff,var(--gold),var(--cyan));font-weight:950}.release-track h2{margin:0 0 8px;font-size:clamp(30px,5vw,62px);line-height:.9}.release-track p{color:var(--muted);line-height:1.5}audio{width:100%;min-height:46px}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}@media(max-width:700px){.release-track{grid-template-columns:1fr}.track-number{width:100%;height:42px}}
  </style>
  <link rel="stylesheet" href="https://skye-music-nexus.pages.dev/public/nexus-player.css" data-skymusicnexus-player="css">
</head>
<body>
  <main>
    <header><a class="brand" href="../../">Gray Gang Collective</a><nav class="actions"><a class="btn" href="../../">Collective</a><a class="btn" href="../../../artist-live-browser-20260523062845/">Vox Selene</a><a class="btn" href="../../../gray-skyes/">Gray Skyes</a></nav></header>
    <section class="hero"><p class="micro">Vox Selene / Gray Skyes / Gray Skyes Brain</p><h1>Vox Gray Modes</h1><p class="lede">A ${release.trackCount}-song mode pack for Vox Selene and Gray Skyes: Vox solo lanes, Vox with both Grays, Gray's established trap-metal lane, and a growing Gray x Vox hip-hop/R&amp;B duet run where Gray sings, raps, and answers as a versatile co-lead.</p><div class="stats"><span class="stat"><strong>${release.trackCount}</strong>tracks</span><span class="stat"><strong>${release.artistCount}</strong>artists</span><span class="stat"><strong>${release.modeCount}</strong>modes</span></div></section>
    <section class="track-list">${cards}</section>
  </main>
  <script>
    const audios=[...document.querySelectorAll('.release-audio')];
    audios.forEach((audio,index)=>audio.addEventListener('ended',()=>{const next=audios[index+1];if(next){next.scrollIntoView({behavior:'smooth',block:'center'});next.play().catch(()=>{});}}));
    if('serviceWorker'in navigator){navigator.serviceWorker.register('./sw.js').catch(()=>{});}
  </script>
  <script src="https://skye-music-nexus.pages.dev/public/nexus-player.js" data-skymusicnexus-player="js" defer></script>
</body>
</html>`;
}

function linkVoxGrayModesFromCollective(releaseUrl) {
  const indexFile = path.join(storefrontRoot, 'gray-skyes-collective/index.html');
  let html = readText(indexFile);
  if (!html || html.includes('Vox Gray Modes')) return false;
  if (html.includes('Everything Movie')) {
    html = html.replace(
      '<a class="btn primary" href="./releases/everything-movie/">Everything Movie</a>',
      `<a class="btn primary" href="./releases/everything-movie/">Everything Movie</a><a class="btn primary" href="${releaseUrl}">Vox Gray Modes</a>`,
    );
  } else {
    html = html.replace(
      '<a class="btn primary" href="./releases/crooked-reflection/">Crooked Reflection</a>',
      `<a class="btn primary" href="./releases/crooked-reflection/">Crooked Reflection</a><a class="btn primary" href="${releaseUrl}">Vox Gray Modes</a>`,
    );
  }
  fs.writeFileSync(indexFile, html);
  return true;
}

function writeVoxGrayModesRelease(results = []) {
  const releaseDir = path.join(storefrontRoot, 'gray-skyes-collective/releases/vox-gray-modes');
  const audioDir = path.join(releaseDir, 'audio');
  fs.mkdirSync(audioDir, {recursive:true});
  const existingRelease = readJson(path.join(releaseDir, 'release.json'), {tracks: []});
  const existingById = new Map((existingRelease.tracks || []).map((track) => [track.id, track]));
  const resultById = new Map(results.filter((item) => item.ok && item.project === 'Vox Gray Modes' && item.publicPromotion !== false).map((item) => [item.id, item]));
  const tracks = [];
  for (const sourceSong of VOX_GRAY_MODES_SONGS) {
    const result = resultById.get(sourceSong.id);
    if (!result) {
      const existing = existingById.get(sourceSong.id);
      if (existing) {
        const merged = {...existing};
        if (sourceSong.brief) merged.brief = sourceSong.brief;
        const isRnb = /r&b|rnb|hip-hop r&b/i.test(`${sourceSong.styleDirectives || ''} ${sourceSong.title}`);
        const isEstablishedGray = /trap metal|ragecore|established mode/i.test(`${sourceSong.styleDirectives || ''} ${sourceSong.brief || ''}`);
        merged.modeId = isRnb ? 'hip-hop-rnb' : isEstablishedGray ? 'red-room-ragecore' : (merged.modeId || '');
        merged.modeLabel = isRnb ? 'Gray Hip-Hop R&B Mode' : (merged.modeLabel || (sourceSong.artistKeys?.[0] === 'vox' ? 'Vox lead lane' : 'Gray established lane'));
        tracks.push(merged);
      }
      continue;
    }
    const audioName = `${slugify(result.title)}.mp3`;
    const dest = path.join(audioDir, audioName);
    fs.copyFileSync(result.localAudioFile, dest);
    const primarySlug = result.artists[0]?.slug || '';
    const isRnb = /r&b|rnb|hip-hop r&b/i.test(`${sourceSong.styleDirectives || ''} ${result.title}`);
    const isEstablishedGray = /trap metal|ragecore|established mode/i.test(`${sourceSong.styleDirectives || ''} ${sourceSong.brief || ''}`);
    tracks.push({
      id:result.id,
      title:result.title,
      brief:sourceSong.brief || '',
      artistNames:result.artists.map((artist) => artist.stageName).join(' x '),
      artistSlugs:result.artists.map((artist) => artist.slug),
      modeId:isRnb ? 'hip-hop-rnb' : isEstablishedGray ? 'red-room-ragecore' : '',
      modeLabel:isRnb ? 'Gray Hip-Hop R&B Mode' : (result.artists[0]?.slug === 'artist-live-browser-20260523062845' ? 'Vox lead lane' : 'Gray established lane'),
      audio:`./audio/${audioName}`,
      dropUrl:relativeFromCollectiveRelease(result.pwaUrl),
      productUrl:primarySlug ? `../../../${primarySlug}/products/` : '../../../',
      visualPackageUrl:relativeFromCollectiveRelease(result.visualPackageUrl || ''),
      productId:result.productId,
      creationReceipt:result.creationReceipt?.receiptFile || '',
    });
  }
  const release = {
    schema:'skyemusicnexus.collective-release.v1',
    title:'Vox Gray Modes',
    artistName:'Vox Selene, Gray Skyes, and Gray Skyes Brain',
    partner:'Skye Music Nexus',
    collectiveId:'gray-skyes-collective',
    generatedAt:new Date().toISOString(),
    releaseUrl:'/SkyeMusicNexus/artist-storefronts/gray-skyes-collective/releases/vox-gray-modes/',
    languagePolicy:'English only',
    trackCount:tracks.length,
    artistCount:new Set(tracks.flatMap((track) => track.artistSlugs)).size,
    modeCount:new Set(tracks.map((track) => track.modeLabel).filter(Boolean)).size,
    tracks,
  };
  writeJson(path.join(releaseDir, 'release.json'), release);
  fs.writeFileSync(path.join(releaseDir, 'index.html'), voxGrayModesReleaseHtml(release));
  writeJson(path.join(releaseDir, 'manifest.webmanifest'), {
    name:'Vox Gray Modes - Gray Gang Collective',
    short_name:'VoxGrayModes',
    description:`${tracks.length}-song Vox Selene and Gray Skyes mode pack with Gray Brain, trap metal, emo rap, and hip-hop R&B duet lanes.`,
    display:'standalone',
    start_url:'./',
    scope:'./',
    theme_color:'#050506',
    background_color:'#050506',
  });
  fs.writeFileSync(path.join(releaseDir, 'sw.js'), swSource(['./', './index.html', './release.json', './manifest.webmanifest', './sw.js', ...tracks.map((track) => track.audio)]));
  const linked = linkVoxGrayModesFromCollective('./releases/vox-gray-modes/');
  return {releaseDir, url:release.releaseUrl, trackCount:release.trackCount, artistCount:release.artistCount, modeCount:release.modeCount, linked};
}

function writeSongCreationBinIndex(receipt = {}) {
  fs.mkdirSync(songCreationBinRoot, {recursive:true});
  const entries = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.name === 'creation-receipt.json') {
        const data = readJson(file, {});
        entries.push({
          songId:data.songId || '',
          title:data.title || '',
          project:data.project || '',
          createdAt:data.createdAt || '',
          artists:(data.artists || []).map((artist) => artist.stageName).join(' x '),
          receiptFile:path.relative(repoRoot, file),
          audio:data.files?.audio || '',
          audioSha256:data.files?.audioSha256 || '',
          pwaUrl:data.files?.pwaUrl || '',
          productId:data.files?.productId || '',
      superIdeRemoteReference:data.superIdeAssetLane?.receipt?.remote_reference || '',
      generatedText:data.provider?.generatedText || '',
        });
      }
    }
  };
  walk(songCreationBinRoot);
  entries.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const index = {
    schema:'skyemusicnexus.song-creation-bin.v1',
    updatedAt:new Date().toISOString(),
    description:'Creation receipts, prompts, audio checksums, product ids, Pics2Vid links, and SuperIDE asset receipts for generated SkyeMusicNexus songs.',
    localBin:path.relative(repoRoot, songCreationBinRoot),
    superIdeAssetSource:'metraiyux_0s_site/DeVisional Riftx/platform/submission-adapters.js',
    latestRun:{
      mode:receipt.mode || '',
      scope:receipt.scope || '',
      release:receipt.voxGrayModes?.url || receipt.everythingMovie?.url || receipt.skepticSlime?.url || receipt.crookedReflection?.url || receipt.reflection?.url || '',
      resultCount:Array.isArray(receipt.results) ? receipt.results.length : 0,
    },
    googleDrive:receipt.googleDrive || null,
    entries,
  };
  writeJson(path.join(songCreationBinRoot, 'index.json'), index);
  fs.writeFileSync(path.join(songCreationBinRoot, 'README.md'), `# SkyeMusicNexus Song Creation Bin

This bin stores every generated song receipt, prompt, audio checksum, storefront product id, Pics2Vid package link, and DeVisional Riftx/SuperIDE asset receipt.

- Local index: \`index.json\`
- SuperIDE source adapter: \`${index.superIdeAssetSource}\`
- Latest run scope: \`${index.latestRun.scope || 'none'}\`
- Entry count: ${entries.length}
`);
  return index;
}

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

async function processSong(token, elevenKey, song) {
  const artists = song.artistKeys.map(loadArtist);
  const primary = artists[0];
  const generated = await callMusicProviderWithAssembly(elevenKey, song, artists);
  const result = {
    id: song.id,
    title: song.title,
    project: song.project || '',
    artists: artists.map((artist) => ({artistId: artist.artistId, slug: artist.slug, stageName: artist.stageName})),
    ok: generated.ok,
    targetDurationSeconds: generated.targetDurationSeconds || targetDurationForSong(song),
    assembledFromParts: Boolean(generated.assembledFromParts),
    oneContinuousMaster: generated.oneContinuousMaster !== false,
    partDurationsSeconds: generated.longFormAssembly?.partDurationsSeconds || [generated.targetDurationSeconds || targetDurationForSong(song)],
    providerStatus: generated.status,
    contentType: generated.contentType,
    bytes: generated.bytes,
    error: generated.error || '',
    pwaUrl: '',
    productId: '',
    visualPackageUrl: '',
    visualPackageStatus: '',
    localAudioFile: '',
    publicPromotion: false,
    qualityGate: null,
    worker: {},
  };
  if (!generated.ok) return result;

  const drop = writeArtistDrop(song, artists, primary, generated.audio, generated.providerId || 'elevenlabs');
  result.pwaUrl = drop.pwaUrl;
  result.productId = drop.product.productId;
  result.visualPackageUrl = drop.product.visualPackage?.packageUrl || '';
  result.visualPackageStatus = drop.product.visualPackage?.status || '';
  result.localAudioFile = drop.audioFile;
  result.publicPromotion = !drop.product.qualityGate;
  result.qualityGate = drop.product.qualityGate || null;

  const collaboratorProducts = artists.slice(1).map((artist) => writeCollaboratorProduct(song, artists, artist, drop.product));
  result.localProducts = [drop.product, ...collaboratorProducts].map((product) => ({artistId: product.artistId, productId: product.productId, pwaUrl: product.pwaUrl}));

  const workerResults = [];
  for (const artist of artists) {
    workerResults.push({artist: artist.stageName, store: await upsertStore(token, artist)});
  }
  for (const [index, artist] of artists.entries()) {
    const product = index === 0 ? drop.product : collaboratorProducts[index - 1];
    workerResults.push({artist: artist.stageName, product: await createProduct(token, artist, song, product)});
  }
  if (drop.product.qualityGate) {
    workerResults.push({artist: primary.stageName, feed: {ok: true, skipped: 'audio_quality_hold'}});
  } else {
    workerResults.push({artist: primary.stageName, feed: await createFeedPost(token, primary, song, drop.product)});
  }
  result.worker = workerResults;
  result.ok = workerResults.every((item) => Object.values(item).every((value) => !value || value.ok !== false));
  result.error = result.ok ? '' : 'one_or_more_worker_registration_calls_failed';
  const creationReceipt = await writeSongCreationReceipt({song, artists, primary, generated, drop, result});
  result.creationReceipt = {
    binDir: path.relative(repoRoot, creationReceipt.binDir),
    receiptFile: path.relative(repoRoot, creationReceipt.receiptFile),
    promptFile: path.relative(repoRoot, creationReceipt.promptFile),
    providerPromptsFile: path.relative(repoRoot, creationReceipt.providerPromptsFile),
    audioCopy: path.relative(repoRoot, creationReceipt.audioCopy),
    partAudioFiles: (creationReceipt.partAudioFiles || []).map((part) => ({...part})),
    superIdeRemoteReference: creationReceipt.superIdeReceipt?.remote_reference || '',
    superIdeUploadReference: creationReceipt.superIdeReceipt?.upload_reference || '',
  };
  return result;
}

function selectedSongs() {
  const filterBySongId = (songs) => songIdArg
    ? songs.filter((song) => song.id.toLowerCase() === songIdArg || slugify(song.title).toLowerCase() === songIdArg)
    : songs;
  if (['gray-collabs', 'grayxgray', 'new-gray-collabs', 'new-grayxgray'].includes(scopeArg)) {
    return filterBySongId(REFLECTION_SONGS.filter((song) => newGrayCollabIds.has(song.id)));
  }
  if (['gray-brain-cinematic-master', 'gray-brain-everything-master', 'twin-engine-movie', 'everything-movie-twin-engine'].includes(scopeArg)) {
    return filterBySongId(GRAY_BRAIN_CINEMATIC_MASTER_SONGS);
  }
  if (scopeArg === 'reflection') return filterBySongId(REFLECTION_SONGS);
  if (['crooked-reflection', 'crooked', 'gray-gang-release'].includes(scopeArg)) return filterBySongId(CROOKED_REFLECTION_SONGS);
  if (['everything-movie', 'everything', 'gray-movie', 'cinematic-gray'].includes(scopeArg)) return filterBySongId(EVERYTHING_MOVIE_SONGS);
  if (['skeptic-slime', 'skeptic', 'slime', 'wyl'].includes(scopeArg)) return filterBySongId(SKEPTIC_SLIME_SONGS);
  if (['vox-gray-modes', 'vox-gray', 'vox', 'gray-rnb', 'rnb', 'vox-selene', 'midnight-rnb', 'midnight-r-and-b-mode', 'vox-gray-extra-duets', 'gray-vox-extra-duets', 'more-gray-vox-duets'].includes(scopeArg)) {
    if (scopeArg === 'midnight-rnb' || scopeArg === 'midnight-r-and-b-mode') return filterBySongId(VOX_GRAY_MODES_SONGS.filter((song) => song.id === 'gray-vox-midnight-rnb-mode'));
    if (['vox-gray-extra-duets', 'gray-vox-extra-duets', 'more-gray-vox-duets'].includes(scopeArg)) return filterBySongId(VOX_GRAY_MODES_SONGS.filter((song) => ['gray-vox-slow-rain-reply', 'gray-vox-stay-through-static'].includes(song.id)));
    return filterBySongId(VOX_GRAY_MODES_SONGS);
  }
  if (['music4u-samir-gray', 'music4u-samir', 'fresh-singles', 'samir-gray', 'music4u-gray'].includes(scopeArg)) {
    return filterBySongId(MUSIC4U_SAMIR_GRAY_SONGS);
  }
  if (['roman-sable', 'roman-glass', 'roman', 'sable-june', 'sable'].includes(scopeArg)) {
    return filterBySongId(ROMAN_SABLE_SONGS);
  }
  if (scopeArg === 'requested' || scopeArg === 'collective') return filterBySongId(REQUESTED_SONGS);
  return filterBySongId([...REQUESTED_SONGS, ...REFLECTION_SONGS, ...CROOKED_REFLECTION_SONGS, ...SKEPTIC_SLIME_SONGS, ...EVERYTHING_MOVIE_SONGS, ...GRAY_BRAIN_CINEMATIC_MASTER_SONGS, ...VOX_GRAY_MODES_SONGS, ...MUSIC4U_SAMIR_GRAY_SONGS, ...ROMAN_SABLE_SONGS]);
}

async function main() {
  fs.mkdirSync(outDir, {recursive: true});
  const receipt = {
    schema: 'skyemusicnexus.reflection-and-collective-drops.v1',
    mode: packageOnly ? 'package-only' : execute ? 'execute' : 'dry-run',
    scope: scopeArg,
    baseUrl,
    durationSeconds,
    requestedAt: new Date().toISOString(),
    releaseRequirements: [
      {
        id: 'artist-image-pics2vid-package',
        status: 'enforced_for_new_drop_factory_outputs',
        description: 'Every generated song drop writes a pics2vid package with real artist images, audio reference, Still2Vid handoff, and SkyePics handoff.',
        apps: visualPackageApps,
      },
    ],
    songs: selectedSongs().map((song) => ({id: song.id, title: song.title, project: song.project || '', artists: song.artistKeys.map((key) => loadArtist(key).stageName)})),
    results: [],
  };
  if (packageOnly) {
    if (scopeArg === 'all' || ['crooked-reflection', 'crooked', 'gray-gang-release'].includes(scopeArg)) {
      receipt.crookedReflection = writeCrookedReflectionRelease([]);
    }
    if (scopeArg === 'all' || ['everything-movie', 'everything', 'gray-movie', 'cinematic-gray'].includes(scopeArg)) {
      receipt.everythingMovie = writeEverythingMovieRelease([]);
    }
    if (scopeArg === 'all' || ['skeptic-slime', 'skeptic', 'slime', 'wyl'].includes(scopeArg)) {
      receipt.skepticSlime = writeSkepticSlimeRelease([]);
    }
    if (scopeArg === 'all' || ['vox-gray-modes', 'vox-gray', 'vox', 'gray-rnb', 'rnb', 'vox-selene', 'midnight-rnb', 'midnight-r-and-b-mode', 'vox-gray-extra-duets', 'gray-vox-extra-duets', 'more-gray-vox-duets'].includes(scopeArg)) {
      receipt.voxGrayModes = writeVoxGrayModesRelease([]);
    }
    receipt.ok = Boolean(receipt.crookedReflection || receipt.everythingMovie || receipt.skepticSlime || receipt.voxGrayModes);
  } else if (!execute) {
    receipt.ok = true;
  } else {
    const provider = activeProviderConfig();
    const musicProviderKey = localEnvValue(provider.keys);
    if (!musicProviderKey.value) throw new Error(`No ${provider.id} API key found in local/root env aliases.`);
    const owner = await resolveOwnerGate();
    receipt.auth = {ok: true, sourceKey: owner.sourceKey};
    receipt.provider = {id: provider.id, model: provider.model, keyEnv: musicProviderKey.key, secretPrinted: false};
    for (const song of selectedSongs()) {
      const result = await processSong(owner.token, musicProviderKey.value, song);
      receipt.results.push(result);
      fs.writeFileSync(path.join(outDir, 'latest.json'), `${JSON.stringify(receipt, null, 2)}\n`);
      console.log(JSON.stringify({title: result.title, project: result.project, ok: result.ok, targetDurationSeconds: result.targetDurationSeconds, assembledFromParts: result.assembledFromParts, oneContinuousMaster: result.oneContinuousMaster, bytes: result.bytes, pwaUrl: result.pwaUrl, visualPackageUrl: result.visualPackageUrl, error: result.error || ''}));
      if (!result.ok) break;
    }
    if (scopeArg === 'reflection' || scopeArg === 'all' || ['gray-collabs', 'grayxgray', 'new-gray-collabs', 'new-grayxgray'].includes(scopeArg)) {
      receipt.reflection = writeReflectionProject(receipt.results);
    }
    if (scopeArg === 'all' || ['crooked-reflection', 'crooked', 'gray-gang-release'].includes(scopeArg)) {
      receipt.crookedReflection = writeCrookedReflectionRelease(receipt.results);
    }
    if (scopeArg === 'all' || ['everything-movie', 'everything', 'gray-movie', 'cinematic-gray'].includes(scopeArg)) {
      receipt.everythingMovie = writeEverythingMovieRelease(receipt.results);
    }
    if (scopeArg === 'all' || ['skeptic-slime', 'skeptic', 'slime', 'wyl'].includes(scopeArg)) {
      receipt.skepticSlime = writeSkepticSlimeRelease(receipt.results);
    }
    if (scopeArg === 'all' || ['vox-gray-modes', 'vox-gray', 'vox', 'gray-rnb', 'rnb', 'vox-selene', 'midnight-rnb', 'midnight-r-and-b-mode', 'vox-gray-extra-duets', 'gray-vox-extra-duets', 'more-gray-vox-duets'].includes(scopeArg)) {
      receipt.voxGrayModes = writeVoxGrayModesRelease(receipt.results);
    }
    receipt.ok = receipt.results.length === selectedSongs().length && receipt.results.every((result) => result.ok);
  }
  receipt.songCreationBin = writeSongCreationBinIndex(receipt);
  if (execute && (scopeArg === 'all' || ['everything-movie', 'everything', 'gray-movie', 'cinematic-gray', 'gray-brain-cinematic-master', 'gray-brain-everything-master', 'twin-engine-movie', 'everything-movie-twin-engine', 'skeptic-slime', 'skeptic', 'slime', 'wyl'].includes(scopeArg))) {
    const driveReleaseName = receipt.everythingMovie?.url
      ? 'Everything Movie'
      : receipt.skepticSlime?.url
        ? 'Skeptic Slime'
        : ['gray-brain-cinematic-master', 'gray-brain-everything-master', 'twin-engine-movie', 'everything-movie-twin-engine'].includes(scopeArg)
          ? 'Everything Movie II'
          : scopeArg;
    receipt.googleDrive = await uploadSongBinToDrive(path.join(songCreationBinRoot, slugify(driveReleaseName)));
    receipt.songCreationBin = writeSongCreationBinIndex(receipt);
  }
  receipt.finishedAt = new Date().toISOString();
  const out = path.join(outDir, `${receipt.mode}-${Date.now()}.json`);
  fs.writeFileSync(out, `${JSON.stringify(receipt, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, 'latest.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({ok: receipt.ok, mode: receipt.mode, receipt: out, songs: receipt.results.length || receipt.songs.length, reflection: receipt.reflection?.url || '', crookedReflection: receipt.crookedReflection?.url || '', skepticSlime: receipt.skepticSlime?.url || '', everythingMovie: receipt.everythingMovie?.url || '', voxGrayModes: receipt.voxGrayModes?.url || ''}, null, 2));
  if (!receipt.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
