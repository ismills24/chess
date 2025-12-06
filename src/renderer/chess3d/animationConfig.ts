import { DEFAULT_MOVE_DURATION_MS, KNIGHT_MOVE_DURATION_MS, ANIMATION_BUFFER_MS } from "./animationConstants";

let defaultMoveDuration = DEFAULT_MOVE_DURATION_MS;
let knightMoveDuration = KNIGHT_MOVE_DURATION_MS;
let animationBuffer = ANIMATION_BUFFER_MS;

export function getMoveDurationForPieceName(name: string) {
  if (!name) return defaultMoveDuration;
  const n = name.toLowerCase();
  if (n.includes("knight")) return knightMoveDuration;
  return defaultMoveDuration;
}

export function getAnimationBufferMs() {
  return animationBuffer;
}

export function setDefaultMoveDurationMs(v: number) {
  defaultMoveDuration = Math.max(0, Math.round(v));
}

export function setKnightMoveDurationMs(v: number) {
  knightMoveDuration = Math.max(0, Math.round(v));
}

export function setAnimationBufferMs(v: number) {
  animationBuffer = Math.max(0, Math.round(v));
}

export function getDurations() {
  return { defaultMoveDuration, knightMoveDuration, animationBuffer };
}
