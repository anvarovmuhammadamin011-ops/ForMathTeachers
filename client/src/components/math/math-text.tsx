import { useEffect, useRef } from 'react';
import renderMathInElement from 'katex/dist/contrib/auto-render.mjs';
import { useMemo, useState } from 'react';

const DELIMITERS = [
  { left: '$$', right: '$$', display: true },
  { left: '\\[', right: '\\]', display: true },
  { left: '$', right: '$', display: false },
  { left: '\\(', right: '\\)', display: false },
];

export function MathText({
  text,
  className = '',
  block = false,
}: {
  text: string;
  className?: string;
  block?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    host.innerHTML = '';
    const container = document.createElement(block ? 'div' : 'span');
    container.className = 'math-text';
    container.style.whiteSpace = 'pre-wrap';
    container.textContent = text;
    host.appendChild(container);
    renderMathInElement(container, {
      delimiters: DELIMITERS,
      throwOnError: false,
      strict: 'ignore',
      trust: false,
    });
  }, [text, block]);

  return <div ref={ref} className={className} />;
}

export function QuestionDiagram({
  imageUrl,
  bbox,
}: {
  imageUrl: string | null;
  bbox: { x: number; y: number; w: number; h: number } | null;
}) {
  const [loaded, setLoaded] = useState(false);
  const [natural, setNatural] = useState({ width: 0, height: 0 });

  const highlight = useMemo(() => {
    if (!natural.width || !natural.height || !bbox) return undefined;
    return {
      left: `${bbox.x * 100}%`,
      top: `${bbox.y * 100}%`,
      width: `${bbox.w * 100}%`,
      height: `${bbox.h * 100}%`,
    };
  }, [bbox, natural]);

  if (!imageUrl || !bbox) return null;

  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-white">
      <div className="relative">
        <img
          src={imageUrl}
          alt="Savol diagrammasi"
          loading="lazy"
          decoding="async"
          onLoad={(event) => {
            const target = event.currentTarget;
            setNatural({ width: target.naturalWidth, height: target.naturalHeight });
            setLoaded(true);
          }}
          className="w-full"
        />
        {loaded && highlight && (
          <div
            className="absolute border-2 border-primary/80 bg-primary/10"
            style={highlight}
            aria-hidden
          />
        )}
      </div>
      <figcaption className="border-t border-border px-3 py-1.5 text-xs text-muted-foreground">
        Diagramma (PDF betidan ajratib ko‘rsatildi)
      </figcaption>
    </figure>
  );
}
