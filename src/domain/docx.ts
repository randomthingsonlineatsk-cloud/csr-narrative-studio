// The report as Word or HTML: E3 numbering and headings, the written text, in-text tables where
// the writer placed {{T…}}, “Not applicable” notes, and placeholders highlighted.
import { AlignmentType, PageNumber, Document, Footer, HeadingLevel, Packer, Paragraph, Table, TableCell, TableOfContents, TableRow, TextRun, WidthType } from 'docx'
import { sectionsOf, needsText } from './workflow'
import { dataOf, PLACEHOLDER, STAGE_LABEL } from './project'
import { protocolOf } from './study'
import type { Display, Project } from './types'
import type { E3Section } from './e3'
import { APPENDICES, EMPTY_INDIA, seriousTerms, TABLE6 } from './india'
import { CI } from './review'

export const FOOTER = 'Training document. Fictional study, product and sponsor. Made with the CSR & Narrative Studio; not a validated system.'
const TOKEN = /^\{\{(\w+)\}\}$/
export type Block = { kind: 'heading'; id: string; text: string; level: number } | { kind: 'para'; text: string; gap?: boolean; bold?: boolean } | { kind: 'table'; d: Display; title: string } | { kind: 'na'; text: string }

export function reportBlocks(p: Project): Block[] { return sectionsOf(p).flatMap((s) => sectionBlocks(p, s)) }
function sectionBlocks(p: Project, s: E3Section, level: number = s.level, label = `${s.id} ${s.heading}`): Block[] {
  const data = dataOf(p), out: Block[] = []
  {
    const st = p.sections[s.id]
    out.push({ kind: 'heading', id: s.id, text: label, level })
    if (st.na) { out.push({ kind: 'na', text: `Not applicable. ${st.na}` }); return out }
    if (!needsText(s)) {
      const outs = st.slots.map((id) => data.outputs.find((o) => o.id === id)).filter(Boolean)
      if (s.id === '14') for (const o of data.outputs.filter((x) => x.display)) out.push({ kind: 'table', d: o.display!, title: o.title })
      else if (outs.length) out.push({ kind: 'para', text: outs.map((o) => o!.title).join('; ') })
      else if (st.text.trim()) out.push({ kind: 'para', text: st.text })
      return out
    }
    const narr = s.id === '12.3.2' ? Object.entries(p.narratives ?? {}).filter(([, n]) => n.text.trim()).sort(([x], [y]) => x.localeCompare(y)) : []
    for (const line of st.text.split('\n').filter((l) => l.trim())) {
      const m = TOKEN.exec(line.trim()), o = m && data.outputs.find((x) => x.id === m[1])
      if (o?.display) out.push({ kind: 'table', d: o.display, title: o.title })
      else if (!(narr.length && PLACEHOLDER.test(line))) out.push({ kind: 'para', text: line, gap: PLACEHOLDER.test(line) })
    }
    for (const [, n] of narr) for (const [i, line] of n.text.split('\n').filter((l) => l.trim()).entries()) out.push({ kind: 'para', text: line, gap: /\[[^\]]+\]/.test(line), bold: i === 0 })
  }
  return out
}

/** The report in the order of NDCT Rules 2019 Table 6: its 16 headings, the E3 sections under each
 *  (numbered as in E3, so a reviewer can find them in the global report), and the India-only items. */
export function indiaBlocks(p: Project): Block[] {
  const f = { ...EMPTY_INDIA, ...p.india }, secs = sectionsOf(p), out: Block[] = []
  const para = (text: string) => { for (const line of text.split('\n').filter((l) => l.trim())) out.push({ kind: 'para', text: line }) }
  const gap = (what: string) => out.push({ kind: 'para', text: `[To be written: ${what}]`, gap: true })
  for (const h of TABLE6) {
    out.push({ kind: 'heading', id: `T6-${h.n}`, text: `${h.n}. ${h.title}`, level: 1 })
    if (h.n === 1) f.accrual.trim() ? para(`Accrual: ${f.accrual}`) : gap('the start and end of accrual')
    if (h.n === 3) f.gcp.trim() ? para(f.gcp) : gap('the statement of compliance with the GCP guidelines')
    if (h.n === 6) f.ec.trim() ? para(f.ec) : gap('the ethics committees by site, with approval dates, and the declaration on notifications')
    if (h.n === 11) f.site.trim() ? para(f.site) : gap('the participants enrolled at Indian sites')
    for (const s of secs.filter((x) => h.e3.includes(x.id))) out.push(...sectionBlocks(p, s, Math.min(4, s.level + 1) as 1 | 2 | 3 | 4, `E3 ${s.id} ${s.heading}`))
    if (h.n === 13) {
      out.push({ kind: 'heading', id: 'T6-13.1', text: '13.1 All serious adverse events, expected or unexpected', level: 2 })
      para(seriousTerms(p).length ? `Serious adverse events (Listing 16.2.7): ${seriousTerms(p).join('; ')}.` : 'No serious adverse events were reported.')
      out.push({ kind: 'heading', id: 'T6-13.2', text: '13.2 Unexpected adverse events, serious or not', level: 2 })
      f.rsi.trim() ? para(`Expectedness was judged against: ${f.rsi}`) : gap('the reference safety information used, with its edition')
      f.unexpected.trim() ? para(f.unexpected) : gap('the unexpected adverse events')
    }
    if (h.n === 16) {
      for (const a of APPENDICES) out.push({ kind: 'para', text: `(${a.id}) ${a.text} (E3 ${a.e3})` })
      const ci = p.signatures.find((s) => s.version === p.version && s.meaning === CI)
      para(ci ? `Investigator’s certificate: ${ci.name}, ${ci.role}, signed ${ci.utc.slice(0, 10)}: “${CI.split(': ')[1]}”` : '')
      if (!ci) gap('the coordinating investigator’s signature (appendix l)')
    }
  }
  return out
}
const titleLines = (p: Project) => { const t = protocolOf(p.study).title; return [t.full || p.name, `Protocol ${t.protocolId} · ${t.phase} · ${t.product}`, `Sponsor: ${t.sponsor.split('\n')[0]}`, `Report version ${p.version} · ${STAGE_LABEL[p.stage]} · ${new Date(p.updatedUtc).toISOString().slice(0, 10)}`] }

