/*
 * A small .xlsx writer and reader, enough for the plan template. No dependency.
 * Writing uses an uncompressed ZIP with inline strings. Reading accepts what Excel,
 * LibreOffice, Numbers and Google Sheets save: stored or deflated entries, shared or
 * inline strings, and namespaced or plain element names.
 */

export type CellValue = string | number | null;

export type Validation =
  | { type: 'list'; range: string; source: string; error?: string }
  | { type: 'whole' | 'decimal'; range: string; min: number; max: number; error?: string };

export interface SheetSpec {
  name: string;
  rows: CellValue[][];
  widths?: number[];
  /** Styles row 1 as a header and keeps it in view while scrolling. */
  header?: boolean;
  validations?: Validation[];
}

export interface WorkbookSpec {
  sheets: SheetSpec[];
  /** Named ranges, for example `{ name: 'Goals', ref: 'Lists!$A$2:$A$5' }`. */
  names?: { name: string; ref: string }[];
}

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// ---------- ZIP ----------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const b of bytes) crc = (CRC_TABLE[(crc ^ b) & 0xff] as number) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  // 1 Jan 2025, 00:00 in DOS format, so the same input gives the same bytes.
  const dosTime = 0;
  const dosDate = ((2025 - 1980) << 9) | (1 << 5) | 1;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.data);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, dosTime, true);
    lv.setUint16(12, dosDate, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, file.data.length, true);
    lv.setUint32(22, file.data.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);

    const entry = new Uint8Array(46 + name.length);
    const cv = new DataView(entry.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, dosTime, true);
    cv.setUint16(14, dosDate, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, file.data.length, true);
    cv.setUint32(24, file.data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    entry.set(name, 46);

    chunks.push(local, file.data);
    central.push(entry);
    offset += local.length + file.data.length;
  }

  const centralSize = central.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const all = [...chunks, ...central, end];
  const out = new Uint8Array(all.reduce((n, c) => n + c.length, 0));
  let at = 0;
  for (const c of all) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export class XlsxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'XlsxError';
  }
}

/** Reads every file in a ZIP archive. */
export async function unzip(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new XlsxError('not a zip');
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();
  const files = new Map<string, Uint8Array>();
  for (let i = 0; i < count; i += 1) {
    if (view.getUint32(at, true) !== 0x02014b50) throw new XlsxError('bad zip directory');
    const method = view.getUint16(at + 10, true);
    const size = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const localAt = view.getUint32(at + 42, true);
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    at += 46 + nameLength + extraLength + commentLength;

    const dataAt = localAt + 30 + view.getUint16(localAt + 26, true) + view.getUint16(localAt + 28, true);
    const raw = bytes.subarray(dataAt, dataAt + size);
    if (method === 0) files.set(name, raw);
    else if (method === 8) files.set(name, await inflateRaw(raw));
    else throw new XlsxError(`unsupported zip method ${method}`);
  }
  return files;
}

// ---------- Writing ----------

const escapeXml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Characters XML 1.0 does not allow.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

export function columnName(index: number): string {
  let name = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  }
  return name;
}

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

