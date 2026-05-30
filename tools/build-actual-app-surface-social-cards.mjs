import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, 'marketing/devooderator/assets/social/actual-app-surfaces');
const screenshotDir = path.join(outDir, 'screenshots');
const contentDir = path.join(repoRoot, 'marketing/devooderator/content/social-vault');
const manifestPath = path.join(outDir, 'actual-app-surface-cards.json');
const copyPackPath = path.join(contentDir, 'actual-app-surface-founder-campaign-pack.md');
const receiptPath = path.join(repoRoot, 'test-artifacts/social-real-surface/actual-app-surface-card-build-latest.json');

const marketing = 'https://metraiyux-0s-marketing.pages.dev';
const devo = 'https://devooderator.pages.dev';
const zeroOs = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';

const founderBadges = [
  'marketing/metraiyux-0s/assets/gray-skyes-headshot.png',
  'marketing/metraiyux-0s/assets/gray-skyes-portrait.jpg',
  'marketing/metraiyux-0s/assets/SkyesOverLondonFounder-Client.png',
  'marketing/metraiyux-0s/assets/founder-skyes-over-london.png',
  'marketing/metraiyux-0s/assets/media-over-london/gray-cutout.png'
];

const cards = [
  {
    id: 'devoderator-social-vault-app-surface',
    title: 'DevodeRator Social Vault',
    lane: 'Marketing command room',
    capturePath: 'marketing/devooderator/social.html',
    ctaUrl: `${devo}/social`,
    displayUrl: 'devooderator.pages.dev/social',
    headline: 'Copy, assets, replies, and posting flow in one room.',
    kicker: 'Actual DevodeRator page',
    subhead: 'The vault is the working surface for shipping public campaign motion instead of saving ideas in a drawer.',
    cta: 'Open the social vault',
    accent: '#75f7cf',
    caption: 'This is the actual DevodeRator Social Vault surface: campaign packs, copy controls, images, runbooks, replies, DMs, and posting rhythm in one place. It exists so the platform can move in public without rebuilding the campaign every morning.',
    thread: ['Marketing needs a working room.', 'The vault keeps copy, visuals, replies, and DMs together.', 'That means the next post is not a blank page.', 'Start here when the campaign needs motion.']
  },
  {
    id: 'devoderator-qr-cards-app-surface',
    title: 'DevodeRator QR Cards',
    lane: 'Scan-to-sales routing',
    capturePath: 'marketing/devooderator/cards.html',
    ctaUrl: `${devo}/cards`,
    displayUrl: 'devooderator.pages.dev/cards',
    headline: 'A business card scan should land somewhere useful.',
    kicker: 'Actual QR card surface',
    subhead: 'Founder contact, vCard, sell sheet, and marketing routes sit where a real scan can turn into a next step.',
    cta: 'Open the QR card hub',
    accent: '#ffcf5c',
    caption: 'The card hub turns a physical handoff into a real route. A scan can move toward the founder page, sell sheet, marketing site, vCard, or proof surface instead of dumping a lead into a random blog link.',
    thread: ['The QR code is a funnel decision.', 'If the route is wrong, the card wastes the moment.', 'This surface keeps scan paths tied to sales and proof.', 'Print works when the destination works.']
  },
  {
    id: 'business-card-factory-app-surface',
    title: 'Business Card Factory',
    lane: 'Card production surface',
    capturePath: 'metraiyux_0s_site/business-card-factory/index.html',
    ctaUrl: `${marketing}/business-cards.html`,
    displayUrl: '0S /business-card-factory',
    headline: 'Design the card and the destination together.',
    kicker: 'Actual 0S card app',
    subhead: 'The surface is built for practical card production: identity, routes, QR intent, and handoff context.',
    cta: 'Open the marketing card lane',
    accent: '#f6e071',
    caption: 'Business Card Factory is the production side of the card story. The design is not separate from the destination. The asset, QR route, founder identity, and sales context have to work as one handoff.',
    thread: ['A card is not just a rectangle.', 'It carries identity and routing.', 'The app surface keeps those decisions together.', 'That is how offline contact becomes online follow-up.']
  },
  {
    id: 'brandforge-app-surface',
    title: 'BrandForge',
    lane: 'Brand campaign builder',
    capturePath: 'metraiyux_0s_site/Free99/apps/brandforge/index.html',
    ctaUrl: `${marketing}/platform-dossiers/kaixu-brandkit.html`,
    displayUrl: '0S /Free99/apps/brandforge',
    headline: 'Brand work should produce usable campaign material.',
    kicker: 'Actual Free99 app',
    subhead: 'BrandForge turns identity decisions into names, angles, offers, and copy that can move into public channels.',
    cta: 'Open the brand kit dossier',
    accent: '#f58ad8',
    caption: 'BrandForge is a working brand surface, not a mood board. It helps turn identity into campaign-ready language: offer angles, hooks, names, taglines, and market positioning that can become posts, pages, and cards.',
    thread: ['Brand work has to leave the canvas.', 'The output should become copy, offers, and assets.', 'BrandForge is the app surface for that translation.', 'Identity becomes campaign material.']
  },
  {
    id: 'social-batch-factory-app-surface',
    title: 'Social Batch Factory',
    lane: 'Content production system',
    capturePath: 'metraiyux_0s_site/Free99/apps/social-batch-factory/index.html',
    ctaUrl: `${marketing}/platform-dossiers/marketing-made-easy.html`,
    displayUrl: '0S /Free99/apps/social-batch-factory',
    headline: 'Batch the campaign without flattening the message.',
    kicker: 'Actual social app',
    subhead: 'This surface is for creating channel-ready variations from real offers and real product pages.',
    cta: 'Open Marketing Made Easy',
    accent: '#8edcff',
    caption: 'Social Batch Factory is for the moment after strategy: turn the offer into platform-specific posts, captions, threads, follow-ups, and usable variations without losing the actual product context.',
    thread: ['One post is not a campaign.', 'A campaign needs variations.', 'The batch surface keeps those variations tied to the actual offer.', 'That is how content stays useful.']
  },
  {
    id: 'sovereigndocs-builder-app-surface',
    title: 'SovereignDocs Command Center',
    lane: 'Document workflow portal',
    capturePath: 'metraiyux_0s_site/Free99/apps/sovereigndocs/index.html',
    ctaUrl: `${marketing}/platform-dossiers/sovereigndocs.html`,
    displayUrl: '0S /Free99/apps/sovereigndocs',
    headline: 'Paperwork needs a command center.',
    kicker: 'Actual docs portal',
    subhead: 'The SovereignDocs surface routes document workflows, templates, review paths, and business paperwork state.',
    cta: 'Open SovereignDocs',
    accent: '#b8ec6f',
    caption: 'SovereignDocs is the document lane as a real surface: templates, workflow, review paths, compliance context, and business paperwork routing. The point is to move documents from static files into an operating process.',
    thread: ['Docs are not done just because they exist.', 'They need context, workflow, and follow-up.', 'SovereignDocs makes that visible.', 'The document becomes part of the system.']
  },
  {
    id: 'skyedocxmax-dashboard-app-surface',
    title: 'SkyeDocxMax Dashboard',
    lane: 'Document command dashboard',
    capturePath: 'metraiyux_0s_site/Marketing-Made-Easy/SkyeDocxMax/index.html',
    ctaUrl: `${marketing}/platform-dossiers/skyedocxmax.html`,
    displayUrl: '0S /Marketing-Made-Easy/SkyeDocxMax',
    headline: 'Document creation needs a dashboard.',
    kicker: 'Actual SkyeDocxMax app',
    subhead: 'The dashboard makes documents, packages, exports, proof, and settings visible as one operating lane.',
    cta: 'Open SkyeDocxMax',
    accent: '#70d7ff',
    caption: 'SkyeDocxMax is the document workspace as a dashboard. Documents, packages, exports, proof, security, and settings are visible in one lane so document work becomes operational instead of scattered.',
    thread: ['Document work needs a dashboard.', 'Packages, exports, and proof belong in the same view.', 'SkyeDocxMax makes that workflow visible.', 'That is document tooling with an operating layer.']
  },
  {
    id: 'documorph-app-surface',
    title: 'DocuMorph',
    lane: 'Document conversion tool',
    capturePath: 'metraiyux_0s_site/Free99/apps/documorph/app/index.html',
    ctaUrl: `${marketing}/platform-dossiers/documorph.html`,
    displayUrl: '0S /Free99/apps/documorph/app',
    headline: 'Document conversion should be operational.',
    kicker: 'Actual DocuMorph app',
    subhead: 'A practical surface for transforming documents while keeping the business route clear.',
    cta: 'Open DocuMorph',
    accent: '#d08cff',
    caption: 'DocuMorph is a utility surface with a bigger purpose: document transformation that belongs inside business workflow. Conversion is useful when it connects to what the owner needs to do next.',
    thread: ['Utilities should not feel isolated.', 'Document conversion has business context.', 'DocuMorph gives that work a surface.', 'Transform the file, then keep moving.']
  },
  {
    id: 'kaixu-codestudio-app-surface',
    title: 'kAIxU CodeStudio',
    lane: 'Code workspace',
    capturePath: 'metraiyux_0s_site/Free99/apps/kaixu-codestudio/app/index.html',
    ctaUrl: `${marketing}/platform-dossiers/kaixu-codestudio.html`,
    displayUrl: '0S /Free99/apps/kaixu-codestudio/app',
    headline: 'A code workspace belongs inside the operating system.',
    kicker: 'Actual code app',
    subhead: 'CodeStudio gives the platform a visible builder lane for editing, review, reports, and local app work.',
    cta: 'Open CodeStudio',
    accent: '#8df7d4',
    caption: 'kAIxU CodeStudio is the builder surface inside the broader system. It makes code work visible as a product lane: editing, review, reports, sandbox context, and handoff instead of hidden terminal chaos.',
    thread: ['The code layer is part of the product.', 'A serious platform needs a builder surface.', 'CodeStudio makes that layer visible.', 'It turns build work into an operating lane.']
  },
  {
    id: 'skyeapi-aegiscore-console-app-surface',
    title: 'SkyeAPI AegisCore',
    lane: 'API console',
    capturePath: 'metraiyux_0s_site/Free99/apps/skyeapi-aegiscore/apps/console/index.html',
    ctaUrl: `${marketing}/platform-dossiers/skyeapi-aegiscore.html`,
    displayUrl: '0S /Free99/apps/skyeapi-aegiscore/console',
    headline: 'API work needs a visible control surface.',
    kicker: 'Actual API console',
    subhead: 'AegisCore gives the backend story a console that operators can understand and route from.',
    cta: 'Open AegisCore',
    accent: '#83e3ff',
    caption: 'SkyeAPI AegisCore is the API lane as a visible console. The point is not to hide infrastructure behind vague claims. The surface makes backend posture, integrations, and control part of the platform story.',
    thread: ['Infrastructure still needs a face.', 'Operators need a surface for API posture.', 'AegisCore makes that layer explainable.', 'The backend becomes part of the sales story.']
  },
  {
    id: 'skyevaultpro-drive-app-surface',
    title: 'SkyeVaultPro Drive',
    lane: 'Source custody workspace',
    capturePath: 'metraiyux_0s_site/Free99/apps/skyevaultpro/drive/index.html',
    ctaUrl: `${marketing}/platform-dossiers/skyevaultpro.html`,
    displayUrl: '0S /Free99/apps/skyevaultpro/drive',
    headline: 'Source custody needs a real workspace.',
    kicker: 'Actual vault app',
    subhead: 'The drive surface turns recovery, file custody, and owner handoff into something visible.',
    cta: 'Open SkyeVaultPro',
    accent: '#6fd6ff',
    caption: 'SkyeVaultPro Drive is the visual workspace for custody and recovery. It makes source handoff, file state, and owner control feel concrete instead of theoretical.',
    thread: ['Custody is not abstract when source breaks.', 'The drive surface makes it visible.', 'Files, recovery, and handoff need a shared room.', 'That is the SkyeVaultPro story.']
  },
  {
    id: 'skyepics-app-surface',
    title: 'SkyePics',
    lane: 'Image and media tool',
    capturePath: 'metraiyux_0s_site/Free99/apps/skyepics/app-entry.html',
    ctaUrl: `${marketing}/platform-dossiers/skyemediacenter.html`,
    displayUrl: '0S /Free99/apps/skyepics',
    headline: 'Images need a production surface.',
    kicker: 'Actual media app',
    subhead: 'SkyePics gives visual work a place to live inside the media and campaign system.',
    cta: 'Open SkyeMediaCenter',
    accent: '#ff8bb7',
    caption: 'SkyePics is part of the media operations lane: image surfaces, campaign visuals, and usable creative work tied back to the broader content system.',
    thread: ['Visuals need more than a folder.', 'They need a production surface.', 'SkyePics connects images back to campaign motion.', 'That is how media becomes useful.']
  },
  {
    id: 'skyearcade-app-surface',
    title: 'SkyeArcade',
    lane: 'Interactive learning games',
    capturePath: 'metraiyux_0s_site/Free99/apps/skyearcade/index.html',
    ctaUrl: `${marketing}/platform-dossiers/skyearcade.html`,
    displayUrl: '0S /Free99/apps/skyearcade',
    headline: 'Training can be interactive, not dusty.',
    kicker: 'Actual arcade app',
    subhead: 'The arcade surface turns learning, practice, and system literacy into playable modules.',
    cta: 'Open SkyeArcade',
    accent: '#ffd15c',
    caption: 'SkyeArcade shows the interactive side of the 0S: games, practice modules, learning surfaces, and product education that people can actually engage with.',
    thread: ['Training does not have to be static.', 'Interactive surfaces create memory.', 'SkyeArcade makes system literacy playable.', 'That is a product lane, not a gimmick.']
  },
  {
    id: 'keygate13-vault-app-surface',
    title: 'KeyGate13 Vault',
    lane: 'Credential tool surface',
    capturePath: 'metraiyux_0s_site/Free99/apps/keygate13/vault.html',
    ctaUrl: `${marketing}/platform-dossiers/skyebox-authenticator.html`,
    displayUrl: '0S /Free99/apps/keygate13/vault',
    headline: 'Credential work needs a sober interface.',
    kicker: 'Actual vault surface',
    subhead: 'The vault view keeps key handling, generation, and safety context inside a visible tool lane.',
    cta: 'Open Skyebox Authenticator',
    accent: '#f36f6f',
    caption: 'KeyGate13 Vault is the credential side as an actual interface. Security work needs visible structure, careful routing, and a tool surface that does not pretend keys are casual.',
    thread: ['Credentials are operational material.', 'They need a serious surface.', 'KeyGate13 keeps that work visible and contained.', 'The security lane has to be designed.']
  },
  {
    id: 'skyebox-authenticator-app-surface',
    title: 'Skyebox Authenticator',
    lane: 'Auth utility app',
    capturePath: 'metraiyux_0s_site/Free99/apps/skyebox-authenticator/index.html',
    ctaUrl: `${marketing}/platform-dossiers/skyebox-authenticator.html`,
    displayUrl: '0S /Free99/apps/skyebox-authenticator',
    headline: 'Authentication belongs in the same system story.',
    kicker: 'Actual auth app',
    subhead: 'This surface turns sign-in, codes, and owner control into a product-visible trust lane.',
    cta: 'Open Skyebox Authenticator',
    accent: '#8df7d4',
    caption: 'Skyebox Authenticator is an auth surface people can actually understand. It turns trust, codes, owner access, and sign-in posture into something visible inside the 0S ecosystem.',
    thread: ['Auth is not just plumbing.', 'It is part of the trust story.', 'Skyebox gives that layer a clear interface.', 'Security gets easier to explain when it has a surface.']
  },
  {
    id: 'doctor-ops-vault-app-surface',
    title: 'Doctor Ops Personal Vault',
    lane: 'Healthcare ops workspace',
    capturePath: 'metraiyux_0s_site/Free99/apps/doctor-ops-personal-vault/app.html',
    ctaUrl: `${marketing}/platform-dossiers/doctor-ops-personal-vault.html`,
    displayUrl: '0S /Free99/apps/doctor-ops-personal-vault',
    headline: 'Clinical admin work needs calmer tooling.',
    kicker: 'Actual healthcare app',
    subhead: 'The vault gives healthcare workflows a workspace for prep, follow-up, records, and operational clarity.',
    cta: 'Open Doctor Ops',
    accent: '#70d7ff',
    caption: 'Doctor Ops Personal Vault is built around the real administrative drag inside care workflows: prep, follow-up, routing, notes, and operational clarity. This is the kind of app surface that makes the niche feel real.',
    thread: ['Healthcare admin work is heavy.', 'The surface has to reduce clutter.', 'Doctor Ops organizes the recurring workflows.', 'A niche app becomes useful when the workflow is visible.']
  },
  {
    id: 'soap-note-studio-app-surface',
    title: 'SOAP Note Studio',
    lane: 'Clinical note workflow',
    capturePath: 'metraiyux_0s_site/Free99/apps/doctor-ops-personal-vault/apps/soap-note-studio.html',
    ctaUrl: `${marketing}/platform-dossiers/doctor-ops-personal-vault.html`,
    displayUrl: '0S /Doctor Ops/SOAP Note Studio',
    headline: 'A note tool should respect the workflow around it.',
    kicker: 'Actual workflow app',
    subhead: 'SOAP Note Studio is one focused surface inside the larger healthcare operations vault.',
    cta: 'Open Doctor Ops',
    accent: '#b8ec6f',
    caption: 'SOAP Note Studio is a focused workflow surface inside Doctor Ops. It shows the platform can break a large niche into precise tools instead of forcing every task through one overloaded dashboard.',
    thread: ['Specific workflow tools matter.', 'SOAP notes have their own rhythm.', 'This surface keeps that task focused.', 'Small tools become powerful inside a larger system.']
  },
  {
    id: 'prior-auth-tracker-app-surface',
    title: 'Prior Auth Tracker',
    lane: 'Authorization workflow',
    capturePath: 'metraiyux_0s_site/Free99/apps/doctor-ops-personal-vault/apps/prior-auth-tracker.html',
    ctaUrl: `${marketing}/platform-dossiers/doctor-ops-personal-vault.html`,
    displayUrl: '0S /Doctor Ops/Prior Auth Tracker',
    headline: 'Follow-up work should not disappear.',
    kicker: 'Actual tracker app',
    subhead: 'A focused tracker for the status, next action, and pressure points of prior authorization.',
    cta: 'Open Doctor Ops',
    accent: '#d08cff',
    caption: 'Prior Auth Tracker is the kind of small operational app that saves time because the status and next action are visible. It turns a frustrating admin process into a trackable surface.',
    thread: ['Prior auth is a follow-up problem.', 'Status gets lost when the work scatters.', 'A tracker gives the process a visible lane.', 'That is how admin drag gets reduced.']
  },
  {
    id: 'lab-followup-board-app-surface',
    title: 'Lab Followup Board',
    lane: 'Care follow-up board',
    capturePath: 'metraiyux_0s_site/Free99/apps/doctor-ops-personal-vault/apps/lab-followup-board.html',
    ctaUrl: `${marketing}/platform-dossiers/doctor-ops-personal-vault.html`,
    displayUrl: '0S /Doctor Ops/Lab Followup Board',
    headline: 'Follow-up needs a board, not a memory test.',
    kicker: 'Actual board app',
    subhead: 'The board surface keeps lab follow-up visible, prioritized, and ready for action.',
    cta: 'Open Doctor Ops',
    accent: '#ffcf5c',
    caption: 'Lab Followup Board is a simple idea with serious value: put follow-up work somewhere visible. When care tasks live on a board, the next action is harder to miss.',
    thread: ['Follow-up fails when it is invisible.', 'A board creates shared context.', 'Lab Followup Board makes the next action easier to see.', 'That is workflow value.']
  },
  {
    id: 'jobping-app-surface',
    title: 'JobPing',
    lane: 'Work alert surface',
    capturePath: 'metraiyux_0s_site/Free99/apps/jobping/index.html',
    ctaUrl: `${marketing}/platform-dossiers/free99.html`,
    displayUrl: '0S /Free99/apps/jobping',
    headline: 'Work alerts should route action.',
    kicker: 'Actual Free99 app',
    subhead: 'JobPing is a lightweight surface for work discovery, pings, and next-step routing.',
    cta: 'Open Free99',
    accent: '#8edcff',
    caption: 'JobPing is the lightweight work-alert lane: a focused app surface that can turn opportunity discovery into a visible next action instead of another scattered notification.',
    thread: ['Alerts are only useful when they route action.', 'JobPing gives that idea a surface.', 'Opportunity becomes easier to track.', 'That is the Free99 entry lane doing real work.']
  },
  {
    id: 'kaixu-storefront-app-surface',
    title: 'kAIxU Storefront',
    lane: 'Product and offer shelf',
    capturePath: 'metraiyux_0s_site/Free99/apps/kaixu-storefront/index.html',
    ctaUrl: `${marketing}/platform-dossiers/kaixu-storefront.html`,
    displayUrl: '0S /Free99/apps/kaixu-storefront',
    headline: 'Offers need a shelf that makes sense.',
    kicker: 'Actual storefront app',
    subhead: 'The storefront surface organizes products, offers, and paths back into the operating system.',
    cta: 'Open kAIxU Storefront',
    accent: '#f0c76b',
    caption: 'kAIxU Storefront gives the product shelf a real interface. Offers, digital products, packages, and platform routes need a place where buyers can understand what is available and what to do next.',
    thread: ['A storefront is more than a buy button.', 'It organizes the offer shelf.', 'kAIxU Storefront ties products back into the system.', 'That is how commerce becomes clearer.']
  },
  {
    id: 'skaixu-code-evaluator-app-surface',
    title: 'Skaixu Code Evaluator',
    lane: 'Code review utility',
    capturePath: 'metraiyux_0s_site/Free99/apps/skaixu-code-evaluator/app.html',
    ctaUrl: `${marketing}/platform-dossiers/skaixu-code-evaluator.html`,
    displayUrl: '0S /Free99/apps/skaixu-code-evaluator',
    headline: 'Code review should produce decisions.',
    kicker: 'Actual evaluator app',
    subhead: 'The evaluator surface helps turn code inspection into scores, risks, notes, and action.',
    cta: 'Open Skaixu Code Evaluator',
    accent: '#75f7cf',
    caption: 'Skaixu Code Evaluator is a practical review surface. It frames code inspection around decisions: what is risky, what is ready, what needs attention, and how the owner should read the result.',
    thread: ['Code review needs usable output.', 'A score without context is weak.', 'This surface turns inspection into owner-readable action.', 'That is where evaluation becomes useful.']
  },
  {
    id: 'mydrive-offline-vault-app-surface',
    title: 'MyDrive Offline Vault',
    lane: 'Offline file custody',
    capturePath: 'metraiyux_0s_site/Free99/apps/mydrive-offline-vault/index.html',
    ctaUrl: `${marketing}/platform-dossiers/skyevaultos.html`,
    displayUrl: '0S /Free99/apps/mydrive-offline-vault',
    headline: 'Offline custody is still product work.',
    kicker: 'Actual vault utility',
    subhead: 'The vault surface gives offline files, recovery, and owner control a visible lane.',
    cta: 'Open SkyeVaultOS',
    accent: '#6fd6ff',
    caption: 'MyDrive Offline Vault is a custody surface for files that should not depend on fragile workflows. It makes offline storage, recovery posture, and owner control part of the broader vault story.',
    thread: ['Not every file belongs in a random cloud folder.', 'Offline custody needs a route too.', 'MyDrive gives that idea a product surface.', 'Control becomes easier when the workflow is visible.']
  },
  {
    id: 'signinpro-northstar-app-surface',
    title: 'SigninPro NorthStar',
    lane: 'Signup and access flow',
    capturePath: 'metraiyux_0s_site/Free99/apps/signinpro-northstar/index.html',
    ctaUrl: `${marketing}/platform-dossiers/northstar-signinpro.html`,
    displayUrl: '0S /Free99/apps/signinpro-northstar',
    headline: 'Signup is part of the product experience.',
    kicker: 'Actual access app',
    subhead: 'SigninPro gives intake, access, and identity flow a clear interface.',
    cta: 'Open NorthStar SigninPro',
    accent: '#8df7d4',
    caption: 'SigninPro NorthStar is the access-flow surface. Signup, identity, onboarding, and routing all shape how the platform feels before a user ever reaches a dashboard.',
    thread: ['Signup is not a throwaway screen.', 'It decides trust and direction.', 'SigninPro gives that flow a real surface.', 'The first step matters.']
  },
  {
    id: 'skyeops-console-app-surface',
    title: 'SkyeOps Console',
    lane: 'Operator console',
    capturePath: 'metraiyux_0s_site/Free99/apps/skyeopsconsole/index.html',
    ctaUrl: `${marketing}/capabilities.html`,
    displayUrl: '0S /Free99/apps/skyeopsconsole',
    headline: 'Operators need a console, not scattered tabs.',
    kicker: 'Actual ops app',
    subhead: 'SkyeOps Console brings operational tasks, visibility, and next steps into one surface.',
    cta: 'Open 0S capabilities',
    accent: '#83e3ff',
    caption: 'SkyeOps Console is the operator-facing idea in app form: bring visibility, next actions, and control into one place so the person running the work does not have to hunt across scattered tabs.',
    thread: ['Operations scatter fast.', 'A console creates one place to look.', 'SkyeOps makes the operator lane visible.', 'That is how work gets easier to run.']
  },
  {
    id: 'zero-os-wrapper-preview-app-surface',
    title: '0S Wrapper Preview',
    lane: 'Mounted app shell',
    capturePath: 'metraiyux_0s_site/0s-wrapper-preview/index.html',
    ctaUrl: `${marketing}/0s-dossier.html`,
    displayUrl: '0S /0s-wrapper-preview',
    headline: 'Mounted apps need a shared shell.',
    kicker: 'Actual 0S shell surface',
    subhead: 'The wrapper preview shows how app surfaces can sit inside one coherent operating frame.',
    cta: 'Open the 0S dossier',
    accent: '#f6e071',
    caption: 'The 0S Wrapper Preview shows the shell idea: different app surfaces can live inside a shared operating frame instead of feeling like unrelated one-offs.',
    thread: ['The wrapper is part of the system.', 'Apps need a shared frame.', 'The preview makes that structure visible.', 'That is how the 0S feels like one platform.']
  },
  {
    id: 'free99-home-app-surface',
    title: 'Free99 App Shelf',
    lane: 'Free app entry layer',
    capturePath: 'metraiyux_0s_site/Free99/index.html',
    ctaUrl: `${marketing}/platform-dossiers/free99.html`,
    displayUrl: '0S /Free99',
    headline: 'Free entry can still look like infrastructure.',
    kicker: 'Actual Free99 surface',
    subhead: 'The app shelf gives the free lane structure, context, and a route into the broader 0S ecosystem.',
    cta: 'Open Free99',
    accent: '#75f7cf',
    caption: 'Free99 is the app shelf for low-friction entry. The important part is that free does not mean flimsy: the tools still sit inside a broader operating system story.',
    thread: ['Free should not mean throwaway.', 'The app shelf creates structure.', 'Free99 gives users a useful first lane.', 'That entry can grow into the full system.']
  },
  {
    id: 'auren-client-app-surface',
    title: 'Auren Client App',
    lane: 'Client app example',
    capturePath: 'metraiyux_0s_site/Auren/index.html',
    ctaUrl: `${marketing}/platform-dossiers/client-app-factory.html`,
    displayUrl: '0S /Auren',
    headline: 'Client apps should feel finished, not generic.',
    kicker: 'Actual client app surface',
    subhead: 'Auren gives the client-app factory story a concrete, branded example.',
    cta: 'Open Client App Factory',
    accent: '#d08cff',
    caption: 'Auren is a client-app surface that shows the factory idea in practice. The point is not just generating pages; it is producing branded, usable software surfaces for specific businesses or operators.',
    thread: ['Client app factory needs proof.', 'Auren gives the idea a concrete surface.', 'The app feels specific instead of generic.', 'That is what a client build should do.']
  },
  {
    id: 'marketing-made-easy-app-surface',
    title: 'Marketing Made Easy',
    lane: 'Growth suite surface',
    capturePath: 'metraiyux_0s_site/Marketing-Made-Easy/index.html',
    ctaUrl: `${marketing}/platform-dossiers/marketing-made-easy.html`,
    displayUrl: '0S /Marketing-Made-Easy',
    headline: 'Marketing tools need product context.',
    kicker: 'Actual growth suite',
    subhead: 'The suite surface ties campaigns, brand work, content, and growth workflows into one lane.',
    cta: 'Open Marketing Made Easy',
    accent: '#ff8bb7',
    caption: 'Marketing Made Easy is the growth suite as an app surface. It ties campaigns, brand work, content production, and offer routes into one lane so marketing stays connected to actual products.',
    thread: ['Marketing loses power when it floats away from the product.', 'The suite keeps campaign work connected.', 'Assets, copy, and offers belong together.', 'That is the growth lane.']
  },
  {
    id: 'ae-flowpro-app-surface',
    title: 'AE FlowPro',
    lane: 'Automation workflow',
    capturePath: 'metraiyux_0s_site/Marketing-Made-Easy/AE-FlowPro/index.html',
    ctaUrl: `${marketing}/platform-dossiers/ae-flowpro.html`,
    displayUrl: '0S /Marketing-Made-Easy/AE-FlowPro',
    headline: 'Automation should be visible enough to trust.',
    kicker: 'Actual automation app',
    subhead: 'AE FlowPro turns repeatable actions, handoffs, and workflow state into a visible operator surface.',
    cta: 'Open AE FlowPro',
    accent: '#ff725e',
    disableHeavyVisuals: true,
    caption: 'AE FlowPro is the automation lane as a surface. The value is not magic language; it is repeatable process, visible handoff, and workflow clarity.',
    thread: ['Automation should not feel invisible.', 'Operators need to see the workflow.', 'AE FlowPro gives automation a readable surface.', 'Control is the real feature.']
  },
  {
    id: 'skyeroutex-workforce-app-surface',
    title: 'SkyeRouteX Workforce',
    lane: 'Dispatch and route command',
    capturePath: 'metraiyux_0s_site/SkyeRouteX/workforce-command-v0.4.0/index.html',
    ctaUrl: `${marketing}/platform-dossiers/skyeroutex.html`,
    displayUrl: '0S /SkyeRouteX/workforce-command',
    headline: 'Dispatch, proof, and next actions need one board.',
    kicker: 'Actual workforce app',
    subhead: 'The workforce command surface brings providers, jobs, routing, proof, and follow-up into view.',
    cta: 'Open SkyeRouteX',
    accent: '#b8ec6f',
    caption: 'SkyeRouteX Workforce Command is an actual operations surface for jobs, providers, routes, proof, and next action. It makes the platform promise concrete.',
    thread: ['Workforce ops have too many moving parts.', 'A command surface gives the work a shape.', 'SkyeRouteX keeps dispatch and proof in view.', 'That is operations software doing its job.']
  },
  {
    id: 'valley-verified-owner-crm-app-surface',
    title: 'Valley Verified Network',
    lane: 'Local business console',
    capturePath: 'metraiyux_0s_site/valley-verified/index.html',
    ctaUrl: `${marketing}/platform-dossiers/valley-verified.html`,
    displayUrl: '0S /valley-verified',
    headline: 'Local outreach needs a real business console.',
    kicker: 'Actual Valley Verified app',
    subhead: 'The Valley Verified surface gives business pages, SkyEmail activation, network metrics, and owner routes one public command room.',
    cta: 'Open Valley Verified',
    accent: '#f0c76b',
    caption: 'Valley Verified is the local-business network as an actual surface: verified business pages, SkyEmail activation, network metrics, owner routes, and public proof all in one place.',
    thread: ['Local outreach cannot live in scattered notes.', 'The network surface gives it structure.', 'Owner context and activation paths stay visible.', 'That is how local data becomes revenue motion.']
  }
];

