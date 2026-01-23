import { useEffect } from 'react';

// Chakra tooltips on touch devices (Apple Vision Pro, tablets) don't close properly because they rely on
// pointerleave events which don't fire correctly on touch. This causes tooltips to stack up and clutter the UI.
// We fix it by dispatching Chakra's internal close event on any touch interaction.

const closeEventName = 'chakra-ui:close-tooltip';

export const useCloseChakraTooltipsOnTouch = () => {
  useEffect(() => {
    const closeTooltips = () => {
      document.dispatchEvent(new window.CustomEvent(closeEventName));
    };

    // Close on touch events
    document.addEventListener('touchstart', closeTooltips, { passive: true });

    // Close on pointer events for Vision Pro (uses pointerType='touch')
    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        closeTooltips();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown, { passive: true });

    return () => {
      document.removeEventListener('touchstart', closeTooltips);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);
};
