/**
 * @file introState.ts
 * @description Module-level flag for the landing intro animation state.
 * Used to coordinate timing between LandingIntro and Hero's Words stagger.
 * A simple module variable (not Zustand) to avoid store overhead for a
 * transient UI flag.
 */

let introActive = false;

export function setIntroActive(active: boolean): void {
  introActive = active;
}

export function isIntroActive(): boolean {
  return introActive;
}
