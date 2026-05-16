
const ClientDeckDefaults = {
  platformName: 'Client Command Deck',
  companyName: 'Client Company',
  founderName: 'Client Founder',
  tagline: 'Autonomous business command deck',
  publicUrl: 'https://client-domain.example',
  adminEmail: 'owner@example.com',
  approvalFromEmail: 'approvals@client-domain.example'
};

function rootRelative(path) {
  const script = document.querySelector('script[src$="script.js"]');
  if (script && script.src) return new URL(path, script.src).href;
  return path;
}

async function loadClientDeckConfig() {
  try {
    const res = await fetch(rootRelative('client-config.json'), { cache: 'no-store' });
    if (!res.ok) return ClientDeckDefaults;
    return { ...ClientDeckDefaults, ...(await res.json()) };
  } catch {
    return ClientDeckDefaults;
  }
}

function replaceTextNodeContent(root, config) {
  const replacements = [
    ['Client Command Deck', config.platformName],
    ['Client Company', config.companyName],
    ['Client Founder', config.founderName],
    ['client-domain.example', new URL(config.publicUrl).host],
    ['owner@example.com', config.adminEmail],
    ['Autonomous business command deck', config.tagline]
  ].filter(([from, to]) => from && to && from !== to);

  if (!replacements.length) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    let text = node.nodeValue;
    replacements.forEach(([from, to]) => {
      text = text.split(from).join(to);
    });
    node.nodeValue = text;
  });
}

function applyClientDeckConfig(config) {
  document.documentElement.dataset.clientDeck = 'white-label';
  document.documentElement.style.setProperty('--client-accent', config.accent || '#d7aa43');
  document.title = document.title.replaceAll(ClientDeckDefaults.platformName, config.platformName);
  replaceTextNodeContent(document.body, config);
  document.querySelectorAll('input[placeholder], textarea[placeholder], img[alt], meta[name="description"]').forEach(el => {
    ['placeholder', 'alt', 'content'].forEach(attr => {
      if (!el.hasAttribute(attr)) return;
      let value = el.getAttribute(attr);
      value = value.replaceAll(ClientDeckDefaults.platformName, config.platformName)
        .replaceAll(ClientDeckDefaults.companyName, config.companyName)
        .replaceAll(ClientDeckDefaults.founderName, config.founderName);
      el.setAttribute(attr, value);
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  window.CLIENT_COMMAND_DECK = await loadClientDeckConfig();
  applyClientDeckConfig(window.CLIENT_COMMAND_DECK);
});

const search = document.querySelector('#search');
const cards = [...document.querySelectorAll('.leader-card')];
if (search) {
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    cards.forEach(card => {
      const text = card.innerText.toLowerCase();
      card.style.display = text.includes(q) ? '' : 'none';
    });
  });
}
const observer = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){entry.target.animate([{opacity:0,transform:'translateY(16px)'},{opacity:1,transform:'translateY(0)'}],{duration:550,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});observer.unobserve(entry.target)}
  })
},{threshold:.1});
document.querySelectorAll('.leader-card,.panel,.cabinet-map div,.quote-panel').forEach(el=>{el.style.opacity=0;observer.observe(el)});
