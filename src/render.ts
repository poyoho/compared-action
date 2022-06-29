export interface TimeRecord {
  timing: number
}

export interface DiffRecord extends TimeRecord {
  diff: number
}

export type Records = Record<string, TimeRecord>

const total = (record: Records) =>
  Object.values(record).reduce((sum, info) => (sum += info.timing), 0)

const diffRecord = (o: Records, n: Records): [string, DiffRecord][] => {
  return Object.entries(n).map<[string, DiffRecord]>(([key, val]) => {
    ;(val as DiffRecord).diff = val.timing - (o[key].timing || 0)
    return [key, val as DiffRecord]
  })
}

const formatDiff = (diff: number) => `${diff > 0 ? `+` : `-`}${diff}`

const formatTable = (
  o: Records,
  n: Records,
  fields: string[],
  sortFn: (a: DiffRecord, b: DiffRecord) => number
) => {
  return diffRecord(o, n)
    .sort((a, b) => sortFn(a[1], b[1]))
    .slice(0, 5)
    .map(
      ([key, val]) =>
        `|${key}|${formatFields(val as any, fields)}${val.timing}|${formatDiff(
          val.diff
        )}|`
    )
    .join('\n')
}

const formatHeader = (fields: string[]) => `|${fields.join('|')}|`
const formatLine = (fields: string[]) =>
  `|${fields.map(() => '----').join('|')}|`

const formatFields = (info: Record<string, string>, fields: string[]) => {
  const res = fields.map((field) => info[field]).join('|')
  if (res != '') {
    return `|${res}|`
  }
  return res
}

export function formatComment(
  oRecord: Records,
  nRecord: Records,
  fields: string[]
) {
  const nTotalServe = total(nRecord)
  const tableHeader = ['file', ...fields, 'timing', 'diff']
  return [
    `total: ${nTotalServe}ms`,
    `total diff: ${formatDiff(nTotalServe - total(oRecord))}ms`,
    `\n<details><summary> Toggle detail... </summary>`,
    '\n### 🗒️ Top 5 (diff)\n',
    formatHeader(tableHeader),
    formatLine(tableHeader),
    formatTable(oRecord, nRecord, fields, (a, b) => a.diff - a.diff),
    `\n</details>`
  ].join('\n')
}
