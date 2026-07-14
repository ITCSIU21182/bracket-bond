'use client';

import { useEffect, useId, useRef, useState } from 'react';

// Mermaid pulls in ~600 KB of JS — load it client-side, lazily, only on pages
// that use it. The rendered SVG is swapped straight into the DOM.
export function Mermaid({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, '');
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mermaid = (await import('mermaid')).default;
      const theme =
        typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
          ? 'dark'
          : 'default';
      mermaid.initialize({ startOnLoad: false, theme, securityLevel: 'loose' });
      try {
        const { svg } = await mermaid.render(`mermaid-${id}`, chart.trim());
        if (!cancelled) setSvg(svg);
      } catch (err) {
        if (!cancelled) {
          setSvg(`<pre style="color:#dc2626">Mermaid render failed: ${err instanceof Error ? err.message : String(err)}</pre>`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  return (
    <div
      ref={ref}
      className="my-6 flex justify-center overflow-x-auto rounded-lg border border-fd-border bg-fd-card p-4"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
