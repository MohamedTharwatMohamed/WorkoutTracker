import {
  MUSCLE_GROUPS,
  PLAN_GOALS,
  PLAN_LEVELS,
  SET_SCHEMES,
  type BaseRecord,
  type CustomPlan,
  type MuscleGroup,
  type PlanGoal,
  type PlanLevel,
  type RoutineItem,
  type SetScheme,
} from '../db/types';
import { strings } from '../strings';
import { readXlsx, writeXlsx, type CellValue, type SheetSpec } from './xlsx';

export type PlanDraft = Omit<CustomPlan, keyof BaseRecord>;

export interface TemplateMachine {
  id: string;
  name: string;
  brand?: string;
  line?: string;
  muscleGroup: MuscleGroup;
  custom: boolean;
}

export const LIMITS = {
  daysPerWeek: { min: 1, max: 7 },
  minutes: { min: 5, max: 240 },
  sets: { min: 1, max: 10 },
  reps: { min: 1, max: 100 },
  weightKg: { min: 0, max: 500 },
} as const;

export const DEFAULT_MINUTES = 45;
const MAX_ROWS = 500;
const t = strings.planTemplate;

export const SHEETS = {
  instructions: 'Instructions',
  plans: 'Plans',
  exercises: 'Exercises',
  machines: 'Machines',
  lists: 'Lists',
} as const;

const PLAN_COLUMNS = ['Plan name', 'Tagline', 'Description', 'Goal', 'Level', 'Days per week', 'Minutes per workout'] as const;
const EXERCISE_COLUMNS = ['Plan name', 'Day name', 'Machine', 'Sets', 'Reps', 'Set style', 'Target weight (kg)'] as const;

/** The text shown in the Machine drop-down, for example "Chest Press · Technogym Selection 900". */
export function machineLabels(machines: TemplateMachine[]): Map<string, string> {
  const labels = new Map<string, string>();
  const used = new Set<string>();
  for (const m of machines) {
    const source = m.custom ? t.myMachine : [m.brand, m.line].filter(Boolean).join(' ');
    let label = source ? `${m.name} · ${source}` : m.name;
    for (let n = 2; used.has(label.toLowerCase()); n += 1) label = `${m.name} · ${source} (${n})`;
    used.add(label.toLowerCase());
    labels.set(m.id, label);
  }
  return labels;
}

const goalLabel = (g: PlanGoal) => strings.plans.goals[g];
const levelLabel = (l: PlanLevel) => strings.plans.levels[l];
const schemeLabel = (s: SetScheme) => strings.schemes[s].name;

