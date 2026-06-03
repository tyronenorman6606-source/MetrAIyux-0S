import React, { useMemo } from 'react';
import Joyride, { ACTIONS, EVENTS, STATUS } from 'react-joyride';
import { stepsForSurface } from './tour-registry.js';
import { useZeroOsExperienceStore } from './experience-store.js';
import { ZERO_OS_TOUR_RECEIPT_EVENT } from './celebration-contract.js';

const joyrideStyles = {
  options: {
    arrowColor: '#07111f',
    backgroundColor: '#07111f',
    beaconSize: 36,
    overlayColor: 'rgba(3, 7, 18, 0.68)',
    primaryColor: '#38bdf8',
    textColor: '#f8fafc',
    width: 420,
    zIndex: 2147483642
  },
  buttonNext: {
    borderRadius: 8,
    fontWeight: 800
  },
  buttonBack: {
    color: '#bae6fd',
    fontWeight: 800
  },
  buttonSkip: {
    color: '#cbd5e1',
    fontWeight: 800
  },
  tooltip: {
    border: '1px solid rgba(125, 211, 252, .24)',
    borderRadius: 8,
    boxShadow: '0 22px 80px rgba(0,0,0,.46)'
  }
};

function normalizeJoyrideSteps(steps) {
  return steps.map((step) => ({
    target: step.target,
    content: step.copy,
    placement: step.placement || 'bottom',
    disableBeacon: true,
    data: {
      stepId: step.id,
      completionReceiptEvent: step.completion_receipt_event,
      prerequisites: step.prerequisites || []
    }
  }));
}

function emitTourReceipt(receipt) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ZERO_OS_TOUR_RECEIPT_EVENT, { detail: receipt }));
}

export function ZeroOsTourProvider({ appId, role = '', enabled = true, children }) {
  const stepIndex = useZeroOsExperienceStore((state) => state.stepIndex);
  const runTour = useZeroOsExperienceStore((state) => state.runTour);
  const setStepIndex = useZeroOsExperienceStore((state) => state.setStepIndex);
  const stopTour = useZeroOsExperienceStore((state) => state.stopTour);
  const recordTourReceipt = useZeroOsExperienceStore((state) => state.recordTourReceipt);
  const steps = useMemo(() => normalizeJoyrideSteps(stepsForSurface(appId, role)), [appId, role]);

  function handleJoyrideCallback(data) {
    const { action, index, status, type, step } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      stopTour();
      return;
    }
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      const receipt = recordTourReceipt({
        appId,
        role,
        stepId: step?.data?.stepId || '',
        receiptEvent: step?.data?.completionReceiptEvent || ''
      });
      emitTourReceipt(receipt);
      setStepIndex(nextIndex);
    }
  }

  return React.createElement(
    React.Fragment,
    null,
    children,
    enabled && steps.length > 0 ? React.createElement(Joyride, {
      callback: handleJoyrideCallback,
      continuous: true,
      disableOverlayClose: true,
      hideCloseButton: false,
      locale: {
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip'
      },
      run: runTour,
      scrollToFirstStep: true,
      showProgress: true,
      showSkipButton: true,
      stepIndex,
      steps,
      styles: joyrideStyles
    }) : null
  );
}
