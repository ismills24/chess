import React from "react";
import { PlayerColor } from "../../../chess-engine/primitives/PlayerColor";
import { useGeometryStore } from "./GeometryStore";

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
  const geo = useGeometryStore();
  const mat = geo.material(`pawn-${owner}`, color);

  return (
    <group>
      <mesh
        position={[0, 0.15, 0]}
        geometry={geo.cylinder("pawn-base", 0.25, 0.3, 0.3)}
        material={mat}
        castShadow
      />
      <mesh
        position={[0, 0.4, 0]}
        geometry={geo.cylinder("pawn-mid", 0.15, 0.2, 0.2)}
        material={mat}
        castShadow
      />
      <mesh
        position={[0, 0.6, 0]}
        geometry={geo.sphere("pawn-top", 0.15)}
        material={mat}
        castShadow
      />
    </group>
  );
};

export const ProceduralRook: React.FC<PieceProps> = ({ owner }) => {
  const color = getPieceColor(owner);
  const geo = useGeometryStore();
  const mat = geo.material(`rook-${owner}`, color);
  const battlementGeo = geo.box("rook-battlement", 0.12, 0.15, 0.12);

  return (
    <group>
      <mesh
        position={[0, 0.2, 0]}
        geometry={geo.cylinder("rook-base", 0.25, 0.32, 0.4)}
        material={mat}
        castShadow
      />
      <mesh
        position={[0, 0.5, 0]}
        geometry={geo.cylinder("rook-mid", 0.2, 0.22, 0.3)}
        material={mat}
        castShadow
      />
      <mesh
        position={[0, 0.75, 0]}
        geometry={geo.cylinder("rook-top", 0.28, 0.2, 0.2)}
        material={mat}
        castShadow
      />
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          position={[
            Math.cos((i * Math.PI) / 2) * 0.18,
            0.9,
            Math.sin((i * Math.PI) / 2) * 0.18,
          ]}
          geometry={battlementGeo}
          material={mat}
          castShadow
        />
      ))}
    </group>
  );
};

export const ProceduralKnight: React.FC<PieceProps> = ({ owner }) => {
  const color = getPieceColor(owner);
  const geo = useGeometryStore();
  const mat = geo.material(`knight-${owner}`, color);

  return (
    <group>
      <mesh
        position={[0, 0.15, 0]}
        geometry={geo.cylinder("knight-base", 0.25, 0.3, 0.3)}
        material={mat}
        castShadow
      />
      <mesh
        position={[0, 0.4, 0]}
        geometry={geo.cylinder("knight-mid", 0.15, 0.2, 0.2)}
        material={mat}
        castShadow
      />
      <mesh
        position={[0.05, 0.65, 0]}
        rotation={[0, 0, 0.3]}
        geometry={geo.box("knight-neck", 0.15, 0.35, 0.25)}
        material={mat}
        castShadow
      />
      <mesh
        position={[0.18, 0.8, 0]}
        rotation={[0, 0, 0.8]}
        geometry={geo.box("knight-head", 0.1, 0.25, 0.2)}
        material={mat}
        castShadow
      />
      <mesh
        position={[-0.05, 0.75, 0]}
        geometry={geo.sphere("knight-eye", 0.08, 16, 16)}
        material={mat}
        castShadow
      />
    </group>
  );
};

export const ProceduralBishop: React.FC<PieceProps> = ({ owner }) => {
  const color = getPieceColor(owner);
  const geo = useGeometryStore();
  const mat = geo.material(`bishop-${owner}`, color);

  return (
    <group>
      <mesh
        position={[0, 0.15, 0]}
        geometry={geo.cylinder("bishop-base", 0.25, 0.3, 0.3)}
        material={mat}
        castShadow
      />
      <mesh
        position={[0, 0.4, 0]}
        geometry={geo.cylinder("bishop-mid", 0.12, 0.2, 0.2)}
        material={mat}
        castShadow
      />
      <mesh
        position={[0, 0.65, 0]}
        geometry={geo.sphere(
          "bishop-dome",
          0.18,
          32,
          32,
          0,
          Math.PI * 2,
          0,
          Math.PI / 1.3
        )}
        material={mat}
        castShadow
      />
      <mesh
        position={[0, 0.85, 0]}
        geometry={geo.sphere("bishop-top", 0.08, 16, 16)}
        material={mat}
        castShadow
      />
    </group>
  );
};

