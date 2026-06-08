import type { CoachUserProfile } from "../../types";

const profileKey = "franchess.profile.v1";

export function loadProfile(): CoachUserProfile {
  const raw = window.localStorage.getItem(profileKey);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as CoachUserProfile;
  } catch {
    return {};
  }
}

export function saveProfile(profile: CoachUserProfile): void {
  window.localStorage.setItem(profileKey, JSON.stringify(profile));
}
