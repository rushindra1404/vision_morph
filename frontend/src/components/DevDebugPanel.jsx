import React, { useMemo, useState } from 'react'
import { useApp } from '../state/AppContext.jsx'

export default function DevDebugPanel() {
  const { state } = useApp()
  const [open, setOpen] = useState(import.meta.env.DEV)
  const pretty = useMemo(() => JSON.stringify(state.result, null, 2), [state.result])
  if (!open) return (
    <button className="fixed bottom-4 right-4 text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700" onClick={() => setOpen(true)}>Debug</button>
  )
  return (
    <div className="fixed bottom-4 right-4 w-[28rem] max-w-[90vw] h-64 glass rounded-xl p-3 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Debug</div>
        <button className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700" onClick={() => setOpen(false)}>Close</button>
      </div>
      <div className="w-full h-[calc(100%-2rem)] overflow-auto text-xs">
        <pre className="whitespace-pre-wrap">{pretty}</pre>
      </div>
    </div>
  )
}


