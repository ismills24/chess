import React from "react";
import { PlayerColor } from "../../../engine/primitives/PlayerColor";

const WHITE_PIECE = "#f5f0e6";
const BLACK_PIECE = "#1a1a1a";

function getPieceColor(owner: PlayerColor): string {
  return owner === PlayerColor.White ? WHITE_PIECE : BLACK_PIECE;
}

interface PieceProps {
  owner: PlayerColor;
}

export const ProceduralPawn: React.FC<PieceProps> = ({ owner }) => {
  const color = getPieceColor(owner);
  return (
    <group>
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.3, 0.3, 32]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 0.2, 32]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.6, 0]} castShadow>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
    </group>
  );
};

export const ProceduralRook: React.FC<PieceProps> = ({ owner }) => {
  const color = getPieceColor(owner);
  return (
    <group>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.32, 0.4, 32]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.22, 0.3, 32]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.2, 0.2, 32]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
      {/* 4 battlements at 90° intervals: i * π/2 = 0°, 90°, 180°, 270° */}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          position={[
            // Polar to cartesian: x = radius * cos(angle)
            Math.cos((i * Math.PI) / 2) * 0.18,
            0.9,
            // Polar to cartesian: z = radius * sin(angle)
            Math.sin((i * Math.PI) / 2) * 0.18,
          ]}
          castShadow
        >
          <boxGeometry args={[0.12, 0.15, 0.12]} />
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
        </mesh>
      ))}
    </group>
  );
};

export const ProceduralKnight: React.FC<PieceProps> = ({ owner }) => {
  const color = getPieceColor(owner);
  return (
    <group>
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.3, 0.3, 32]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 0.2, 32]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
      <mesh position={[0.05, 0.65, 0]} rotation={[0, 0, 0.3]} castShadow>
        <boxGeometry args={[0.15, 0.35, 0.25]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
      <mesh position={[0.18, 0.8, 0]} rotation={[0, 0, 0.8]} castShadow>
        <boxGeometry args={[0.1, 0.25, 0.2]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
      <mesh position={[-0.05, 0.75, 0]} castShadow>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
    </group>
  );
};

export const ProceduralBishop: React.FC<PieceProps> = ({ owner }) => {
  const color = getPieceColor(owner);
  return (
    <group>
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.3, 0.3, 32]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.2, 0.2, 32]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.65, 0]} castShadow>
        <sphereGeometry args={[0.18, 32, 32, 0, Math.PI * 2, 0, Math.PI / 1.3]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
    </group>
  );
};

export const ProceduralQueen: React.FC<PieceProps> = ({ owner }) => {
  const color = getPieceColor(owner);
  return (
    <group>
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.33, 0.3, 32]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.25, 0.2, 32]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.65, 0]} castShadow>
        <sphereGeometry args={[0.22, 32, 32, 0, Math.PI * 2, 0, Math.PI / 1.5]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
      {/* 8 crown points at 45° intervals: i * π/4 = 0°, 45°, 90°, ... */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <mesh
          key={i}
          position={[
            // Polar to cartesian: x = radius * cos(angle)
            Math.cos((i * Math.PI) / 4) * 0.15,
            0.88,
            // Polar to cartesian: z = radius * sin(angle)
            Math.sin((i * Math.PI) / 4) * 0.15,
          ]}
          castShadow
        >
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
        </mesh>
      ))}
      <mesh position={[0, 0.95, 0]} castShadow>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
    </group>
  );
};

export const ProceduralKing: React.FC<PieceProps> = ({ owner }) => {
  const color = getPieceColor(owner);
  return (
    <group>
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.33, 0.3, 32]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.25, 0.2, 32]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.65, 0]} castShadow>
        <sphereGeometry args={[0.22, 32, 32, 0, Math.PI * 2, 0, Math.PI / 1.5]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.15, 0.15, 32]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
      <mesh position={[0, 1.0, 0]} castShadow>
        <boxGeometry args={[0.06, 0.2, 0.06]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[0.18, 0.06, 0.06]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
    </group>
  );
};

export function getProceduralPieceComponent(pieceName: string): React.FC<PieceProps> | null {
  const name = pieceName.toLowerCase();
  if (name.includes("pawn")) return ProceduralPawn;
  if (name.includes("rook")) return ProceduralRook;
  if (name.includes("knight")) return ProceduralKnight;
  if (name.includes("bishop")) return ProceduralBishop;
  if (name.includes("queen")) return ProceduralQueen;
  if (name.includes("king")) return ProceduralKing;
  return null;
}