/** Builds the template workbook. The example plan, if given, fills the first rows. */
export function buildPlanTemplate(machines: TemplateMachine[], example?: PlanDraft): Uint8Array {
  const labels = machineLabels(machines);
  const known = new Set(machines.map((m) => m.id));
  const lastRow = MAX_ROWS + 1;

  const planRows: CellValue[][] = [[...PLAN_COLUMNS]];
  const exerciseRows: CellValue[][] = [[...EXERCISE_COLUMNS]];
  if (example) {
    planRows.push([
      example.name,
      example.tagline,
      example.description,
      goalLabel(example.goal),
      levelLabel(example.level),
      example.daysPerWeek,
      example.minutes,
    ]);
    for (const day of example.days) {
      for (const item of day.items.filter((i) => known.has(i.machineId))) {
        exerciseRows.push([
          example.name,
          day.name,
          labels.get(item.machineId) ?? item.machineId,
          item.targetSets,
          item.targetReps,
          schemeLabel(item.scheme ?? 'straight'),
          item.targetWeightKg ?? null,
        ]);
      }
    }
  }

  const listRows: CellValue[][] = [['Goal', 'Goal code', '', 'Level', 'Level code', '', 'Set style', 'Set style code', 'How it works', '', 'Muscle group', 'Muscle group code']];
  const height = Math.max(PLAN_GOALS.length, PLAN_LEVELS.length, SET_SCHEMES.length, MUSCLE_GROUPS.length);
  for (let i = 0; i < height; i += 1) {
    const g = PLAN_GOALS[i];
    const l = PLAN_LEVELS[i];
    const s = SET_SCHEMES[i];
    const m = MUSCLE_GROUPS[i];
    listRows.push([
      g ? goalLabel(g) : null,
      g ?? null,
      null,
      l ? levelLabel(l) : null,
      l ?? null,
      null,
      s ? schemeLabel(s) : null,
      s ?? null,
      s ? strings.schemes[s].how : null,
      null,
      m ? strings.muscleGroups[m] : null,
      m ?? null,
    ]);
  }

  const machineRows: CellValue[][] = [
    ['Machine', 'Machine ID', 'Muscle group', 'Brand', 'Line'],
    ...machines.map((m) => [
      labels.get(m.id) ?? m.name,
      m.id,
      strings.muscleGroups[m.muscleGroup],
      m.custom ? t.myMachine : (m.brand ?? null),
      m.line ?? null,
    ]),
  ];

  const sheets: SheetSpec[] = [
    {
      name: SHEETS.instructions,
      rows: t.instructions.map((line) => [line]),
      widths: [110],
    },
    {
      name: SHEETS.plans,
      rows: planRows,
      header: true,
      widths: [30, 34, 50, 18, 16, 16, 20],
      validations: [
        { type: 'list', range: `D2:D${lastRow}`, source: 'Goals', error: t.pickFromList },
        { type: 'list', range: `E2:E${lastRow}`, source: 'Levels', error: t.pickFromList },
        { type: 'whole', range: `F2:F${lastRow}`, ...LIMITS.daysPerWeek, error: t.between(LIMITS.daysPerWeek) },
        { type: 'whole', range: `G2:G${lastRow}`, ...LIMITS.minutes, error: t.between(LIMITS.minutes) },
      ],
    },
    {
      name: SHEETS.exercises,
      rows: exerciseRows,
      header: true,
      widths: [30, 18, 52, 8, 8, 22, 20],
      validations: [
        { type: 'list', range: `A2:A${lastRow}`, source: 'PlanNames', error: t.pickPlan },
        { type: 'list', range: `C2:C${lastRow}`, source: 'Machines', error: t.pickFromList },
        { type: 'whole', range: `D2:D${lastRow}`, ...LIMITS.sets, error: t.between(LIMITS.sets) },
        { type: 'whole', range: `E2:E${lastRow}`, ...LIMITS.reps, error: t.between(LIMITS.reps) },
        { type: 'list', range: `F2:F${lastRow}`, source: 'SetStyles', error: t.pickFromList },
        { type: 'decimal', range: `G2:G${lastRow}`, ...LIMITS.weightKg, error: t.between(LIMITS.weightKg) },
      ],
    },
    { name: SHEETS.machines, rows: machineRows, header: true, widths: [52, 58, 14, 16, 18] },
    { name: SHEETS.lists, rows: listRows, header: true, widths: [16, 12, 3, 14, 12, 3, 22, 16, 70, 3, 14, 18] },
  ];

  return writeXlsx({
    sheets,
    names: [
      { name: 'Goals', ref: `Lists!$A$2:$A$${PLAN_GOALS.length + 1}` },
      { name: 'Levels', ref: `Lists!$D$2:$D$${PLAN_LEVELS.length + 1}` },
      { name: 'SetStyles', ref: `Lists!$G$2:$G$${SET_SCHEMES.length + 1}` },
      { name: 'Machines', ref: `Machines!$A$2:$A$${Math.max(2, machines.length + 1)}` },
      { name: 'PlanNames', ref: `Plans!$A$2:$A$${lastRow}` },
    ],
  });
}

// ---------- Parsing ----------

export interface ParseResult {
  plans: PlanDraft[];
  errors: string[];
}

const key = (text: string) => text.trim().toLowerCase();
const headerKey = (text: string) => text.toLowerCase().replace(/[^a-z]/g, '');

