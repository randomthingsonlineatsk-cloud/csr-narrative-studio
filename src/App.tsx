import { useEffect, useRef, useState } from 'react'
import { StoreProvider, useStore } from './state'
import { NavCtx, type View } from './nav'
import { STAGE_LABEL } from './domain/project'
import { Btn, Modal, Pill } from './views/ui'
import Home from './views/Home'
import Learn from './views/Learn'
import Overview from './views/Overview'
import Shell from './views/Shell'
import Write from './views/Write'
import Outputs from './views/Outputs'
import Qc from './views/Qc'
import Export from './views/Export'
import MissionBar from './views/MissionBar'

type Page = 'home' | 'learn'
const PAGES: { id: Page; label: string; key: string }[] = [{ id: 'home', label: 'Reports and missions', key: 'h' }, { id: 'learn', label: 'Learn', key: 'l' }]
const VIEWS: { id: View; label: string; key: string }[] = [{ id: 'overview', label: 'Overview', key: 'o' }, { id: 'shell', label: 'Shell and outputs', key: 's' }, { id: 'write', label: 'Write', key: 'w' }, { id: 'outputs', label: 'Tables and listings', key: 't' }, { id: 'qc', label: 'QC and sign-off', key: 'q' }, { id: 'export', label: 'Export', key: 'x' }]
const SHORTCUTS: [string, string][] = [['?', 'Show these shortcuts'], ['g then h / l', 'Reports and missions, Learn'], ['g then o / s / w / t / q / x', 'In a report: Overview, Shell and outputs, Write, Tables and listings, QC and sign-off, Export'], ['Ctrl or ⌘ + S', 'Work is saved as you type; this confirms it'], ['Esc', 'Close a dialog']]
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))

function Shell_() {
  const { p, close, error, setError, saved } = useStore()
  const [page, setPage] = useState<Page>('home')
  const [nav, setNav] = useState<{ view: View; arg?: string }>({ view: 'overview' })
  const [keys, setKeys] = useState(false), [toast, setToast] = useState(''), [online, setOnline] = useState(() => navigator.onLine)
  const gAt = useRef(0)
  const go = (view: View, arg?: string) => { setNav({ view, arg }); window.scrollTo(0, 0) }
  useEffect(() => {
    const on = () => setOnline(navigator.onLine)
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); setToast('Your work is saved automatically in this browser.'); setTimeout(() => setToast(''), 2500); return }
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return
      if (e.key === '?') { e.preventDefault(); setKeys(true); return }
      if (e.key === 'g') { gAt.current = Date.now(); return }
      if (Date.now() - gAt.current < 1200) {
        gAt.current = 0
        const v = VIEWS.find((x) => x.key === e.key), pg = PAGES.find((x) => x.key === e.key)
        if (p && v) { e.preventDefault(); go(v.id) } else if (pg) { e.preventDefault(); if (p) close(); setPage(pg.id) }
      }
    }
    window.addEventListener('keydown', onKey); window.addEventListener('online', on); window.addEventListener('offline', on)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('online', on); window.removeEventListener('offline', on) }
  })
  const tab = (active: boolean) => `px-3 py-1.5 font-mono text-xs border-b-2 ${active ? 'border-lab-fda text-lab-fda' : 'border-transparent text-lab-text-muted hover:text-lab-text'}`
  return (
    <NavCtx.Provider value={{ ...nav, go }}>
      <div className="min-h-screen bg-lab-bg text-lab-text flex flex-col">
        <header className="border-b border-lab-line bg-lab-panel/90 sticky top-0 z-40 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="mr-auto min-w-0">
              <button className="font-mono text-sm text-lab-fda text-left" onClick={() => { close(); setPage('home') }}>CSR & Narrative Studio</button>
              <p className="text-[11px] text-lab-text-muted truncate">{p ? p.name : 'Write clinical study reports from the tables · training only'}</p>
            </div>
            {p ? <div className="flex flex-wrap items-center gap-2">{p.mission ? <Pill tone="purple">{`Mission ${p.mission.id}`}</Pill> : <Pill tone="blue">{`v${p.version} · ${STAGE_LABEL[p.stage]}`}</Pill>}<Btn tone="grey" onClick={() => { close(); setPage('home') }}>All reports</Btn><button className="text-xs text-lab-text-muted underline" onClick={() => setKeys(true)}>Shortcuts</button></div>
              : <nav className="flex flex-wrap gap-1" aria-label="Main">{PAGES.map((x) => <button key={x.id} onClick={() => setPage(x.id)} aria-current={page === x.id ? 'page' : undefined} className={tab(page === x.id)}>{x.label}</button>)}<button className="px-2 text-xs text-lab-text-muted underline" onClick={() => setKeys(true)}>Shortcuts</button></nav>}
          </div>
          {p && <nav className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto md:flex-wrap md:overflow-visible" aria-label="Report">{VIEWS.map((v) => <button key={v.id} onClick={() => go(v.id)} aria-current={nav.view === v.id ? 'page' : undefined} className={`${tab(nav.view === v.id)} whitespace-nowrap shrink-0`}>{v.label}</button>)}</nav>}
        </header>
        {error && <div role="alert" className="max-w-7xl mx-auto w-full px-4 pt-3"><div className="rounded border border-lab-red/60 bg-lab-red-soft px-3 py-2 text-sm text-lab-red flex justify-between gap-2"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss">✕</button></div></div>}
        <main className="max-w-7xl mx-auto w-full px-4 py-4 flex-1">
          {p ? <><MissionBar />{nav.view === 'overview' ? <Overview /> : nav.view === 'shell' ? <Shell /> : nav.view === 'write' ? <Write key={`${p.id}-${nav.arg ?? ''}`} /> : nav.view === 'outputs' ? <Outputs /> : nav.view === 'qc' ? <Qc /> : <Export />}</>
            : page === 'learn' ? <Learn /> : <Home onOpen={() => go('overview')} />}
        </main>
        {toast && <div role="status" className="fixed bottom-4 right-4 z-50 rounded border border-lab-line bg-lab-panel px-3 py-2 text-sm shadow">{toast}</div>}
        {keys && <Modal title="Keyboard shortcuts" onClose={() => setKeys(false)}><table className="text-sm w-full"><tbody>{SHORTCUTS.map(([k, w]) => <tr key={k} className="border-t border-lab-line/60"><td className="py-1 pr-4 font-mono whitespace-nowrap">{k}</td><td>{w}</td></tr>)}</tbody></table></Modal>}
        <footer className="border-t border-lab-line text-[11px] text-lab-text-muted">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap justify-between gap-2">
            <span>Built by Khan Gulrez Shagufa Fazal Ahmed · Apache-2.0</span>
            <span>Training only. Fictional studies, products and sponsors; not a validated system. Saved in this browser{saved ? ` · saved ${saved}` : ''}. {online ? 'Works offline after the first visit.' : 'Offline: everything still works.'}</span>
          </div>
        </footer>
      </div>
    </NavCtx.Provider>
  )
}

export default function App() { return <StoreProvider><Shell_ /></StoreProvider> }
