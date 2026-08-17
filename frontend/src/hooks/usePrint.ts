import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import type { UseReactToPrintOptions } from 'react-to-print';

const SKIP_LINKS = [
  'link[rel~="stylesheet"]:not([href])',
  'link[rel~="stylesheet"][href=""]',
  'link[id^="dark-mode"]',
].join(', ');

function parkSkipLinks() {
  const parked: { node: Node; parent: Node; next: Node | null }[] = [];
  document.querySelectorAll(SKIP_LINKS).forEach((node) => {
    const parent = node.parentNode;
    if (!parent) return;
    parked.push({ node, parent, next: node.nextSibling });
    parent.removeChild(node);
  });
  return () => {
    parked.forEach(({ node, parent, next }) => {
      parent.insertBefore(node, next);
    });
  };
}

/** react-to-print wrapper that skips empty/extension stylesheets (e.g. Dark Reader). */
export function usePrint(options: UseReactToPrintOptions) {
  const restoreRef = useRef<(() => void) | null>(null);
  const before = options.onBeforePrint;
  const after = options.onAfterPrint;

  return useReactToPrint({
    ...options,
    onBeforePrint: async () => {
      restoreRef.current = parkSkipLinks();
      await before?.();
    },
    onAfterPrint: () => {
      restoreRef.current?.();
      restoreRef.current = null;
      after?.();
    },
  });
}