cards.forEach((card, index) => {
  card.founderImage = card.founderImage || founderBadges[index % founderBadges.length];
});

function rel(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, '/');
}

function esc(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

async function dataUri(filePath) {
  const absolute = path.join(repoRoot, filePath);
  const bytes = await fs.readFile(absolute);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'svg' ? 'image/svg+xml' : 'image/png';
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
  }[ext] || 'application/octet-stream';
}

async function startStaticServer() {
  const zeroOsRootPrefixes = [
    '0s',
    '0s-wrapper-preview',
    'Auren',
    'Free99',
    'HouseOperations',
    'Marketing-Made-Easy',
    'SkyeMediaCenter',
    'SkyeMusicNexus',
    'SkyeProfitConsole',
    'SkyeRouteX',
    'SkyeSplitEngine',
    'assets',
    'business-card-factory',
    'client-app-factory',
    'skyenet',
    'valley-verified'
  ];

  async function existingPath(cleanPath) {
    const firstSegment = cleanPath.split('/')[0];
    const candidates = [];
    if (zeroOsRootPrefixes.includes(firstSegment)) {
      candidates.push(path.resolve(repoRoot, 'metraiyux_0s_site', cleanPath));
    }
    candidates.push(path.resolve(repoRoot, cleanPath || 'index.html'));

    for (const candidate of candidates) {
      if (!candidate.startsWith(repoRoot)) continue;
      try {
        const stat = await fs.stat(candidate);
        return stat.isDirectory() ? path.join(candidate, 'index.html') : candidate;
      } catch (_error) {
        // Try the next candidate.
      }
    }
    return null;
  }

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://127.0.0.1');
      const cleanPath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const filePath = await existingPath(cleanPath);
      if (!filePath || !filePath.startsWith(repoRoot)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }
      const file = await fs.readFile(filePath);
      response.writeHead(200, {
        'content-type': contentType(filePath),
        'cache-control': 'no-store'
      });
      response.end(file);
    } catch (_error) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, origin: `http://127.0.0.1:${address.port}` });
    });
  });
}

