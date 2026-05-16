const demos = [
  {
    image: 'assets/beta-week/metraiyux-command.png',
    title: 'MetrAIyux 0S',
    text: 'The protected operating system for admin command, customer workspaces, and operating brains.'
  },
  {
    image: 'assets/beta-week/skygate-proof.png',
    title: 'SkyeGateFS27',
    text: 'The live auth and proof layer validating identity, introspection, and event evidence.'
  },
  {
    image: 'assets/beta-week/skyevault-drop.png',
    title: 'SkyeVault-Drop',
    text: 'Secure file intake with private storage, signed upload flow, and operator-facing setup.'
  },
  {
    image: 'assets/beta-week/citadeldb.png',
    title: 'CitadelDB',
    text: 'A proof-backed database command center for teams that need operational clarity.'
  },
  {
    image: 'assets/beta-week/sol-staffing.png',
    title: 'SOL Staffing',
    text: 'A staffing agency operating surface with recruiting, employer, candidate, and government lanes.'
  },
  {
    image: 'assets/beta-week/ecosystem-portal.png',
    title: 'Skye Ecosystem Portal',
    text: 'The central map that brings the deployed properties into one buyer-safe entry point.'
  }
];

const root = document.documentElement;
const demoImage = document.getElementById('demoImage');
const demoTitle = document.getElementById('demoTitle');
const demoText = document.getElementById('demoText');
const demoPlayer = document.querySelector('.demo-player');
const tabs = Array.from(document.querySelectorAll('.demo-tab'));
let current = 0;
let timer;

function setDemo(index) {
  current = (index + demos.length) % demos.length;
  const demo = demos[current];
  demoPlayer?.classList.add('is-changing');
  window.setTimeout(() => {
    if (demoImage) {
      demoImage.src = demo.image;
      demoImage.alt = `Live screenshot of ${demo.title}`;
    }
    if (demoTitle) demoTitle.textContent = demo.title;
    if (demoText) demoText.textContent = demo.text;
    tabs.forEach((tab, i) => {
      const active = i === current;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-current', active ? 'true' : 'false');
    });
    demoPlayer?.classList.remove('is-changing');
  }, 180);
}

function startTimer() {
  window.clearInterval(timer);
  timer = window.setInterval(() => setDemo(current + 1), 5200);
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    setDemo(Number(tab.dataset.index || 0));
    startTimer();
  });
});

window.addEventListener('scroll', () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
  root.style.setProperty('--scroll-progress', `${pct}%`);
}, { passive: true });

startTimer();
