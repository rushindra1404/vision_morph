import React from 'react'
import { useApp } from '../state/AppContext.jsx'

export default function SettingsPanel() {
  const { state, dispatch } = useApp()

  return (
    <div className="glass rounded-xl p-4 space-y-4">
      <h3 className="font-semibold">Settings</h3>

      <div className="space-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={state.settings.colormap} onChange={(e) => dispatch({ type: 'SET_SETTING', key: 'colormap', value: e.target.checked })} />
          Depth colormap default
        </label>
        <label className="block">Point size</label>
        <input
          type="range"
          min="1" max="6" step="0.5"
          value={state.settings.pointSize}
          onChange={(e) => dispatch({ type: 'SET_SETTING', key: 'pointSize', value: parseFloat(e.target.value) })}
        />
        <div className="text-xs text-slate-400">{state.settings.pointSize.toFixed(1)}</div>
      </div>

      <div className="space-y-2 text-sm">
        <label className="block">Mode</label>
        <select
          className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2"
          value={state.settings.mode}
          onChange={(e) => dispatch({ type: 'SET_SETTING', key: 'mode', value: e.target.value })}
        >
          <option value="auto">Auto</option>
          <option value="fast">Fast</option>
          <option value="high_quality">High quality</option>
        </select>
      </div>

      <div className="space-y-2 text-sm">
        <label className="block">3D View</label>
        <select
          className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2"
          value={state.settings.view3DMode}
          onChange={(e) => dispatch({ type: 'SET_SETTING', key: 'view3DMode', value: e.target.value })}
        >
          <option value="points">Point Cloud</option>
          <option value="mesh">Surface Mesh</option>
        </select>
        {state.settings.view3DMode === 'mesh' && (
          <>
            <label className="block">Mesh smoothing</label>
            <input
              type="range"
              min="0" max="2" step="0.1"
              value={state.settings.meshSmoothing}
              onChange={(e) => dispatch({ type: 'SET_SETTING', key: 'meshSmoothing', value: parseFloat(e.target.value) })}
            />
            <div className="text-xs text-slate-400">{state.settings.meshSmoothing.toFixed(1)}</div>
          </>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <label className="block">Directional light</label>
        <input
          type="range"
          min="0" max="3" step="0.1"
          value={state.settings.directionalLight}
          onChange={(e) => dispatch({ type: 'SET_SETTING', key: 'directionalLight', value: parseFloat(e.target.value) })}
        />
        <div className="text-xs text-slate-400">{state.settings.directionalLight.toFixed(1)}</div>

        <label className="block">Ambient light</label>
        <input
          type="range"
          min="0" max="1" step="0.05"
          value={state.settings.ambientLight}
          onChange={(e) => dispatch({ type: 'SET_SETTING', key: 'ambientLight', value: parseFloat(e.target.value) })}
        />
        <div className="text-xs text-slate-400">{state.settings.ambientLight.toFixed(2)}</div>
      </div>
    </div>
  )
}


