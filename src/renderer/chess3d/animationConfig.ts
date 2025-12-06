// Global fallback durations (used if piece definition doesn't specify animDuration)
const GLOBAL_DEFAULT_DURATION_MS = 400;
const GLOBAL_ANIMATION_BUFFER_MS = 100;

let globalOverrideDuration: number | null = null;
let animationBuffer = GLOBAL_ANIMATION_BUFFER_MS;

/**
 * Get animation duration for a piece by name.
 * Falls back to Catalog definition, then global override, then default.
 */
export function getMoveDurationForPieceName(name: string): number {
  if (globalOverrideDuration !== null) return globalOverrideDuration;
  return GLOBAL_DEFAULT_DURATION_MS;
}

export function getAnimationBufferMs() {
  return animationBuffer;
}

/**
 * Set global override duration (applies to all pieces).
 * Set to null to use per-piece catalog definitions.
 */
export function setDefaultMoveDurationMs(v: number) {
  globalOverrideDuration = Math.max(0, Math.round(v));
}

/**
 * @deprecated Knght duration is now controlled via Catalog.
 * Use setDefaultMoveDurationMs for global overrides.
 */
export function setKnightMoveDurationMs(v: number) {
  // For backward compatibility, treat as global override
  setDefaultMoveDurationMs(v);
}

export function setAnimationBufferMs(v: number) {
  animationBuffer = Math.max(0, Math.round(v));
}

export function getDurations() {
  return { 
    globalOverrideDuration, 
    defaultCatalogDuration: GLOBAL_DEFAULT_DURATION_MS,
    animationBuffer 
  };
}

/**
 * Clear any global override to use per-piece catalog definitions.
 */
export function clearGlobalDurationOverride() {
  globalOverrideDuration = null;
}
