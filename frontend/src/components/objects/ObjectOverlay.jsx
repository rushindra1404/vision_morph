import React from 'react'

// Expects objects: [{ bbox: [x,y,w,h], label: string, score?: number, mask_url?: string }]
export default function ObjectOverlay({ imageUrl, objects }) {
  if (!objects || objects.length === 0) return null
  return (
    <div className="pointer-events-none absolute inset-0">
      {objects.map((obj, idx) => {
        const [x, y, w, h] = obj.bbox || [0, 0, 0, 0]
        return (
          <div
            key={idx}
            className="absolute border border-emerald-400 rounded"
            style={{ left: x, top: y, width: w, height: h }}
            aria-label={`${obj.label || 'object'} ${obj.score ? `(${(obj.score*100).toFixed(1)}%)` : ''}`}
          >
            <div className="absolute -top-6 left-0 bg-emerald-400 text-slate-900 text-xs font-semibold px-2 py-0.5 rounded">
              {obj.label}{typeof obj.score === 'number' ? ` ${(obj.score*100).toFixed(0)}%` : ''}
            </div>
            {obj.mask_url && (
              <img alt="mask" src={obj.mask_url} className="absolute inset-0 w-full h-full opacity-30 mix-blend-screen" />
            )}
          </div>
        )
      })}
    </div>
  )
}


