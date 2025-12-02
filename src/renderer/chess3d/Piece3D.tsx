import React from "react";
import { ThreeEvent } from "@react-three/fiber";
import { Piece } from "../../engine/pieces/Piece";
import { gridToWorld, BoardDimensions } from "./coordinates";
import { getProceduralPieceComponent } from "./pieces/ProceduralPieces";
import { decoratorIdsForPiece } from "../../shared/entityRegistry";
import { DecoratorIndicator3D } from "./DecoratorIndicator3D";

interface Piece3DProps {
  piece: Piece;
  dimensions: BoardDimensions;
  isSelected?: boolean;
  onClick?: () => void;
}

export const Piece3D: React.FC<Piece3DProps> = ({
  piece,
  dimensions,
  isSelected,
  onClick,
}) => {
  const PieceComponent = getProceduralPieceComponent(piece.name);
  const worldPos = gridToWorld(piece.position, dimensions);
  const decorators = decoratorIdsForPiece(piece);

  if (!PieceComponent) return null;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick?.();
  };

  return (
    <group position={[worldPos.x, 0.05, worldPos.z]} onClick={handleClick}>
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

const SelectionRing: React.FC = () => {
  return (
    // Rotate -90° around X axis to lay ring flat on the XZ plane
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.35, 0.42, 32]} />
      <meshBasicMaterial color="#3366cc" transparent opacity={0.8} />
    </mesh>
  );
};
