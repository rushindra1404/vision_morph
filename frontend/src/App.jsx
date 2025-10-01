import React from 'react'
import { AppProvider } from './state/AppContext.jsx'
import Hero from './components/Hero.jsx'
import ImageUpload from './components/ImageUpload.jsx'
import Results from './components/Results.jsx'
import SettingsPanel from './components/SettingsPanel.jsx'
import DevDebugPanel from './components/DevDebugPanel.jsx'

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-full flex flex-col">
        <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
            <a href="#" className="text-lg font-semibold tracking-tight">Vision Morph</a>
            <nav className="text-sm text-slate-300">
              <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white">GitHub</a>
            </nav>
          </div>
        </header>

        <main className="flex-1">
          <Hero />
          <section className="mx-auto max-w-7xl px-4 grid gap-6 md:grid-cols-3 items-start pb-10">
            <div className="md:col-span-2 space-y-6">
              <ImageUpload />
              <Results />
            </div>
            <aside className="md:col-span-1">
              <SettingsPanel />
            </aside>
          </section>
        </main>

        <footer className="border-t border-slate-800">
          <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-slate-400">
            © {new Date().getFullYear()} Vision Morph. All rights reserved.
          </div>
        </footer>
        <DevDebugPanel />
      </div>
    </AppProvider>
  )
}


