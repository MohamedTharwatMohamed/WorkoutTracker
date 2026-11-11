/**
 * Ordered upgrade steps for older backup files. Step N turns a version N file
 * into a version N+1 file. Empty while the only format version is 1.
 */
export const upgradeSteps: Record<number, (file: Record<string, unknown>) => Record<string, unknown>> =
  {};

export function upgradeBackup(
  file: Record<string, unknown>,
  targetVersion: number,
): Record<string, unknown> {
  let current = file;
  let version = current.formatVersion as number;
  while (version < targetVersion) {
    const step = upgradeSteps[version];
    if (!step) throw new Error(`No upgrade from backup format version ${version}`);
    current = step(current);
    version += 1;
    current = { ...current, formatVersion: version };
  }
  return current;
}
