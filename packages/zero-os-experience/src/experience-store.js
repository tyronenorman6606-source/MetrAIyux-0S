import { create } from 'zustand';

export const useZeroOsExperienceStore = create((set, get) => ({
  activeTourAppId: '',
  activeTourRole: '',
  stepIndex: 0,
  runTour: false,
  completedTourReceipts: [],
  celebrationQueue: [],
  videoModalKey: '',
  startTour: ({ appId, role = '' } = {}) => set({
    activeTourAppId: appId || '',
    activeTourRole: role || '',
    stepIndex: 0,
    runTour: Boolean(appId)
  }),
  stopTour: () => set({ runTour: false, stepIndex: 0 }),
  setStepIndex: (stepIndex) => set({ stepIndex: Math.max(0, Number(stepIndex) || 0) }),
  recordTourReceipt: (receipt) => {
    const next = {
      appId: String(receipt?.appId || ''),
      role: String(receipt?.role || ''),
      stepId: String(receipt?.stepId || ''),
      receiptEvent: String(receipt?.receiptEvent || ''),
      completedAt: receipt?.completedAt || new Date().toISOString()
    };
    set({ completedTourReceipts: [...get().completedTourReceipts, next].slice(-50) });
    return next;
  },
  enqueueCelebration: (payload) => set({ celebrationQueue: [...get().celebrationQueue, payload].slice(-10) }),
  dequeueCelebration: () => {
    const [first, ...rest] = get().celebrationQueue;
    set({ celebrationQueue: rest });
    return first || null;
  },
  openVideoModal: (videoModalKey) => set({ videoModalKey: String(videoModalKey || '') }),
  closeVideoModal: () => set({ videoModalKey: '' })
}));

export const zeroOsExperienceStoreBoundary = Object.freeze({
  scope: 'ui-only',
  allowedState: ['tour flow', 'celebration queue', 'thank-you video modal key'],
  forbiddenTruthSources: ['auth', 'payment', 'filing', 'source custody', 'provider execution', 'legal state']
});
