import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Piece } from "../../catalog/pieces/Piece";
import { gridToWorld, BoardDimensions } from "./coordinates";
import { getProceduralPieceComponent } from "./pieces/ProceduralPieces";
import { abilityIdsForPiece } from "../../catalog/registry/Catalog";


import { DecoratorIndicator3D } from "./DecoratorIndicator3D";


interface Piece3DProps {
  piece: Piece;
  dimensions: BoardDimensions;
  isSelected?: boolean;
}

const Piece3DInner: React.FC<Piece3DProps> = ({
  piece,
  dimensions,
  isSelected,
}) => {
  const PieceComponent = getProceduralPieceComponent(piece.name);
  const worldPos = gridToWorld(piece.position, dimensions);
  const decorators = abilityIdsForPiece(piece);

  if (!PieceComponent) return null;

  return (
    <group position={[worldPos.x, 0.05, worldPos.z]}>
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
    prev.dimensions.height === next.dimensions.height
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
