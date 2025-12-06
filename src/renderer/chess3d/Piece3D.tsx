import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Piece } from "../../catalog/pieces/Piece";
import { gridToWorld, BoardDimensions } from "./coordinates";
// animationConstants defaults are exposed via animationConfig at runtime
import { emitAnimationComplete } from "./animationBus";
import { getMoveDurationForPieceName } from "./animationConfig";
import { getPieceDefinition } from "../../catalog/registry/Catalog";
import { getProceduralPieceComponent } from "./pieces/ProceduralPieces";
import { abilityIdsForPiece } from "../../catalog/registry/Catalog";


import { DecoratorIndicator3D } from "./DecoratorIndicator3D";


interface Piece3DProps {
  piece: Piece;
  dimensions: BoardDimensions;
  isSelected?: boolean;
  isFadingOut?: boolean;
  fadeStartTime?: number;
  fadeDuration?: number;
}

// use shared constants from animationConstants

type AnimType = "slide" | "jump" | "spin" | "bounce";

const Piece3DInner: React.FC<Piece3DProps> = ({ piece, dimensions, isSelected, isFadingOut = false, fadeStartTime, fadeDuration = 300 }) => {
  const meshRef = useRef<THREE.Group | null>(null);
  // One-time flag to skip very early position-change animations (spawn)
  const skipNextAnimationRef = useRef(false);
  const skipTimerRef = useRef<number | null>(null);

  // Keep a mutable Vector3 of the currently rendered position to avoid per-frame React state updates
  const renderedPosRef = useRef<THREE.Vector3>(
    new THREE.Vector3(
      gridToWorld(piece.position, dimensions).x,
      0.05,
      gridToWorld(piece.position, dimensions).z
    )
  );

  // Animation metadata (start/target/time/duration/type)
  const animRef = useRef<{
    start: THREE.Vector3;
    target: THREE.Vector3;
    startTime: number;
    duration: number;
    active: boolean;
    type: AnimType;
    params?: any;
  }>({
    start: new THREE.Vector3(),
    target: new THREE.Vector3(),
    startTime: 0,
    duration: 0,
    active: false,
    type: "slide",
  });

  // Track opacity for fade-out effect
  const opacityRef = useRef(1);

  // Determine animation type and duration from Catalog definition, with config fallbacks
  function getAnimTypeForPiece(p: Piece): AnimType {
    try {
      const def = getPieceDefinition(p.name as any) as any;
      return def && def.animation ? (def.animation as AnimType) : "slide";
    } catch (e) {
      const n = p.name.toLowerCase();
      if (n.includes("knight")) return "jump";
      return "slide";
    }
  }

  // Duration per-piece (from catalog definition or global override)
  function getDurationForPiece(p: Piece) {
    try {
      const def = getPieceDefinition(p.name as any) as any;
      if (def && def.animDuration !== undefined) {
        return def.animDuration as number;
      }
    } catch (e) {
      // ignore
    }
    return getMoveDurationForPieceName(p.name || "");
  }

  // Initialize mesh position on first mount
  useEffect(() => {
    const wp = gridToWorld(piece.position, dimensions);
    renderedPosRef.current.set(wp.x, 0.05, wp.z);
    if (meshRef.current) meshRef.current.position.copy(renderedPosRef.current);
    // Ensure no animation is active on initial mount and mark a short window
    // during which position-change animations are ignored (covers extra
    // re-renders during initial setup).
    animRef.current.active = false;
    skipNextAnimationRef.current = true;
    // Clear any previous timer then set a short timeout to re-enable animations
    if (skipTimerRef.current) window.clearTimeout(skipTimerRef.current);
    skipTimerRef.current = window.setTimeout(() => {
      skipNextAnimationRef.current = false;
      skipTimerRef.current = null;
    }, 50) as unknown as number;
    return () => {
      if (skipTimerRef.current) {
        window.clearTimeout(skipTimerRef.current);
        skipTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When piece position changes, start an animation from current rendered -> new target
  useEffect(() => {
    // If we're within the short spawn-skip window, ignore this position change
    if (skipNextAnimationRef.current) return;

    const wp = gridToWorld(piece.position, dimensions);
    const now = performance.now();
    animRef.current.start.copy(renderedPosRef.current);
    animRef.current.target.set(wp.x, 0.05, wp.z);
    animRef.current.startTime = now;
    animRef.current.duration = getDurationForPiece(piece);
    animRef.current.active = true;
    animRef.current.type = getAnimTypeForPiece(piece);
    try {
      const def = getPieceDefinition(piece.name as any) as any;
      animRef.current.params = def && def.animParams ? def.animParams : undefined;
    } catch (e) {
      animRef.current.params = undefined;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piece.position.x, piece.position.y, dimensions.width, dimensions.height]);

  // Easing function
  const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  useFrame((state, delta) => {
    const anim = animRef.current;
    if (!meshRef.current) return;

    // Handle fade-out effect for captured pieces
    if (isFadingOut && fadeStartTime !== undefined) {
      const elapsed = performance.now() - fadeStartTime;
      const fadeProgress = Math.min(1, elapsed / fadeDuration);
      opacityRef.current = 1 - fadeProgress; // Fade from 1 to 0

      // Scale down while fading (shrink and disappear)
      const scale = opacityRef.current;
      meshRef.current.scale.set(scale, scale, scale);

      // Apply opacity to all materials in the group by cloning and modifying
      meshRef.current.traverse((child) => {
        if ((child as any).material && (child as any).material !== null) {
          const material = (child as any).material;
          // Don't modify shared materials - instead set visible to false when fully faded
          if (opacityRef.current <= 0.01) {
            (child as any).visible = false;
          }
        }
      });
    }

    if (!anim.active) return;

    const now = performance.now();
    const elapsed = now - anim.startTime;
    const tRaw = Math.min(1, elapsed / Math.max(1, anim.duration));
    const t = easeInOutCubic(tRaw);

    if (anim.type === "slide") {
      // Smooth linear interpolation across ground plane
      renderedPosRef.current.lerpVectors(anim.start, anim.target, t);
      meshRef.current.position.copy(renderedPosRef.current);
    } else if (anim.type === "jump") {
      // For a jump, lerp X/Z linearly and add a vertical arc (sin(pi*t))
      const horizontal = new THREE.Vector3();
      horizontal.lerpVectors(anim.start, anim.target, t);
      // jump height tuned by distance (or fixed)
      const jumpHeight = (anim.params && anim.params.jumpHeight) ? anim.params.jumpHeight : 0.6; // world units
      const y = Math.sin(Math.PI * t) * jumpHeight;
      meshRef.current.position.set(horizontal.x, horizontal.y + y, horizontal.z);
      // update renderedPosRef to track current ground position (no vertical component)
      renderedPosRef.current.set(horizontal.x, horizontal.y, horizontal.z);
    } else if (anim.type === "spin") {
      // Spin while sliding to target
      renderedPosRef.current.lerpVectors(anim.start, anim.target, t);
      meshRef.current.position.copy(renderedPosRef.current);
      // rotate around Y axis; spinSpeed param optional
      const spinSpeed = (anim.params && anim.params.spinSpeed) ? anim.params.spinSpeed : 8.0; // radians per second equivalent
      meshRef.current.rotation.y += delta * spinSpeed;
    } else if (anim.type === "bounce") {
      // Slide with a small bounce effect
      renderedPosRef.current.lerpVectors(anim.start, anim.target, t);
      const bounceHeight = (anim.params && anim.params.bounceHeight) ? anim.params.bounceHeight : 0.18;
      const y = Math.abs(Math.sin(Math.PI * t)) * bounceHeight;
      meshRef.current.position.set(renderedPosRef.current.x, renderedPosRef.current.y + y, renderedPosRef.current.z);
    }

    if (tRaw >= 1) {
      // finish animation: snap to target and clear
      anim.active = false;
      renderedPosRef.current.copy(anim.target);
      meshRef.current.position.copy(anim.target);

      // Emit animation complete event for adapter to pick up
      try {
        emitAnimationComplete({ pieceId: piece.id, to: { x: piece.position.x, y: piece.position.y } });
      } catch (e) {
        // ignore
      }
    }
  });

  const PieceComponent = getProceduralPieceComponent(piece.name);
  const decorators = abilityIdsForPiece(piece);

  if (!PieceComponent) return null;

  return (
    <group ref={meshRef}>
      <PieceComponent owner={piece.owner} />
      {isSelected && <SelectionRing />}
      {decorators.map((decoratorId, index) => (
        <DecoratorIndicator3D
          key={decoratorId}
          decoratorId={decoratorId}
          index={index}
          total={decorators.length}
        />
      ))}
    </group>
  );
};

export const Piece3D = React.memo(Piece3DInner, (prev, next) => {
  return (
    prev.piece.id === next.piece.id &&
    prev.piece.position.x === next.piece.position.x &&
    prev.piece.position.y === next.piece.position.y &&
    prev.isSelected === next.isSelected &&
    prev.dimensions.width === next.dimensions.width &&
    prev.dimensions.height === next.dimensions.height &&
    prev.isFadingOut === next.isFadingOut &&
    prev.fadeStartTime === next.fadeStartTime &&
    prev.fadeDuration === next.fadeDuration
  );
});

const SelectionRing: React.FC = React.memo(() => {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      const pulse = 0.8 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = pulse;
    }
  });

  return (
    <mesh ref={ringRef} position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.34, 0.42, 64]} />
      <meshBasicMaterial color="#ffcc00" transparent opacity={1} />
    </mesh>
  );
});
