import { getPieceDefinition } from "../registry/Catalog";

export type AnimType = "slide" | "jump" | "spin" | "bounce";

export interface PieceAnimationDescriptor {
  type: AnimType;
  duration?: number;
  params?: Record<string, any>;
}

/**
 * Read animation info for a piece from the Catalog.
 * Returns a normalized descriptor; fields may be undefined when not specified
 * in the piece definition (caller can apply renderer-side fallbacks).
 */
export function getPieceAnimation(name: string): PieceAnimationDescriptor {
  try {
    const def = getPieceDefinition(name as any) as any;
    if (def) {
      return {
        type: (def.animation as AnimType) || "slide",
        duration: def.animDuration as number | undefined,
        params: def.animParams as Record<string, any> | undefined,
      };
    }
  } catch (e) {
    // ignore and fall through to heuristics
  }

  // Fallback heuristics (kept in Catalog so renderer is agnostic)
  const n = (name || "").toLowerCase();
  if (n.includes("knight")) {
    return { type: "jump" };
  }
  return { type: "slide" };
}
