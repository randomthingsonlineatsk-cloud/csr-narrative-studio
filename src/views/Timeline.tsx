// A patient's timeline in study days: study drug (with any interruption), adverse events
// (serious ones in red, the selected one outlined), medications, laboratory values outside the
// reference range, and the end of study.
import { dosing, type Profile } from '../domain/narratives'
import { num, str, type Row } from '../domain/sdtm'

const W = 760, L = 150, R = 16, ROW = 18
export default function Timeline({ p, selected }: { p: Profile; selected?: Row }) {
  const d = dosing(p)
  const labs = p.lb.filter((l) => ['H', 'L', 'HIGH', 'LOW'].includes(str(l.LBNRIND)) && !['GLUC', 'HBA1C', 'CHOL', 'HCG'].includes(str(l.LBTESTCD)) && num(l.LBDY) !== null)
  const days = [1, d.last, ...p.ae.flatMap((a) => [num(a.AESTDY), num(a.AEENDY)]), ...p.cm.flatMap((c) => [num(c.CMSTDY), num(c.CMENDY)]), ...labs.map((l) => num(l.LBDY)), ...p.ds.map((x) => num(x.DSSTDY))].filter((x): x is number => x !== null && x > -60)
  const lo = Math.min(...days, 1), hi = Math.max(...days) + 3
  const x = (day: number) => L + ((day - lo) / Math.max(1, hi - lo)) * (W - L - R)
  const cms = p.cm.filter((c) => num(c.CMSTDY) !== null && (num(c.CMENDY) ?? hi) >= lo)
  const rows: { label: string; draw: (y: number) => React.ReactNode }[] = [
    { label: `Study drug (${p.arm})`, draw: (y) => d.intervals.map((iv, i) => <rect key={i} x={x(iv.from)} y={y + 3} width={Math.max(2, x((iv.to ?? hi) + 1) - x(iv.from))} height={ROW - 6} rx={2} className={iv.dose ? 'fill-lab-fda/70' : 'fill-lab-text-muted/50'}><title>{`Day ${iv.from} to Day ${iv.to ?? '…'}${iv.dose !== null ? `, ${iv.dose} ${p.doseUnit}` : ''}`}</title></rect>) },
    ...p.ae.map((a) => ({ label: str(a.AEDECOD), draw: (y: number) => { const s = num(a.AESTDY) ?? lo, e = num(a.AEENDY) ?? hi; return <rect x={x(s)} y={y + 3} width={Math.max(3, x(e + 1) - x(s))} height={ROW - 6} rx={2} className={`${a.AESER === 'Y' ? 'fill-lab-red/70' : 'fill-lab-amber/60'} ${a === selected ? 'stroke-lab-text stroke-2' : ''}`}><title>{`${str(a.AEDECOD)} (${str(a.AESEV).toLowerCase()}${a.AESER === 'Y' ? ', serious' : ''}): Day ${s} to ${num(a.AEENDY) ?? 'ongoing'}; ${str(a.AEACN).toLowerCase()}; ${str(a.AEOUT).toLowerCase()}`}</title></rect> } })),
    ...cms.map((c) => ({ label: str(c.CMDECOD || c.CMTRT).toLowerCase(), draw: (y: number) => { const s = Math.max(lo, num(c.CMSTDY)!), e = num(c.CMENDY) ?? hi; return <rect x={x(s)} y={y + 6} width={Math.max(3, x(e + 1) - x(s))} height={ROW - 12} rx={2} className="fill-lab-ema/60"><title>{`${str(c.CMDECOD || c.CMTRT)} ${num(c.CMDOSE) ?? ''} ${str(c.CMDOSU)} ${str(c.CMDOSFRQ)} for ${str(c.CMINDC)}: Day ${num(c.CMSTDY)} to ${num(c.CMENDY) ?? 'ongoing'}`}</title></rect> } })),
    ...(labs.length ? [{ label: 'Lab values out of range', draw: (y: number) => labs.map((l, i) => <circle key={i} cx={x(num(l.LBDY)!)} cy={y + ROW / 2} r={4} className="fill-lab-amber"><title>{`${str(l.LBTESTCD)} ${num(l.LBSTRESN)} ${str(l.LBSTRESU)} on Day ${num(l.LBDY)} (${num(l.LBSTNRLO) ?? 0} to ${num(l.LBSTNRHI)})`}</title></circle>) }] : []),
    ...p.ds.filter((s) => s.DSCAT === 'DISPOSITION EVENT' && num(s.DSSTDY) !== null).map((s) => ({ label: `End of study: ${str(s.DSDECOD).toLowerCase()}`, draw: (y: number) => <path d={`M${x(num(s.DSSTDY)!)} ${y + 2}v${ROW - 4}`} className="stroke-lab-text stroke-2"><title>{`${str(s.DSDECOD)} on Day ${num(s.DSSTDY)}`}</title></path> })),
  ]
  const H = rows.length * ROW + 34
  const ticks = Array.from({ length: 7 }, (_, i) => Math.round(lo + ((hi - lo) * i) / 6))
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[640px] w-full text-[10px]" role="img" aria-label={`Timeline of ${p.usubjid} in study days`}>
        {ticks.map((t) => <g key={t}><path d={`M${x(t)} 4V${H - 18}`} className="stroke-lab-line" /><text x={x(t)} y={H - 6} textAnchor="middle" className="fill-lab-text-muted">{`Day ${t}`}</text></g>)}
        {rows.map((r, i) => <g key={i}><text x={4} y={i * ROW + 16} className="fill-lab-text">{r.label.length > 26 ? `${r.label.slice(0, 25)}…` : r.label}</text>{r.draw(i * ROW + 4)}</g>)}
      </svg>
      {p.dispensing && <p className="text-[11px] text-lab-amber">This study’s dosing record (EX) holds the bottles dispensed at each visit, not the days dosed: an interruption is on the AE form (action taken), not shown as a break here.</p>}
      <p className="text-[11px] text-lab-text-muted">Blue: study drug taken (grey for placebo); gaps are interruptions. Red: serious adverse events; amber: other adverse events; purple: medications. Hover for details.</p>
    </div>
  )
}
