import { Fragment } from 'react';

/** Render mínimo de markdown: **negritas**, viñetas (• / - ) y saltos de línea. Sin HTML crudo. */
export default function MessageText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => {
        const bullet = /^\s*(?:[-*•])\s+/.test(line);
        const content = line.replace(/^\s*(?:[-*•])\s+/, '');
        const parts = content.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
          part.startsWith('**') && part.endsWith('**') ? <strong key={j}>{part.slice(2, -2)}</strong> : <Fragment key={j}>{part}</Fragment>,
        );
        if (!line.trim()) return <div key={i} className="h-2" />;
        return bullet ? (
          <div key={i} className="flex gap-1.5 pl-1">
            <span>•</span>
            <span>{parts}</span>
          </div>
        ) : (
          <div key={i}>{parts}</div>
        );
      })}
    </>
  );
}
