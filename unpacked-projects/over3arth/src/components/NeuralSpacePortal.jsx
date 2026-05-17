import { Brain, Database, Hammer, Map, Radio, RefreshCw, Server, Workflow } from 'lucide-react';

import { getNeuralSpaceLane, neuralSpaceKnowledgeCategories, neuralSpaceProSummary, summarizeNeuralSpaceRoutes } from '../data/neuralSpacePro.js';

const laneIcons = {
  chat: Brain,
  knowledge: Database,
  runtime: Server,
  build: Hammer,
  research: Radio,
  handoff: Workflow,
  map: Map
};

export default function NeuralSpacePortal({ lanes, activeLaneId, runtime, busy, onSelectLane, onRefresh }) {
  const activeLane = getNeuralSpaceLane(activeLaneId);
  const ActiveIcon = laneIcons[activeLane.id] || Brain;
  const routeCount = summarizeNeuralSpaceRoutes(activeLane.id).length;
  const summary = runtime?.summary || {};

  return (
    <section className="neuralspace-portal" data-online={runtime?.online ? 'true' : 'false'} aria-label="NeuralSpacePro assistant dimension">
      <div className="neuralspace-portal-head">
        <span>
          <ActiveIcon size={14} />
          {neuralSpaceProSummary.product} v{neuralSpaceProSummary.version}
        </span>
        <button type="button" onClick={onRefresh} disabled={busy} aria-label="Sync NeuralSpacePro runtime">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="neuralspace-lane-grid" aria-label="NeuralSpacePro lanes">
        {lanes.map((lane) => {
          const Icon = laneIcons[lane.id] || Brain;
          return (
            <button
              key={lane.id}
              type="button"
              className={lane.id === activeLane.id ? 'active' : ''}
              onClick={() => onSelectLane(lane.id)}
              style={{ '--lane-color': lane.color }}
              aria-label={`Open ${lane.label}`}
            >
              <Icon size={13} />
              <span>{lane.shortLabel}</span>
            </button>
          );
        })}
      </div>

      <div className="neuralspace-readout">
        <strong>{activeLane.label}</strong>
        <p>{activeLane.gameplay}</p>
        <div className="neuralspace-metrics">
          <span><b>{summary.sessionCount || 0}</b><small>sessions</small></span>
          <span><b>{summary.projectCount || 0}</b><small>projects</small></span>
          <span><b>{summary.queueDepth || 0}</b><small>queue</small></span>
          <span><b>{summary.handoffPackCount || 0}</b><small>handoffs</small></span>
        </div>
        <small>
          {runtime?.online
            ? `${routeCount || 1} live route${routeCount === 1 ? '' : 's'} linked.`
            : `${neuralSpaceKnowledgeCategories.length} knowledge rooms staged. Runtime sync is waiting for the local worker.`}
        </small>
      </div>
    </section>
  );
}