function encodePath(filePath) {
  return filePath.split('/').map(encodeURIComponent).join('/');
}

async function captureSurface(page, origin, card) {
  const out = path.join(screenshotDir, `${card.id}-surface.png`);
  const url = `${origin}/${encodePath(card.capturePath)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 2500 }).catch(() => {});
  await page.waitForTimeout(900);
  await page.addStyleTag({
    content: `
      *,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;}
      .os-runtime-truth,.os-runtime-api-errors,[data-os-runtime-truth],[data-os-runtime-api-errors]{display:none!important;visibility:hidden!important;}
    `
  }).catch(() => {});
  if (card.disableHeavyVisuals) {
    await page.addStyleTag({ content: 'canvas,video{visibility:hidden!important;} *,*::before,*::after{filter:none!important;backdrop-filter:none!important;transform:none!important;}' }).catch(() => {});
    await page.waitForTimeout(300);
  }
  if (card.scrollY) {
    await page.evaluate((y) => window.scrollTo(0, y), card.scrollY);
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1200, height: 1000 }, animations: 'disabled', caret: 'hide' });
  return out;
}

function cardHtml(card, surfaceSrc, founderSrc) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 1080px; height: 1350px; background: #050506; }
  body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #fff7e7; }
  #card {
    position: relative;
    width: 1080px;
    height: 1350px;
    overflow: hidden;
    background:
      radial-gradient(circle at 86% 7%, color-mix(in srgb, ${card.accent} 24%, transparent), transparent 280px),
      linear-gradient(145deg, #050506 0%, #10141b 48%, #08090d 100%);
  }
  #card::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px),
      linear-gradient(0deg, rgba(255,255,255,.035) 1px, transparent 1px);
    background-size: 68px 68px;
    opacity: .36;
  }
  .wrap { position: relative; z-index: 1; height: 100%; padding: 38px 42px 34px; display: grid; grid-template-rows: auto 884px minmax(0, 1fr); gap: 22px; }
  .topline { display: flex; align-items: center; justify-content: space-between; gap: 18px; min-height: 58px; }
  .brand { display: flex; min-width: 0; align-items: center; gap: 14px; color: rgba(255,255,255,.86); font-size: 22px; font-weight: 950; letter-spacing: .02em; }
  .badge {
    width: 54px;
    height: 54px;
    border-radius: 50%;
    border: 2px solid color-mix(in srgb, ${card.accent} 80%, #fff 20%);
    overflow: hidden;
    flex: 0 0 auto;
    background: #0a0d12;
  }
  .badge img { width: 100%; height: 100%; object-fit: cover; object-position: center top; display: block; }
  .lane { flex: 0 0 auto; border: 1px solid rgba(255,255,255,.16); border-radius: 999px; padding: 11px 15px; color: ${card.accent}; background: rgba(0,0,0,.3); font-size: 17px; font-weight: 950; text-transform: uppercase; letter-spacing: .08em; }
  .browser {
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,.2);
    border-radius: 28px;
    background: #070a0f;
    box-shadow: 0 30px 84px rgba(0,0,0,.54);
  }
  .chrome { height: 58px; display: flex; align-items: center; gap: 12px; padding: 0 22px; background: linear-gradient(180deg, rgba(255,255,255,.11), rgba(255,255,255,.055)); }
  .dot { width: 15px; height: 15px; border-radius: 50%; }
  .dot:nth-child(1) { background: #ff5f57; }
  .dot:nth-child(2) { background: #febc2e; }
  .dot:nth-child(3) { background: #28c840; }
  .url { margin-left: 12px; min-width: 0; color: rgba(255,255,255,.74); font: 850 17px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .screen { width: 100%; height: 826px; display: block; object-fit: cover; object-position: top center; }
  .proof { position: absolute; left: 24px; bottom: 24px; border: 1px solid rgba(255,255,255,.18); border-radius: 999px; padding: 12px 15px; color: #061015; background: ${card.accent}; font-size: 18px; font-weight: 1000; box-shadow: 0 14px 40px rgba(0,0,0,.38); }
  .copy {
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 260px;
    gap: 22px;
    align-items: stretch;
  }
  .message {
    min-width: 0;
    border: 1px solid rgba(255,255,255,.14);
    border-radius: 24px;
    padding: 25px 26px 22px;
    background: linear-gradient(145deg, rgba(255,255,255,.105), rgba(255,255,255,.034));
    box-shadow: 0 22px 58px rgba(0,0,0,.34);
  }
  .kicker { color: ${card.accent}; font-size: 18px; font-weight: 1000; letter-spacing: .11em; text-transform: uppercase; }
  h1 { margin: 13px 0 0; max-width: 640px; color: #fff8e8; font-size: 49px; line-height: 1; letter-spacing: 0; }
  .subhead { margin: 15px 0 0; max-width: 660px; color: rgba(239,244,248,.82); font-size: 23px; line-height: 1.23; font-weight: 740; }
  .action {
    display: flex;
    min-width: 0;
    flex-direction: column;
    justify-content: space-between;
    border-radius: 24px;
    padding: 23px;
    color: #061015;
    background: ${card.accent};
    box-shadow: 0 22px 54px rgba(0,0,0,.34);
  }
  .action strong { font-size: 29px; line-height: 1.02; letter-spacing: 0; }
  .action span { font-size: 17px; line-height: 1.24; font-weight: 950; opacity: .72; }
  .footer { position: absolute; left: 42px; right: 42px; bottom: 13px; display: flex; justify-content: space-between; gap: 18px; color: rgba(255,255,255,.58); font-size: 14px; font-weight: 950; letter-spacing: .09em; text-transform: uppercase; }
</style>
</head>
<body>
<main id="card">
  <div class="wrap">
    <section class="topline">
      <div class="brand"><span class="badge"><img src="${founderSrc}" alt="Gray London Skyes founder badge"></span><span>Gray London Skyes / MetrAIyux 0S</span></div>
      <div class="lane">${esc(card.lane)}</div>
    </section>
    <section class="browser" aria-label="${esc(card.title)} captured app surface">
      <div class="chrome"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="url">${esc(card.displayUrl || card.capturePath)}</span></div>
      <img class="screen" src="${surfaceSrc}" alt="${esc(card.title)} actual app screenshot">
      <div class="proof">Actual app surface capture</div>
    </section>
    <section class="copy">
      <div class="message">
        <div class="kicker">${esc(card.kicker)}</div>
        <h1>${esc(card.headline)}</h1>
        <p class="subhead">${esc(card.subhead)}</p>
      </div>
      <div class="action"><strong>${esc(card.cta)}</strong><span>${esc(card.title)} / ${esc(card.lane)}</span></div>
    </section>
  </div>
  <div class="footer"><span>Founder badge, not the surface</span><span>UI first / app first</span></div>
</main>
</body>
</html>`;
}