export const ProceduralQueen: React.FC<PieceProps> = ({ owner }) => {
  const color = getPieceColor(owner);
  const geo = useGeometryStore();
  const mat = geo.material(`queen-${owner}`, color);
  const crownPointGeo = geo.sphere("queen-crown-point", 0.05, 16, 16);

  return (
    <group>
      <mesh
        position={[0, 0.15, 0]}
        geometry={geo.cylinder("queen-base", 0.28, 0.33, 0.3)}
        material={mat}
        castShadow
      />
      <mesh
        position={[0, 0.4, 0]}
        geometry={geo.cylinder("queen-mid", 0.15, 0.25, 0.2)}
        material={mat}
        castShadow
      />
      <mesh
        position={[0, 0.65, 0]}
        geometry={geo.sphere(
          "queen-dome",
          0.22,
          32,
          32,
          0,
          Math.PI * 2,
          0,
          Math.PI / 1.5
        )}
        material={mat}
        castShadow
      />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <mesh
          key={i}
          position={[
            Math.cos((i * Math.PI) / 4) * 0.15,
            0.88,
            Math.sin((i * Math.PI) / 4) * 0.15,
          ]}
          geometry={crownPointGeo}
          material={mat}
          castShadow
        />
      ))}
      <mesh
        position={[0, 0.95, 0]}
        geometry={geo.sphere("queen-top", 0.08, 16, 16)}
        material={mat}
        castShadow
      />
    </group>
  );
};

export const ProceduralKing: React.FC<PieceProps> = ({ owner }) => {
  const color = getPieceColor(owner);
  const geo = useGeometryStore();
  const mat = geo.material(`king-${owner}`, color);

  return (
    <group>
      <mesh
        position={[0, 0.15, 0]}
        geometry={geo.cylinder("king-base", 0.28, 0.33, 0.3)}
        material={mat}
        castShadow
      />
      <mesh
        position={[0, 0.4, 0]}
        geometry={geo.cylinder("king-mid", 0.15, 0.25, 0.2)}
        material={mat}
        castShadow
      />
      <mesh
        position={[0, 0.65, 0]}
        geometry={geo.sphere(
          "king-dome",
          0.22,
          32,
          32,
          0,
          Math.PI * 2,
          0,
          Math.PI / 1.5
        )}
        material={mat}
        castShadow
      />
      <mesh
        position={[0, 0.85, 0]}
        geometry={geo.cylinder("king-collar", 0.12, 0.15, 0.15)}
        material={mat}
        castShadow
      />
      <mesh
        position={[0, 1.0, 0]}
        geometry={geo.box("king-cross-v", 0.06, 0.2, 0.06)}
        material={mat}
        castShadow
      />
      <mesh
        position={[0, 1.05, 0]}
        geometry={geo.box("king-cross-h", 0.18, 0.06, 0.06)}
        material={mat}
        castShadow
      />
    </group>
  );
};

export function getProceduralPieceComponent(
  pieceName: string
): React.FC<PieceProps> | null {
  const name = pieceName.toLowerCase();
  if (name.includes("pawn")) return ProceduralPawn;
  if (name.includes("rook")) return ProceduralRook;
  if (name.includes("knight")) return ProceduralKnight;
  if (name.includes("bishop")) return ProceduralBishop;
  if (name.includes("queen")) return ProceduralQueen;
  if (name.includes("king")) return ProceduralKing;
  return null;
}
