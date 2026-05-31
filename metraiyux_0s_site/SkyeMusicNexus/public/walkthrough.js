(() => {
  const steps = [
    {
      lane: 'Listener first pass',
      title: 'Start at Home and let the catalog pulse tell the story.',
      body: 'Home opens the live catalog, current player, queue, artist pulse, playlists, trending songs, new drops, stations, and the owner-view collective context.',
      actions: ['Search or start radio.', 'Open an artist card.', 'Save tracks into the local library.'],
      screen: 'home',
      href: '../index.html',
      focus: [52, 42]
    },
    {
      lane: 'Artist launch pass',
      title: 'Move into the Artist Workspace when the artist is ready.',
      body: 'The workspace is the room map: signup, create, DAW, discover, radio, streams, awards, feed, upload, player, releases, rights, exchange, drops, apps, store, and brain.',
      actions: ['Open Artist Signup for identity intake.', 'Use the room map to choose the next move.', 'Keep all owner actions on the shared gate.'],
      screen: 'workspace',
      href: './index.html',
      focus: [62, 48]
    },
    {
      lane: 'Artist launch pass',
      title: 'Signup collects identity, contact, paperwork, and payout context.',
      body: 'Artist records carry Skye ID, photo handoff, artist details, paperwork status, SkyePay tracking, and the launch setup boundary before public release or payout.',
      actions: ['Create or confirm the artist profile.', 'Complete workforce paperwork before payout.', 'Keep payment identity stable after launch setup.'],
      screen: 'signup',
      href: './signup.html',
      focus: [48, 51]
    },
    {
      lane: 'Creation pass',
      title: 'DAW Room and the DAW turn the idea into a project packet.',
      body: 'The DAW room carries transport, arrangement, tracks, mixer, pads, keys, import/preview, mic and MIDI hooks, mixdown, save, and export controls.',
      actions: ['Sketch or import audio.', 'Stage stems and project notes.', 'Export the manifest into release work.'],
      screen: 'daw',
      href: './daw.html',
      focus: [43, 58]
    },
    {
      lane: 'Creation pass',
      title: 'Stem Vault and Export Forge keep the work portable.',
      body: 'Stems and exports keep project packets organized so a release can move through review, artwork, metadata, distribution boundaries, and store packaging.',
      actions: ['Stage stems and references.', 'Write release notes.', 'Export the project packet for the next room.'],
      screen: 'daw',
      href: './exports.html',
      focus: [58, 64]
    },
    {
      lane: 'Release pass',
      title: 'Upload Studio receives the real audio behind the shared gate.',
      body: 'Upload Studio handles large song files, protected audio vault records, generated track lines, and the handoff into Release Forge and the player.',
      actions: ['Drop owned or licensed audio.', 'Generate a track line.', 'Open the uploaded audio in the player context.'],
      screen: 'upload',
      href: './upload.html',
      focus: [50, 49]
    },
    {
      lane: 'Release pass',
      title: 'Release Forge and Rights Vault decide what can go public.',
      body: 'Release Forge stores artists, releases, credits, royalty context, operations sequence, and launch state. Rights Vault records ownership, preview use, and takedown holds.',
      actions: ['Create the release capsule.', 'Complete rights attestations.', 'Block preview or distribution when rights are not clear.'],
      screen: 'release',
      href: './releases.html',
      focus: [64, 47]
    },
    {
      lane: 'Business pass',
      title: 'The Store turns approved work into fan-facing products.',
      body: 'Artist Store handles digital access, merch, tickets, tips, bookings, memberships, order intents, product records, and SkyePay request routes.',
      actions: ['Create product copy and price.', 'Attach approved media or drop page.', 'Route checkout through SkyePay.'],
      screen: 'store',
      href: './store.html',
      focus: [49, 57]
    },
    {
      lane: 'Business pass',
      title: 'Analytics, awards, and brain cycles show movement.',
      body: 'Stream analytics show one Nexus streams stat with live charts, achievements issue artist and track milestones, and Artist Brain runs local activity cycles under the daemon policy.',
      actions: ['Open stream analytics.', 'Check the award wall.', 'Run approved Artist Brain tools.'],
      screen: 'proof',
      href: './stream-analytics.html',
      focus: [68, 44]
    },
    {
      lane: 'SupaBoy founding artist pass',
      title: 'SupaBoy already has a reserved shared-gate workspace.',
      body: 'SupaBoy has artist ID 444666666667, a storefront world, product desk, personalized welcome pack, provision record, Twitch handoff, and founder-command handoff pack. No SupaBoy-specific password is created.',
      actions: ['Send the welcome pack after owner review.', 'Use the shared 0S gate for access.', 'Complete paperwork before payout eligibility.'],
      screen: 'workspace',
      href: '../artist-storefronts/supaboy/welcome-pack/',
      focus: [54, 37]
    },
    {
      lane: 'SupaBoy product pass',
      title: 'SupaBoy product cards stay real before checkout goes live.',
      body: 'The SupaBoy product desk stages SLB / Superboy, 24 Hr In Houston proof, live booking, and first upload without fake audio or fake checkout. The welcome pack links Upload Studio with artist ID 444666666667 already carried in the URL.',
      actions: ['Inspect the SLB product card.', 'View the Houston proof visual.', 'Upload owned audio before requesting SkyePay checkout.'],
      screen: 'store',
      href: '../artist-storefronts/supaboy/products/',
      focus: [52, 58]
    }
  ];

  const root = document.querySelector('[data-walkthrough-root]');
  const cards = [...document.querySelectorAll('[data-screen-card]')];
  const pin = document.querySelector('[data-guide-pin]');
  const title = document.querySelector('[data-step-title]');
  const body = document.querySelector('[data-step-body]');
  const lane = document.querySelector('[data-step-lane]');
  const actions = document.querySelector('[data-step-actions]');
  const count = document.querySelector('[data-step-count]');
  const open = document.querySelector('[data-step-open]');
  const playButton = document.querySelector('[data-walkthrough-play]');
  const nextButton = document.querySelector('[data-walkthrough-next]');
  const prevButton = document.querySelector('[data-walkthrough-prev]');
  const jumpers = [...document.querySelectorAll('[data-walkthrough-jump]')];
  let index = 0;
  let timer = 0;
  let playing = false;

  function screenIndex(id) {
    return Math.max(0, cards.findIndex((card) => card.dataset.screenCard === id));
  }

  function placeCards(step) {
    const activeIndex = screenIndex(step.screen);
    cards.forEach((card, cardIndex) => {
      const offset = cardIndex - activeIndex;
      const distance = Math.abs(offset);
      const x = offset * 42;
      const y = distance * 20;
      const z = -distance * 62;
      const scale = Math.max(.72, 1 - distance * .07);
      card.style.transform = `translate3d(calc(-50% + ${x}px), ${y}px, ${z}px) rotateY(${offset * -8}deg) scale(${scale})`;
      card.style.opacity = distance > 4 ? '0' : String(Math.max(.18, 1 - distance * .16));
      card.style.zIndex = String(20 - distance);
      card.classList.toggle('is-active', cardIndex === activeIndex);
      card.setAttribute('aria-hidden', cardIndex === activeIndex ? 'false' : 'true');
    });
  }

  function setStep(nextIndex) {
    index = (nextIndex + steps.length) % steps.length;
    const step = steps[index];
    root.dataset.walkthroughStep = String(index);
    title.textContent = step.title;
    body.textContent = step.body;
    lane.textContent = step.lane;
    actions.innerHTML = step.actions.map((item) => `<li>${item}</li>`).join('');
    count.textContent = `${index + 1} / ${steps.length}`;
    open.href = step.href;
    pin.style.left = `${step.focus[0]}%`;
    pin.style.top = `${step.focus[1]}%`;
    placeCards(step);
    jumpers.forEach((item) => {
      const target = Number(item.dataset.walkthroughJump || 0);
      item.classList.toggle('is-active', target === index);
    });
  }

  function stop() {
    playing = false;
    window.clearInterval(timer);
    timer = 0;
    if (playButton) playButton.textContent = 'Play Walkthrough';
  }

  function play() {
    if (playing) return stop();
    playing = true;
    if (playButton) playButton.textContent = 'Pause Walkthrough';
    timer = window.setInterval(() => setStep(index + 1), 5200);
  }

  nextButton?.addEventListener('click', () => {
    stop();
    setStep(index + 1);
  });

  prevButton?.addEventListener('click', () => {
    stop();
    setStep(index - 1);
  });

  playButton?.addEventListener('click', play);

  jumpers.forEach((item) => item.addEventListener('click', () => {
    stop();
    setStep(Number(item.dataset.walkthroughJump || 0));
  }));

  setStep(0);
})();
