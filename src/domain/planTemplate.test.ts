import { describe, expect, it } from 'vitest';
// Saved by Excel from the template, with one row typed in: deflated parts and shared strings.
import excelSaved from '../test/fixtures/plan-template-excel.xlsx.b64?raw';
import { buildPlanTemplate, machineLabels, parsePlanSheets, readPlanFile, type PlanDraft, type TemplateMachine } from './planTemplate';
import { columnName, crc32, readXlsx, unzip, writeXlsx } from './xlsx';

const machines: TemplateMachine[] = [
  { id: 'tg-chest-press', name: 'Chest Press', brand: 'Technogym', line: 'Selection 900', muscleGroup: 'chest', custom: false },
  { id: 'lf-leg-extension', name: 'Leg Extension', brand: 'Life Fitness', line: 'Insignia', muscleGroup: 'legs', custom: false },
  { id: 'mx-leg-extension', name: 'Leg Extension', brand: 'Matrix', line: 'Versa', muscleGroup: 'legs', custom: false },
  { id: 'custom-1', name: 'Old Row', muscleGroup: 'back', custom: true },
];

const example: PlanDraft = {
  name: 'Example plan',
  tagline: 'Two days',
  description: 'Upper and lower',
  goal: 'strength',
  level: 'intermediate',
  daysPerWeek: 2,
  minutes: 50,
  days: [
    { name: 'Upper', items: [{ machineId: 'tg-chest-press', targetSets: 4, targetReps: 6, scheme: 'pyramid', targetWeightKg: 42.5 }, { machineId: 'custom-1', targetSets: 3, targetReps: 10 }] },
    { name: 'Lower', items: [{ machineId: 'mx-leg-extension', targetSets: 3, targetReps: 12, scheme: 'dropSet' }] },
  ],
};

const sheets = (plans: string[][], exercises: string[][]) =>
  new Map([
    ['Plans', [['Plan name', 'Tagline', 'Description', 'Goal', 'Level', 'Days per week', 'Minutes per workout'], ...plans]],
    ['Exercises', [['Plan name', 'Day name', 'Machine', 'Sets', 'Reps', 'Set style', 'Target weight (kg)'], ...exercises]],
  ]);

