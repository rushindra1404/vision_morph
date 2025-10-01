import React from 'react'

export default function Hero() {
  const demos = [
    '/demos/demo1.svg',
    '/demos/demo2.svg',
    '/demos/demo1.svg',
    '/demos/demo2.svg',
    '/demos/demo1.svg',
    '/demos/demo2.svg',
  ]
  return (
    <section className="border-b border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div>
            <h1 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4">Depth Estimation for Everyone</h1>
            <p className="text-slate-300 mb-6">Upload an image to generate a 2D depth map, explore a 3D point cloud/mesh, and view detected objects. Built for researchers, developers, and curious minds.</p>
            <a href="#uploader" className="inline-block bg-sky-500 hover:bg-sky-400 text-slate-900 font-semibold px-5 py-3 rounded-md">Try it now</a>
          </div>
          <div className="glass rounded-xl p-4 grid grid-cols-3 gap-2">
            {demos.map((src, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded border border-slate-800">
                <img src={src} alt={`Demo ${i+1}`} loading="lazy" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}


