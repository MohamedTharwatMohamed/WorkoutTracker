import type { Iso, Profile } from '../db/types';

export function remainingSec(restEndsAt: Iso, now: Iso): number {
  return Math.max(0, Math.ceil((Date.parse(restEndsAt) - Date.parse(now)) / 1000));
}

export function actualRestSec(previousLoggedAt: Iso, loggedAt: Iso): number {
  return Math.max(0, Math.floor((Date.parse(loggedAt) - Date.parse(previousLoggedAt)) / 1000));
}

/** Precedence: user setting, custom machine, catalog default, profile default. */
export function restLengthFor(
  machine: { settingsRestSec?: number; customRestSec?: number; defaultRestSec: number | null },
  profile: Pick<Profile, 'defaultRestSec'>,
): number {
  return (
    machine.settingsRestSec ??
    machine.customRestSec ??
    machine.defaultRestSec ??
    profile.defaultRestSec
  );
}
