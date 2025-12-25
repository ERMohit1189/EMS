import React from 'react';

export type FaqItem = { q: string; a: string };

export default function FaqBox({ title = 'FAQs', items = [] as FaqItem[] } : { title?: string; items?: FaqItem[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-6 bg-white border rounded-lg p-4">
      <h4 className="text-lg font-semibold mb-3">{title}</h4>
      <div className="space-y-2">
        {items.map((it, idx) => (
          <details key={idx} className="group bg-slate-50 rounded p-3" aria-expanded="false">
            <summary className="cursor-pointer font-medium">{it.q}</summary>
            <div className="mt-2 text-sm text-muted-foreground">{it.a}</div>
          </details>
        ))}
      </div>
    </div>
  );
}
