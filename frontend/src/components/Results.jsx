import React, { useMemo, useState } from 'react'
import { useApp } from '../state/AppContext.jsx'
import Depth3DViewer from './three/Depth3DViewer.jsx'
import ObjectOverlay from './objects/ObjectOverlay.jsx'

export default function Results() {
  const { state } = useApp()
  const [showColorMap, setShowColorMap] = useState(true)

  const originalUrl = state.result?.original_url || state.result?.original || state.result?.originalImage
  const depthMapGray = state.result?.depth_map_gray || state.result?.depth_map || state.result?.depthMap
  const depthMapColor = state.result?.depth_map_colored || state.result?.depthMapColor
  const depthFor3d = state.result?.depth_3d || state.result?.point_cloud || state.result?.mesh

  const canShow = !!state.result
  const depthShown = useMemo(() => (showColorMap && depthMapColor) ? depthMapColor : depthMapGray, [showColorMap, depthMapColor, depthMapGray])

  if (!canShow) return null

  return (
    <section className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-4">
          <h3 className="font-semibold mb-3">Original</h3>
          {originalUrl ? (
            <div className="relative">
              <img src={originalUrl} alt="Original" className="w-full max-h-[28rem] object-contain bg-black rounded" />
              {state.result?.objects && (
                <ObjectOverlay imageUrl={originalUrl} objects={state.result.objects} />
              )}
            </div>
          ) : (
            <p className="text-slate-400">No original image URL in response.</p>
          )}
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Depth Map</h3>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showColorMap} onChange={(e) => setShowColorMap(e.target.checked)} />
              Color map
            </label>
          </div>
          {depthShown ? (
            <img src={depthShown} alt="Depth map" className="w-full max-h-[28rem] object-contain bg-black rounded" />
          ) : (
            <p className="text-slate-400">No depth map in response.</p>
          )}
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">3D Depth Visualization</h3>
          <div className="text-sm text-slate-400">Orbit: drag • Zoom: wheel • Pan: right-drag</div>
        </div>
        <div className="h-[420px]">
          <Depth3DViewer depthData={state.result} settings={state.settings} />
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        <h3 className="font-semibold mb-3">Downloads</h3>
        <div className="flex flex-wrap gap-3 text-sm">
          {originalUrl && (
            <a className="px-3 py-2 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700" href={originalUrl} download>Download Original</a>
          )}
          {depthMapGray && (
            <a className="px-3 py-2 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700" href={depthMapGray} download>Download Depth (Gray)</a>
          )}
          {depthMapColor && (
            <a className="px-3 py-2 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700" href={depthMapColor} download>Download Depth (Color)</a>
          )}
          {state.result?.ply_url && (
            <a className="px-3 py-2 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700" href={state.result.ply_url} download>Download PLY</a>
          )}
          {state.result?.gltf_url && (
            <a className="px-3 py-2 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700" href={state.result.gltf_url} download>Download glTF</a>
          )}
          {state.result?.json_url && (
            <a className="px-3 py-2 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700" href={state.result.json_url} download>Download JSON</a>
          )}
          {state.result && (
            <button
              className="px-3 py-2 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700"
              onClick={() => {
                const blob = new Blob([JSON.stringify(state.result, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'result.json'
                a.click()
                URL.revokeObjectURL(url)
              }}
            >Download JSON (inline)</button>
          )}
          {state.result?.share_url && (
            <a className="px-3 py-2 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700" href={state.result.share_url} target="_blank" rel="noreferrer">Share link</a>
          )}
        </div>
      </div>
    </section>
  )
}


