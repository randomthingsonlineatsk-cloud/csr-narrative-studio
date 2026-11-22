import { expect, test } from 'vitest'
import { drillRows, markSentence, modelSentence, spot } from '../src/domain/drills'
test('all rows', () => { const bad: string[] = []; drillRows().forEach((d, i) => { if (!markSentence(d, modelSentence(d)).ok) bad.push(modelSentence(d) + JSON.stringify(markSentence(d, modelSentence(d)))); if (markSentence(d, spot(d, i).text).ok) bad.push('SPOT ' + spot(d, i).text) }); console.log(drillRows().length, bad.slice(0, 5)); expect(bad).toEqual([]) })
