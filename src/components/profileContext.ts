import { createContext, useContext } from 'react';
import type { Profile } from '../data/types';

export const ProfileContext = createContext<Profile | null>(null);

/** The saved profile. Only screens behind the onboarding gate in App use it. */
export function useProfile(): Profile {
  const profile = useContext(ProfileContext);
  if (!profile) throw new Error('useProfile used outside the profile gate');
  return profile;
}
