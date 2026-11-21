// The certificate: criteria, the verification code, and the passport record for the pharmolecule
// hub's Regulatory Skills Passport.
import { useStore } from '../state'
import { certificate, certificateHtml, passportRecord, PASSPORT_PAGE } from '../domain/certificate'
import { download } from '../domain/store'
import { Btn, Panel, Pill, inputCls } from './ui'

export default function Certificate() {
  const { progress, record } = useStore()
  const name = progress.name ?? '', c = certificate(progress, { name: name || 'Learner', userId: progress.userId })
  return (
    <Panel title="Certificate" sub="The six core missions passed (80 or more) and every Learn quiz passed (6 of 8 or more). With distinction: every mission passed and at least three at expert level (100)." right={<Pill tone={c.eligible ? 'green' : 'grey'}>{c.eligible ? (c.distinction ? 'with distinction' : 'earned') : 'not yet'}</Pill>}>
      <ul className="text-sm space-y-1">{c.criteria.map((x) => <li key={x.label} className="flex gap-2"><span aria-hidden className={x.met ? 'text-lab-cdsco' : 'text-lab-text-muted'}>{x.met ? '✓' : '○'}</span>{x.label}</li>)}</ul>
      <label className="block text-xs text-lab-text-muted max-w-sm">Your name, as it should appear<input className={inputCls} value={name} onChange={(e) => record((g) => { g.name = e.target.value })} /></label>
      <div className="flex flex-wrap gap-2">
        <Btn disabled={!c.eligible || !name.trim()} onClick={() => download('csr-studio-certificate.html', certificateHtml(c, { name }), 'text/html')}>Certificate (HTML)</Btn>
        <Btn tone="grey" disabled={!c.eligible || !name.trim()} onClick={() => download('csr-studio-passport-record.json', JSON.stringify(passportRecord(c, { name, userId: progress.userId }), null, 1))}>Passport record (JSON)</Btn>
      </div>
      {c.eligible && <p className="text-xs">Verification code <code className="font-mono">{c.code}</code>. Check it on the <a className="underline" href={PASSPORT_PAGE} target="_blank" rel="noreferrer">Regulatory Skills Passport</a>.</p>}
    </Panel>
  )
}