describe('xlsx', () => {
  it('names columns and computes CRC-32', () => {
    expect([0, 25, 26, 51, 701].map(columnName)).toEqual(['A', 'Z', 'AA', 'AZ', 'ZZ']);
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('reads back what it writes, including escaped text and gaps', async () => {
    const bytes = writeXlsx({ sheets: [{ name: 'S', rows: [['a & <b>', null, 3], [], ['x']] }] });
    const read = await readXlsx(bytes);
    expect(read.get('S')).toEqual([['a & <b>', '', '3'], [], ['x']]);
  });

  it('reads deflated entries and shared strings, as Excel saves them', async () => {
    const enc = new TextEncoder();
    const deflate = async (text: string) =>
      new Uint8Array(await new Response(new Blob([enc.encode(text)]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
    // Build a stored workbook, then swap in a deflated sheet with shared strings.
    const stored = await unzip(writeXlsx({ sheets: [{ name: 'Plans', rows: [] }] }));
    const files = new Map(stored);
    files.set('xl/sharedStrings.xml', enc.encode('<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Hello</t></si><si><r><t>Ri</t></r><r><t>ch</t></r></si></sst>'));
    files.set('xl/worksheets/sheet1.xml', enc.encode('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="2"><c r="B2" t="s"><v>1</v></c><c r="C2"><v>7</v></c><c r="D2" t="s"><v>0</v></c></row></sheetData></worksheet>'));
    const zip = await zipDeflated(files, deflate);
    expect((await readXlsx(zip)).get('Plans')).toEqual([[], ['', 'Rich', '7', 'Hello']]);
  });
});

describe('plan template', () => {
  it('labels repeated machine names with their brand', () => {
    const labels = machineLabels(machines);
    expect(labels.get('lf-leg-extension')).toBe('Leg Extension · Life Fitness Insignia');
    expect(labels.get('custom-1')).toBe('Old Row · My machine');
  });

  it('round-trips the example plan through the template', async () => {
    const result = await readPlanFile(buildPlanTemplate(machines, example), machines);
    expect(result.errors).toEqual([]);
    expect(result.plans).toEqual([example]);
  });

  it('has lookup sheets with every machine and option list', async () => {
    const read = await readXlsx(buildPlanTemplate(machines));
    expect([...read.keys()]).toEqual(['Instructions', 'Plans', 'Exercises', 'Machines', 'Lists']);
    expect(read.get('Machines')?.slice(1).map((r) => r[1])).toEqual(machines.map((m) => m.id));
    const lists = read.get('Lists') ?? [];
    expect(lists.slice(1).map((r) => r[1]).filter(Boolean)).toEqual(['muscle', 'strength', 'toning', 'health']);
    expect(lists.slice(1).map((r) => r[7])).toEqual(['straight', 'pyramid', 'reversePyramid', 'topSets', 'dropSet', 'lastMax']);
  });

  it('accepts codes, IDs, unique names and blanks with defaults', () => {
    const result = parsePlanSheets(
      sheets([['Quick', '', '', 'TONING', '', '', '']], [
        ['quick', 'A', 'Chest Press', '3', '10', '', ''],
        ['Quick', 'a', 'custom-1', '2', '12', 'lastMax', '20'],
        ['Quick', 'B', 'mx-leg-extension', '3', '12', 'Top sets + back-off', ''],
      ]),
      machines,
    );
    expect(result.errors).toEqual([]);
    expect(result.plans[0]).toMatchObject({
      name: 'Quick',
      goal: 'toning',
      level: 'beginner',
      daysPerWeek: 2,
      minutes: 45,
      days: [
        { name: 'A', items: [{ machineId: 'tg-chest-press', targetSets: 3, targetReps: 10 }, { machineId: 'custom-1', targetWeightKg: 20, scheme: 'lastMax' }] },
        { name: 'B', items: [{ machineId: 'mx-leg-extension', scheme: 'topSets' }] },
      ],
    });
  });

  it('reports every problem with its sheet and row, and imports nothing', () => {
    const result = parsePlanSheets(
      sheets(
        [
          ['P', '', '', 'Fly', 'Pro', '9', ''],
          ['P', '', '', 'Get stronger', '', '', ''],
          ['Empty', '', '', 'Get stronger', '', '', ''],
        ],
        [
          ['P', 'A', 'Leg Extension', '0', '10', 'Wavy', '-1'],
          ['Nope', 'A', 'Chest Press', '3', '10', '', ''],
          ['P', 'A', 'Chest Press', '3', '10', '', ''],
          ['P', 'A', 'Chest Press', '3', '10', '', ''],
        ],
      ),
      machines,
    );
    expect(result.plans).toEqual([]);
    expect(result.errors).toEqual([
      'Plans row 2: Goal "Fly" is not in the list',
      'Plans row 2: Level "Pro" is not in the list',
      'Plans row 2: Days per week must be a whole number from 1 to 7',
      'Plans row 3: plan "P" appears twice',
      'Exercises row 2: machine "Leg Extension" is not on the Machines sheet',
      'Exercises row 2: Sets must be a whole number from 1 to 10',
      'Exercises row 2: Set style "Wavy" is not in the list',
      'Exercises row 2: Target weight (kg) must be a number from 0 to 500',
      'Exercises row 3: plan "Nope" is not on the Plans sheet',
      'Exercises row 5: "Chest Press" is already in A',
      'Plan "Empty" has no exercises on the Exercises sheet',
    ]);
  });

  it('reads a template that Excel filled in and saved', async () => {
    const bytes = Uint8Array.from(atob(excelSaved.trim()), (c) => c.charCodeAt(0));
    const result = await readPlanFile(bytes, [
      { id: 'a', name: 'Chest Press', brand: 'Technogym', line: 'Selection 900', muscleGroup: 'chest', custom: false },
      { id: 'b', name: 'Row', muscleGroup: 'back', custom: true },
    ]);
    expect(result.errors).toEqual([]);
    expect(result.plans[0]?.days).toEqual([
      { name: 'A', items: [{ machineId: 'a', targetSets: 3, targetReps: 10, scheme: 'pyramid', targetWeightKg: 40 }] },
      { name: 'B', items: [{ machineId: 'b', targetSets: 2, targetReps: 12 }] },
    ]);
  });

  it('rejects files that are not the template', async () => {
    expect((await readPlanFile(new TextEncoder().encode('hello'), machines)).errors).toEqual([
      'This is not an Excel (.xlsx) file. Download the template and fill it in.',
    ]);
    expect(parsePlanSheets(new Map([['Sheet1', []]]), machines).errors).toEqual([
      'The file needs the Plans and Exercises sheets from the template.',
    ]);
    expect(parsePlanSheets(new Map([['Plans', [['Plan name']]], ['Exercises', [[]]]]), machines).errors[0]).toMatch(
      /^Plans sheet is missing columns: Tagline/,
    );
  });
});

/** A ZIP writer for tests that deflates every entry. */
async function zipDeflated(
  files: Map<string, Uint8Array>,
  deflate: (text: string) => Promise<Uint8Array>,
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const [name, data] of files) {
    const nameBytes = enc.encode(name);
    const packed = await deflate(new TextDecoder().decode(data));
    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(8, 8, true);
    lv.setUint32(14, crc32(data), true);
    lv.setUint32(18, packed.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    const entry = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(entry.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(10, 8, true);
    cv.setUint32(16, crc32(data), true);
    cv.setUint32(20, packed.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    entry.set(nameBytes, 46);
    parts.push(local, packed);
    central.push(entry);
    offset += local.length + packed.length;
  }
  const size = central.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.size, true);
  ev.setUint16(10, files.size, true);
  ev.setUint32(12, size, true);
  ev.setUint32(16, offset, true);
  const all = [...parts, ...central, end];
  const out = new Uint8Array(all.reduce((n, c) => n + c.length, 0));
  let at = 0;
  for (const c of all) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}
