import React, { useEffect, useRef, useState } from 'react'

export default function WebcamCapture({ onCapture }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let stream
    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
      } catch (e) {
        setError(e.message || 'Webcam not available')
        setActive(false)
      }
    }
    if (active) start()
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop())
    }
  }, [active])

  const handleSnap = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const w = video.videoWidth
    const h = video.videoHeight
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, w, h)
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'webcam_capture.jpg', { type: 'image/jpeg' })
        onCapture?.(file)
      }
    }, 'image/jpeg', 0.92)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700" onClick={() => setActive(a => !a)}>
          {active ? 'Stop Webcam' : 'Start Webcam'}
        </button>
        {active && (
          <button className="px-3 py-1.5 rounded bg-sky-500 text-slate-900 font-semibold" onClick={handleSnap}>Capture</button>
        )}
      </div>
      {error && <div className="text-xs text-red-300">{error}</div>}
      {active && (
        <div className="rounded overflow-hidden border border-slate-800 max-w-full">
          <video ref={videoRef} muted playsInline className="w-full h-full bg-black" />
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}