const cellPara = (t: string, bold = false) => new Paragraph({ children: [new TextRun({ text: t, bold, size: 18 })] })
function docxTable(d: Display) {
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
    new TableRow({ tableHeader: true, children: [new TableCell({ children: [cellPara('', true)] }), ...d.head.map((h) => new TableCell({ children: [cellPara(h, true)] }))] }),
    ...d.rows.map((r) => new TableRow({ children: [new TableCell({ children: [cellPara(`${'  '.repeat(r.indent ?? 0)}${r.label}`)] }), ...r.cells.map((c) => new TableCell({ children: [cellPara(c.text)] }))] })),
  ] })
}
export function reportDocx(p: Project, blocks = reportBlocks(p)) {
  const H = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4]
  const doc = new Document({ creator: 'CSR & Narrative Studio', title: p.name, features: { updateFields: true }, sections: [{
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${FOOTER} Page `, size: 16, italics: true }), new TextRun({ children: [PageNumber.CURRENT], size: 16, italics: true }), new TextRun({ text: ' of ', size: 16, italics: true }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, italics: true })] })] }) },
    children: [
      ...titleLines(p).map((t, i) => new Paragraph({ heading: i === 0 ? HeadingLevel.TITLE : undefined, spacing: { after: 120 }, children: [new TextRun(t)] })),
      new TableOfContents('Table of contents', { hyperlink: true, headingStyleRange: '1-3' }),
      ...blocks.flatMap((b) => b.kind === 'heading' ? [new Paragraph({ heading: H[b.level - 1], children: [new TextRun(b.text)] })]
        : b.kind === 'table' ? [new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: b.title, bold: true, size: 20 })] }), docxTable(b.d), ...b.d.footnotes.map((f) => new Paragraph({ children: [new TextRun({ text: f, size: 16 })] }))]
        : [new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: b.text, italics: b.kind === 'na', bold: b.kind === 'para' && b.bold, highlight: b.kind === 'para' && b.gap ? 'yellow' : undefined })] })]),
    ] }] })
  return Packer.toBlob(doc)
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
export function reportHtml(p: Project, b = reportBlocks(p)) {
  const body = b.map((x) => x.kind === 'heading' ? `<h${Math.min(4, x.level + 1)} id="s${x.id}">${esc(x.text)}</h${Math.min(4, x.level + 1)}>`
    : x.kind === 'table' ? `<figure><figcaption>${esc(x.title)}</figcaption><table><thead><tr><th></th>${x.d.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${x.d.rows.map((r) => `<tr><td style="padding-left:${0.3 + (r.indent ?? 0)}em">${esc(r.label)}</td>${r.cells.map((c) => `<td>${esc(c.text)}</td>`).join('')}</tr>`).join('')}</tbody></table>${x.d.footnotes.map((f) => `<small>${esc(f)}</small>`).join('<br>')}</figure>`
    : x.kind === 'na' ? `<p><em>${esc(x.text)}</em></p>` : `<p${x.gap ? ' class="gap"' : ''}>${x.bold ? `<b>${esc(x.text)}</b>` : esc(x.text)}</p>`).join('\n')
  const toc = b.filter((x) => x.kind === 'heading' && x.level <= 2).map((x) => x.kind === 'heading' ? `<li><a href="#s${x.id}">${esc(x.text)}</a></li>` : '').join('')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(p.name)}</title><style>body{font-family:Georgia,serif;max-width:48em;margin:2em auto;padding:0 1em;line-height:1.5;font-size:12pt}h1{font-size:1.5em}table{border-collapse:collapse;font:10pt Arial,sans-serif;margin:.4em 0}td,th{border:1px solid #999;padding:2px 6px;text-align:left}figcaption{font:bold 10pt Arial,sans-serif}.gap{background:#fff3c4}small{color:#555}footer{margin-top:3em;color:#555;font-size:10pt}</style></head><body>${titleLines(p).map((t, i) => (i === 0 ? `<h1>${esc(t)}</h1>` : `<p>${esc(t)}</p>`)).join('')}<nav><h2>Table of contents</h2><ol>${toc}</ol></nav>${body}<footer>${esc(FOOTER)}</footer></body></html>`
}