function lookup<T extends string>(codes: readonly T[], label: (c: T) => string): Map<string, T> {
  const map = new Map<string, T>();
  for (const c of codes) {
    map.set(key(c), c);
    map.set(key(label(c)), c);
  }
  return map;
}

function columns(header: string[] | undefined, wanted: readonly string[]): Map<string, number> | string[] {
  const found = new Map<string, number>();
  const at = new Map((header ?? []).map((h, i) => [headerKey(h), i]));
  const missing: string[] = [];
  for (const name of wanted) {
    const index = at.get(headerKey(name));
    if (index === undefined) missing.push(name);
    else found.set(name, index);
  }
  return missing.length ? missing : found;
}

function readNumber(
  text: string,
  range: { min: number; max: number },
  whole: boolean,
): number | null {
  const value = Number(text.replace(',', '.'));
  if (!Number.isFinite(value)) return null;
  const rounded = whole ? Math.round(value) : Math.round(value * 100) / 100;
  if (whole && Math.abs(rounded - value) > 1e-6) return null;
  return rounded >= range.min && rounded <= range.max ? rounded : null;
}

/** Turns the Plans and Exercises sheets into plans. Any error means nothing should be imported. */
export function parsePlanSheets(sheets: Map<string, string[][]>, machines: TemplateMachine[]): ParseResult {
  const errors: string[] = [];
  const byName = new Map([...sheets].map(([name, rows]) => [key(name), rows]));
  const planSheet = byName.get(key(SHEETS.plans));
  const exerciseSheet = byName.get(key(SHEETS.exercises));
  if (!planSheet || !exerciseSheet) return { plans: [], errors: [t.errors.missingSheets] };

  const planCols = columns(planSheet[0], PLAN_COLUMNS);
  const exerciseCols = columns(exerciseSheet[0], EXERCISE_COLUMNS);
  if (Array.isArray(planCols)) errors.push(t.errors.missingColumns(SHEETS.plans, planCols));
  if (Array.isArray(exerciseCols)) errors.push(t.errors.missingColumns(SHEETS.exercises, exerciseCols));
  if (Array.isArray(planCols) || Array.isArray(exerciseCols)) return { plans: [], errors };

  const goals = lookup(PLAN_GOALS, goalLabel);
  const levels = lookup(PLAN_LEVELS, levelLabel);
  const schemes = lookup(SET_SCHEMES, schemeLabel);
  const machineIds = new Map<string, string>();
  const labels = machineLabels(machines);
  const nameCount = new Map<string, number>();
  for (const m of machines) nameCount.set(key(m.name), (nameCount.get(key(m.name)) ?? 0) + 1);
  for (const m of machines) {
    machineIds.set(key(m.id), m.id);
    machineIds.set(key(labels.get(m.id) ?? m.name), m.id);
    if (nameCount.get(key(m.name)) === 1) machineIds.set(key(m.name), m.id);
  }

  const plans = new Map<string, PlanDraft>();
  planSheet.slice(1).forEach((row, i) => {
    const cell = (col: (typeof PLAN_COLUMNS)[number]) => row[planCols.get(col) as number] ?? '';
    if (row.every((c) => c === '')) return;
    const where = t.errors.row(SHEETS.plans, i + 2);
    const name = cell('Plan name');
    if (!name) return errors.push(`${where}: ${t.errors.required('Plan name')}`);
    if (plans.has(key(name))) return errors.push(`${where}: ${t.errors.duplicatePlan(name)}`);
    const goal = goals.get(key(cell('Goal')));
    const level = cell('Level') ? levels.get(key(cell('Level'))) : 'beginner';
    const days = cell('Days per week') ? readNumber(cell('Days per week'), LIMITS.daysPerWeek, true) : 0;
    const minutes = cell('Minutes per workout')
      ? readNumber(cell('Minutes per workout'), LIMITS.minutes, true)
      : DEFAULT_MINUTES;
    const problems = [
      !goal && t.errors.notInList('Goal', cell('Goal')),
      !level && t.errors.notInList('Level', cell('Level')),
      days === null && t.errors.range('Days per week', LIMITS.daysPerWeek),
      minutes === null && t.errors.range('Minutes per workout', LIMITS.minutes),
    ].filter((p): p is string => typeof p === 'string');
    for (const p of problems) errors.push(`${where}: ${p}`);
    if (problems.length > 0 || !goal || !level || days === null || minutes === null) {
      plans.set(key(name), { name, tagline: '', description: '', goal: 'muscle', level: 'beginner', daysPerWeek: 1, minutes: 0, days: [] });
      return;
    }
    plans.set(key(name), {
      name,
      tagline: cell('Tagline'),
      description: cell('Description'),
      goal,
      level,
      daysPerWeek: days,
      minutes,
      days: [],
    });
  });

  const referenced = new Set<string>();
  exerciseSheet.slice(1).forEach((row, i) => {
    const cell = (col: (typeof EXERCISE_COLUMNS)[number]) => row[exerciseCols.get(col) as number] ?? '';
    if (row.every((c) => c === '')) return;
    referenced.add(key(cell('Plan name')));
    const where = t.errors.row(SHEETS.exercises, i + 2);
    const plan = plans.get(key(cell('Plan name')));
    const dayName = cell('Day name');
    const machineId = machineIds.get(key(cell('Machine')));
    const sets = readNumber(cell('Sets'), LIMITS.sets, true);
    const reps = readNumber(cell('Reps'), LIMITS.reps, true);
    const scheme = cell('Set style') ? schemes.get(key(cell('Set style'))) : 'straight';
    const weight = cell('Target weight (kg)') ? readNumber(cell('Target weight (kg)'), LIMITS.weightKg, false) : undefined;
    const problems = [
      !cell('Plan name') && t.errors.required('Plan name'),
      cell('Plan name') && !plan && t.errors.unknownPlan(cell('Plan name')),
      !dayName && t.errors.required('Day name'),
      !cell('Machine') && t.errors.required('Machine'),
      cell('Machine') && !machineId && t.errors.unknownMachine(cell('Machine')),
      sets === null && t.errors.range('Sets', LIMITS.sets),
      reps === null && t.errors.range('Reps', LIMITS.reps),
      !scheme && t.errors.notInList('Set style', cell('Set style')),
      weight === null && t.errors.range('Target weight (kg)', LIMITS.weightKg, false),
    ].filter((p): p is string => typeof p === 'string');
    if (problems.length === 0 && plan && machineId) {
      let day = plan.days.find((d) => key(d.name) === key(dayName));
      if (!day) {
        day = { name: dayName, items: [] };
        plan.days.push(day);
      }
      if (day.items.some((it) => it.machineId === machineId)) {
        problems.push(t.errors.repeatedMachine(cell('Machine'), dayName));
      } else {
        const item: RoutineItem = { machineId, targetSets: sets as number, targetReps: reps as number };
        if (weight !== undefined && weight !== null) item.targetWeightKg = weight;
        if (scheme && scheme !== 'straight') item.scheme = scheme;
        day.items.push(item);
      }
    }
    for (const p of problems) errors.push(`${where}: ${p}`);
  });

  for (const plan of plans.values()) {
    if (!referenced.has(key(plan.name))) errors.push(t.errors.noExercises(plan.name));
    if (plan.days.length > LIMITS.daysPerWeek.max) errors.push(t.errors.tooManyDays(plan.name));
    if (plan.daysPerWeek === 0) plan.daysPerWeek = Math.max(1, plan.days.length);
  }
  if (plans.size === 0 && errors.length === 0) errors.push(t.errors.noPlans);
  return { plans: errors.length ? [] : [...plans.values()], errors };
}

/** Reads a filled-in template. */
export async function readPlanFile(bytes: Uint8Array, machines: TemplateMachine[]): Promise<ParseResult> {
  let sheets: Map<string, string[][]>;
  try {
    sheets = await readXlsx(bytes);
  } catch {
    return { plans: [], errors: [t.errors.notXlsx] };
  }
  return parsePlanSheets(sheets, machines);
}

export function templateFileName(): string {
  return 'workout-plan-template.xlsx';
}
