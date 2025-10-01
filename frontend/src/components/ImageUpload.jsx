import React, { useCallback, useRef, useState } from 'react'
import { useApp } from '../state/AppContext.jsx'
import { postDepthEstimation } from '../lib/api.js'
import WebcamCapture from './WebcamCapture.jsx'

export default function ImageUpload() {
  const { state, dispatch } = useApp()
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const onFile = useCallback((file) => {
    if (!file) return
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      dispatch({ type: 'SET_ERROR', message: 'Unsupported file type. Use JPG, PNG, or WEBP.' })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      dispatch({ type: 'SET_ERROR', message: 'File is too large. Max 10 MB.' })
      return
    }
    const url = URL.createObjectURL(file)
    dispatch({ type: 'SET_FILE', file, url })
  }, [dispatch])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    onFile(file)
  }, [onFile])

  const handleBrowse = useCallback((e) => {
    const file = e.target.files?.[0]
    onFile(file)
  }, [onFile])

  const handleSubmit = useCallback(async () => {
    if (!state.selectedFile) return
    dispatch({ type: 'SET_ERROR', message: '' })
    dispatch({ type: 'SET_PROCESSING', value: true })
    try {
      const data = await postDepthEstimation({ file: state.selectedFile, mode: state.settings.mode })
      // Expected backend response keys: original, depth_map, depth_map_colored?, point_cloud?, mesh?, objects?, json?
      dispatch({ type: 'SET_RESULT', result: data })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', message: err?.response?.data?.message || err.message || 'Request failed' })
    } finally {
      dispatch({ type: 'SET_PROCESSING', value: false })
    }
  }, [dispatch, state.selectedFile, state.settings.mode])

  return (
    <section id="uploader" className="glass rounded-xl p-4">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition ${dragOver ? 'border-sky-400 bg-slate-900' : 'border-slate-700'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        aria-label="Image upload dropzone"
      >
        <p className="mb-3">Drag and drop an image here, or</p>
        <button
          className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700"
          onClick={() => inputRef.current?.click()}
        >
          Choose File
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleBrowse}
        />
        {state.selectedFileUrl && (
          <div className="mt-4 grid gap-3 md:grid-cols-2 items-start">
            <div className="rounded overflow-hidden border border-slate-800">
              <img src={state.selectedFileUrl} alt="Selected preview" className="w-full h-full object-contain max-h-80 bg-black" />
            </div>
            <div className="text-left text-sm text-slate-300">
              <p><strong>File:</strong> {state.selectedFile?.name}</p>
              <p><strong>Size:</strong> {(state.selectedFile?.size / 1024).toFixed(1)} KB</p>
              <button disabled={state.processing} onClick={handleSubmit} className="mt-3 inline-flex items-center gap-2 bg-sky-500 text-slate-900 font-semibold px-4 py-2 rounded disabled:opacity-60">
                {state.processing && (<span className="animate-spin inline-block w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full" />)}
                {state.processing ? 'Processing…' : 'Run Depth Estimation'}
              </button>
            </div>
          </div>
        )}
        {!state.selectedFileUrl && (
          <div className="mt-5">
            <WebcamCapture onCapture={(file) => {
              const url = URL.createObjectURL(file)
              dispatch({ type: 'SET_FILE', file, url })
            }} />
          </div>
        )}
        {state.error && (
          <div role="alert" className="mt-4 text-left text-red-300">
            {state.error}
          </div>
        )}
      </div>
    </section>
  )
}