function renderCopyPack(records) {
  const lines = [
    '# Actual App Surface Founder Campaign Pack',
    '',
    'Corrected app-surface-first campaign pack. These visuals use actual local app/tool surfaces as the dominant screenshot. Founder imagery is a small brand badge, not the main content.',
    ''
  ];

  records.forEach((record, index) => {
    lines.push(`## ${index + 1}. ${record.title} - ${record.lane}`);
    lines.push('');
    lines.push(`Visual: ${record.file}`);
    lines.push(`Captured app surface: ${record.capturePath}`);
    lines.push(`Screenshot receipt: ${record.screenshot}`);
    lines.push(`CTA route: ${record.ctaUrl}`);
    lines.push(`Founder badge: ${record.founderImage}`);
    lines.push('');
    lines.push('### LinkedIn / Facebook');
    lines.push(record.caption);
    lines.push('');
    lines.push(`CTA: ${record.cta} - ${record.ctaUrl}`);
    lines.push('');
    lines.push('### Instagram caption');
    lines.push(`${record.headline} ${record.subhead} ${record.caption}`);
    lines.push('');
    lines.push('### X thread');
    record.thread.forEach((item, threadIndex) => {
      lines.push(`${threadIndex + 1}/${record.thread.length} ${item}`);
    });
    lines.push('');
    lines.push('### Hashtags');
    lines.push('#MetrAIyux #GrayLondonSkyes #ActualAppSurface #FounderLed #SmallBusinessSystems #Automation #ProofOfWork');
    lines.push('');
  });

  return `${lines.join('\n')}\n`;
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(screenshotDir, { recursive: true });
  await fs.mkdir(contentDir, { recursive: true });
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });

  const { server, origin } = await startStaticServer();
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-webgl', '--disable-accelerated-2d-canvas']
  });

  const captureContext = await browser.newContext({
    viewport: { width: 1200, height: 1000 },
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true
  });
  const capturePage = await captureContext.newPage();

  const renderContext = await browser.newContext({
    viewport: { width: 1080, height: 1350 },
    deviceScaleFactor: 1
  });
  const renderPage = await renderContext.newPage();

  const records = [];
  const failures = [];

  try {
    for (const [index, card] of cards.entries()) {
      try {
        console.error(`[actual-app-surfaces] ${index + 1}/${cards.length} ${card.id}`);
        await fs.access(path.join(repoRoot, card.capturePath));
        await fs.access(path.join(repoRoot, card.founderImage));
        const screenshot = await captureSurface(capturePage, origin, card);
        const surfaceSrc = await dataUri(rel(screenshot));
        const founderSrc = await dataUri(card.founderImage);
        await renderPage.setContent(cardHtml(card, surfaceSrc, founderSrc), { waitUntil: 'load' });
        await renderPage.waitForFunction(() => Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0), null, { timeout: 15000 });
        const filePath = path.join(outDir, `${card.id}.png`);
        await renderPage.locator('#card').screenshot({ path: filePath, animations: 'disabled', caret: 'hide' });
        records.push({
          ...card,
          file: `assets/social/actual-app-surfaces/${card.id}.png`,
          screenshot: `assets/social/actual-app-surfaces/screenshots/${card.id}-surface.png`,
          generatedFrom: 'actual local app/tool screenshot plus small repo founder badge',
          dimensions: '1080x1350'
        });
        console.error(`[actual-app-surfaces] done ${card.id}`);
      } catch (error) {
        console.error(`[actual-app-surfaces] failed ${card.id}: ${error.message}`);
        failures.push({ id: card.id, capturePath: card.capturePath, error: error.message });
      }
    }
  } finally {
    await browser.close().catch(() => {});
    await new Promise((resolve) => server.close(resolve));
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    count: records.length,
    source: 'Corrected app-surface-first social cards generated from actual local 0S/Free99/DevodeRator app surfaces. Founder imagery is intentionally limited to a small badge.',
    screenshotCapture: {
      explicitOwnerRequest: true,
      purpose: 'asset creation, not browser proof',
  viewport: '1200x1000',
      staticSource: 'repo-root local HTTP server'
    },
    cards: records
  };

  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.writeFile(copyPackPath, renderCopyPack(records));
  await fs.writeFile(receiptPath, `${JSON.stringify({
    ok: failures.length === 0,
    generatedAt: manifest.generatedAt,
    count: records.length,
    failures,
    manifestPath: rel(manifestPath),
    copyPackPath: rel(copyPackPath),
    receiptPath: rel(receiptPath)
  }, null, 2)}\n`);

  console.log(JSON.stringify({
    ok: failures.length === 0,
    count: records.length,
    failures,
    manifestPath: rel(manifestPath),
    copyPackPath: rel(copyPackPath),
    receiptPath: rel(receiptPath)
  }, null, 2));

  if (failures.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
