/**
 * Ordered upgrade steps for older backup files. Step N turns a version N file
 * into a version N+1 file. Steps never touch `data` so the stored checksum still matches.
 */
export const upgradeSteps: Record<number, (file: Record<string, unknown>) => Record<string, unknown>> = {
  // Version 2 added custom plans. A missing data.plans is read as an empty list.
  1: (file) => {
    const manifest = (file.manifest ?? {}) as Record<string, unknown>;
    const counts = (manifest.counts ?? {}) as Record<string, unknown>;
    return { ...file, manifest: { ...manifest, counts: { ...counts, plans: 0 } } };
  },
};

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
