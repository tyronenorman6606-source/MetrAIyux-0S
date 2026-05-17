import { motion } from 'framer-motion';
import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  Crown,
  ExternalLink,
  FolderLock,
  Hammer,
  Info,
  Maximize2,
  RefreshCw,
  Settings,
  X
} from 'lucide-react';

import { getGrayScapeModule, getGrayScapeModuleUrl, grayScapeModules, grayScapeSummary } from '../data/grayscapeSuperApp.js';
import { PocketUniverseScene, UniverseArtifact, universeArtifactEase, universeArtifactMotion } from './worlds/UniverseArtifact.jsx';

const moduleIcons = {
  nexus: Crown,
  forge: Hammer,
  command: CalendarDays,
  tasks: CheckSquare,
  journal: BookOpen,
  vault: FolderLock,
  settings: Settings,
  about: Info
};

export default function GrayScapeChromebook({
  activeModuleId,
  signal,
  open,
  busy,
  onSelectModule,
  onOpenModule,
  onClose,
  onRefresh,
  onFrameLoad
}) {
  const activeModule = getGrayScapeModule(activeModuleId);
  const ActiveIcon = moduleIcons[activeModule.id] || Crown;
  const tasks = signal?.tasks || {};
  const journal = signal?.journal || {};
  const vault = signal?.vault || {};
  const command = signal?.command || {};

  function launchModule(moduleId = activeModule.id) {
    onSelectModule?.(moduleId);
    onOpenModule?.(moduleId);
  }

  function wakeFromPointer(event) {
    event.preventDefault();
    launchModule(activeModule.id);
  }

  function wakeFromClick(event) {
    if (event.detail !== 0) return;
    launchModule(activeModule.id);
  }

  if (!open) {
    return (
      <UniverseArtifact
        className="grayscape-chromebook"
        open={false}
        accent={activeModule.color}
        motionSource="mcp-macbook-scroll"
        artifactKind="chromebook-world"
        motionPreset={universeArtifactMotion.sideClosed}
        style={{ '--grayscape-accent': activeModule.color }}
        aria-label="Closed GrayScape Chromebook world artifact"
      >
        <motion.button
          type="button"
          className="grayscape-chromebook__closed-shell"
          onClick={wakeFromClick}
          onPointerDown={wakeFromPointer}
          whileHover={{ x: 12, y: -3, scale: 1.04, rotateY: -7 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.24, ease: universeArtifactEase }}
          aria-label={`Open GrayScape ${activeModule.label}`}
        >
          <PocketUniverseScene accent={activeModule.color} compact className="grayscape-chromebook__pocket" label="GrayScape pocket universe preview" />
          <span className="grayscape-chromebook__closed-glow" aria-hidden="true" />
          <span className="grayscape-chromebook__closed-lid">
            <ActiveIcon size={17} />
            <b>{grayScapeSummary.product}</b>
          </span>
          <span className="grayscape-chromebook__closed-edge" aria-hidden="true" />
          <span className="grayscape-chromebook__closed-hint">
            <ExternalLink size={13} />
            Open
          </span>
        </motion.button>
      </UniverseArtifact>
    );
  }

  return (
    <UniverseArtifact
      className="grayscape-chromebook"
      open
      accent={activeModule.color}
      motionSource="mcp-macbook-scroll"
      artifactKind="chromebook-world"
      motionPreset={universeArtifactMotion.sideOpen}
      style={{ '--grayscape-accent': activeModule.color }}
      aria-label="GrayScape Chromebook world artifact"
    >
      <motion.div
        className="grayscape-chromebook__lid"
        initial={{ rotateX: -86, y: 74, z: -22, filter: 'brightness(0.62) saturate(0.7)' }}
        animate={{ rotateX: 0, y: 0, z: 0, filter: 'brightness(1) saturate(1)' }}
        transition={{ duration: 1.05, delay: 0.12, ease: universeArtifactEase }}
      >
        <div className="grayscape-chromebook__topbar">
          <span className="grayscape-chromebook__mark">
            <ActiveIcon size={15} />
            {grayScapeSummary.product}
          </span>
          <div className="grayscape-chromebook__controls">
            <button type="button" onClick={onRefresh} disabled={busy} title="Refresh GrayScape signal" aria-label="Refresh GrayScape signal">
              <RefreshCw size={15} />
            </button>
            <button type="button" onClick={() => launchModule(activeModule.id)} title={`Open ${activeModule.label}`} aria-label={`Open ${activeModule.label}`}>
              {open ? <Maximize2 size={15} /> : <ExternalLink size={15} />}
            </button>
            {open ? (
              <button type="button" onClick={onClose} title="Fold GrayScape Chromebook" aria-label="Fold GrayScape Chromebook">
                <X size={15} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="grayscape-chromebook__screen-shell">
          <span className="grayscape-chromebook__camera" aria-hidden="true" />
          <div className="grayscape-chromebook__screen">
            <PocketUniverseScene accent={activeModule.color} className="grayscape-chromebook__screen-universe" label={`GrayScape ${activeModule.label} nested universe field`} />
            {open ? (
              <iframe
                key={activeModule.id}
                title={`GrayScape ${activeModule.label}`}
                src={getGrayScapeModuleUrl(activeModule.id)}
                className="grayscape-chromebook__frame"
                onLoad={onFrameLoad}
              />
            ) : (
              <div className="grayscape-chromebook__boot">
                <span><ActiveIcon size={18} /> {activeModule.shortLabel}</span>
                <strong>{activeModule.label}</strong>
                <p>{activeModule.response}</p>
                <button type="button" onClick={() => launchModule(activeModule.id)} aria-label={`Wake ${activeModule.label}`}>
                  <ExternalLink size={15} />
                  Wake
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div
        className="grayscape-chromebook__hinge"
        initial={{ opacity: 0.3, y: -14, scaleX: 0.54 }}
        animate={{ opacity: 1, y: 0, scaleX: 1 }}
        transition={{ duration: 0.72, delay: 0.24, ease: universeArtifactEase }}
        aria-hidden="true"
      >
        <span />
        <span />
      </motion.div>

      <motion.div
        className="grayscape-chromebook__base"
        initial={{ opacity: 0, y: -34, rotateX: 74, scaleY: 0.44 }}
        animate={{ opacity: 1, y: 0, rotateX: 54, scaleY: 1 }}
        transition={{ duration: 0.9, delay: 0.18, ease: universeArtifactEase }}
      >
        <div className="grayscape-chromebook__status">
          <span><ActiveIcon size={14} /> {activeModule.label}</span>
          <span>{tasks.open || 0} tasks</span>
          <span>{journal.entries || 0} journal</span>
          <span>{vault.items || 0} vault</span>
          <span>{command.founderMessages || 0} messages</span>
        </div>

        <div className="grayscape-chromebook__keys" aria-label="GrayScape Chromebook module keys">
          {grayScapeModules.map((module) => {
            const Icon = moduleIcons[module.id] || Crown;
            return (
              <button
                key={module.id}
                type="button"
                className={module.id === activeModule.id ? 'active' : ''}
                style={{ '--key-color': module.color }}
                onClick={() => launchModule(module.id)}
                title={`Open ${module.label}`}
                aria-label={`Open ${module.label}`}
              >
                <Icon size={14} />
                <span>{module.shortLabel}</span>
              </button>
            );
          })}
        </div>

        <div className="grayscape-chromebook__palm">
          <span>{signal?.profile?.displayName || 'Gray'} / {grayScapeSummary.edition}</span>
          <button type="button" onClick={() => launchModule(activeModule.id)} aria-label={`Enter ${activeModule.label}`}>
            <ExternalLink size={14} />
          </button>
        </div>
      </motion.div>
    </UniverseArtifact>
  );
}