// Style 0: normal. 1: header (bold white on brand green). 2: wrapped text.
const STYLES = `${XML}<styleSheet xmlns="${NS}">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF117456"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function cellXml(value: CellValue, ref: string, style: number): string {
  const s = style ? ` s="${style}"` : '';
  if (value === null || value === '') return style ? `<c r="${ref}"${s}/>` : '';
  if (typeof value === 'number') return `<c r="${ref}"${s}><v>${value}</v></c>`;
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function validationXml(v: Validation): string {
  const error = v.error ? ` errorTitle="Not allowed" error="${escapeXml(v.error)}"` : '';
  if (v.type === 'list') {
    return `<dataValidation type="list" allowBlank="1" showErrorMessage="1"${error} sqref="${v.range}"><formula1>${escapeXml(v.source)}</formula1></dataValidation>`;
  }
  return `<dataValidation type="${v.type}" operator="between" allowBlank="1" showErrorMessage="1"${error} sqref="${v.range}"><formula1>${v.min}</formula1><formula2>${v.max}</formula2></dataValidation>`;
}

function sheetXml(sheet: SheetSpec, selected: boolean): string {
  const tab = selected ? ' tabSelected="1"' : '';
  const pane = sheet.header
    ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>'
    : '';
  const cols = sheet.widths?.length
    ? `<cols>${sheet.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : '';
  const rows = sheet.rows
    .map((row, r) => {
      const style = sheet.header && r === 0 ? 1 : 0;
      const cells = row.map((v, c) => cellXml(v, `${columnName(c)}${r + 1}`, style)).join('');
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join('');
  const validations = sheet.validations?.length
    ? `<dataValidations count="${sheet.validations.length}">${sheet.validations.map(validationXml).join('')}</dataValidations>`
    : '';
  return `${XML}<worksheet xmlns="${NS}" xmlns:r="${REL_NS}"><sheetViews><sheetView workbookViewId="0"${tab}>${pane}</sheetView></sheetViews>${cols}<sheetData>${rows}</sheetData>${validations}</worksheet>`;
}

export function writeXlsx(spec: WorkbookSpec): Uint8Array {
  const encoder = new TextEncoder();
  const sheets = spec.sheets;
  const contentTypes = `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join('')}</Types>`;
  const rootRels = `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const names = spec.names?.length
    ? `<definedNames>${spec.names.map((n) => `<definedName name="${escapeXml(n.name)}">${escapeXml(n.ref)}</definedName>`).join('')}</definedNames>`
    : '';
  const workbook = `${XML}<workbook xmlns="${NS}" xmlns:r="${REL_NS}"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${sheets
    .map((s, i) => `<sheet name="${escapeXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join('')}</sheets>${names}</workbook>`;
  const workbookRels = `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
    )
    .join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

  return zipStore([
    { name: '[Content_Types].xml', data: encoder.encode(contentTypes) },
    { name: '_rels/.rels', data: encoder.encode(rootRels) },
    { name: 'xl/workbook.xml', data: encoder.encode(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(workbookRels) },
    { name: 'xl/styles.xml', data: encoder.encode(STYLES) },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: encoder.encode(sheetXml(s, i === 0)) })),
  ]);
}

// ---------- Reading ----------

function parseXml(bytes: Uint8Array | undefined, part: string): Document {
  if (!bytes) throw new XlsxError(`missing ${part}`);
  const doc = new DOMParser().parseFromString(new TextDecoder().decode(bytes), 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) throw new XlsxError(`bad ${part}`);
  return doc;
}

const all = (node: Document | Element, name: string) => Array.from(node.getElementsByTagNameNS('*', name));

function textOf(node: Element): string {
  // Rich text keeps its runs in <r><t>; phonetic hints (<rPh>) are not part of the value.
  return all(node, 't')
    .filter((t) => (t.parentElement?.localName ?? '') !== 'rPh')
    .map((t) => t.textContent ?? '')
    .join('');
}

function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/i.exec(ref)?.[0].toUpperCase() ?? '';
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function resolveTarget(target: string): string {
  if (target.startsWith('/')) return target.slice(1);
  const parts = `xl/${target}`.split('/');
  const out: string[] = [];
  for (const p of parts) {
    if (p === '..') out.pop();
    else if (p !== '.') out.push(p);
  }
  return out.join('/');
}

/** Returns each sheet as rows of trimmed text cells, keyed by sheet name. */
export async function readXlsx(bytes: Uint8Array): Promise<Map<string, string[][]>> {
  const files = await unzip(bytes);
  const workbook = parseXml(files.get('xl/workbook.xml'), 'workbook');
  const rels = parseXml(files.get('xl/_rels/workbook.xml.rels'), 'workbook relationships');
  const targets = new Map(all(rels, 'Relationship').map((r) => [r.getAttribute('Id'), r.getAttribute('Target') ?? '']));
  const shared = files.has('xl/sharedStrings.xml')
    ? all(parseXml(files.get('xl/sharedStrings.xml'), 'shared strings'), 'si').map(textOf)
    : [];

  const sheets = new Map<string, string[][]>();
  for (const sheet of all(workbook, 'sheet')) {
    const id =
      sheet.getAttributeNS(REL_NS, 'id') ??
      Array.from(sheet.attributes).find((a) => a.localName === 'id')?.value ??
      null;
    const target = targets.get(id);
    if (!target) continue;
    const part = resolveTarget(target);
    const doc = parseXml(files.get(part), part);
    const rows: string[][] = [];
    let nextRow = 0;
    for (const row of all(doc, 'row')) {
      const r = Number(row.getAttribute('r') ?? nextRow + 1) - 1;
      nextRow = r + 1;
      const cells: string[] = [];
      let nextCol = 0;
      for (const c of all(row, 'c')) {
        const ref = c.getAttribute('r');
        const col = ref ? columnIndex(ref) : nextCol;
        nextCol = col + 1;
        const type = c.getAttribute('t');
        const v = all(c, 'v')[0]?.textContent ?? '';
        let value: string;
        if (type === 's') value = shared[Number(v)] ?? '';
        else if (type === 'inlineStr') value = textOf(all(c, 'is')[0] ?? c);
        else value = v;
        while (cells.length < col) cells.push('');
        cells[col] = value.trim();
      }
      while (rows.length < r) rows.push([]);
      rows[r] = cells;
    }
    sheets.set(sheet.getAttribute('name') ?? '', rows);
  }
  return sheets;
}
