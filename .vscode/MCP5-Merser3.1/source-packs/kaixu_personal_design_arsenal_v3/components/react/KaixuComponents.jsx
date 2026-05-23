import React, { useState } from 'react';
import './kaixu-tokens.css';
import './kaixu-components.css';

export function KxButton({ children, variant = '', ...props }) {
  return <button className={`kx-btn ${variant}`} {...props}>{children}</button>;
}

export function KxCard({ children, hot = false }) {
  return <div className={`kx-card kx-pad ${hot ? 'kx-card-hot' : ''}`}>{children}</div>;
}

export function KxHero({ title = 'Your trippy 3D interface starts here.', subtitle = 'Drop this into any app and customize the content.' }) {
  return <section className="kx-section"><div className="kx-wrap kx-two"><div className="kx-stack"><span className="kx-mini">Reusable React block</span><h1 className="kx-title"><span className="kx-gradient-text">{title}</span></h1><p className="kx-lead">{subtitle}</p><div className="kx-btn-row"><KxButton>Launch</KxButton><KxButton variant="secondary">Details</KxButton></div></div><KxCard hot><div className="kx-orb" /><h2 className="kx-h2">System-ready</h2><p className="kx-muted">Use the same CSS tokens as the static kit.</p></KxCard></div></section>;
}

export function KxTabs() {
  const [tab, setTab] = useState('apps');
  return <KxCard><div className="kx-tabs"><button className="kx-tab" aria-selected={tab==='apps'} onClick={() => setTab('apps')}>Apps</button><button className="kx-tab" aria-selected={tab==='sales'} onClick={() => setTab('sales')}>Sales</button><button className="kx-tab" aria-selected={tab==='media'} onClick={() => setTab('media')}>Media</button></div><p className="kx-lead">{tab === 'apps' ? 'Command decks and tools.' : tab === 'sales' ? 'Client pitch surfaces and offers.' : 'Galleries, artist pages, video and music surfaces.'}</p></KxCard>;
}

export default function KaixuPreview() {
  return <main><KxHero /><section className="kx-section"><div className="kx-wrap kx-grid"><KxCard><h3 className="kx-h3">Card</h3><p className="kx-muted">Reusable content block.</p></KxCard><KxTabs /></div></section></main>;
}
