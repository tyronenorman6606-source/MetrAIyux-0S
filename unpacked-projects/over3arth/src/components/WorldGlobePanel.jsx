import { Globe } from '../registry/magicui/globe.jsx';

export default function WorldGlobePanel({ worldName, energy, activeGoals, completedQuests }) {
  return (
    <section className="globe-demo-card glass-panel" aria-label="Over3arth world globe">
      <span className="globe-title" aria-hidden="true">Over3arth</span>
      <Globe className="world-globe" intensity={Math.max(0.8, energy / 70)} label={`${worldName} interactive energy globe`} />
      <div className="globe-mist" />
      <div className="globe-command-strip">
        <span>
          <strong>{worldName}</strong>
          <small>Active world construct</small>
        </span>
        <span>
          <strong>{energy}%</strong>
          <small>Reality charge</small>
        </span>
        <span>
          <strong>{activeGoals}</strong>
          <small>Realms active</small>
        </span>
        <span>
          <strong>{completedQuests}</strong>
          <small>Proofs locked</small>
        </span>
      </div>
    </section>
  );
}
