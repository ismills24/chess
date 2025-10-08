import { PlayerColor } from "../engine/primitives/PlayerColor";
import { Vector2Int } from "../engine/primitives/Vector2Int";
import { Piece } from "../engine/pieces/Piece";
import { Pawn } from "../engine/pieces/standard/Pawn";
import { Knight } from "../engine/pieces/standard/Knight";
import { Bishop } from "../engine/pieces/standard/Bishop";
import { Rook } from "../engine/pieces/standard/Rook";
import { Queen } from "../engine/pieces/standard/Queen";
import { King } from "../engine/pieces/standard/King";
import { PieceDecoratorBase } from "../engine/pieces/decorators/PieceDecoratorBase";
import { MarksmanDecorator } from "../engine/pieces/decorators/MarksmanDecorator";
import { ExplodingDecorator } from "../engine/pieces/decorators/ExplodingDecorator";
import { ScapegoatDecorator } from "../engine/pieces/decorators/ScapegoatDecorator";
import { PiercingDecorator } from "../engine/pieces/decorators/PiercingDecorator";
import { Tile } from "../engine/tiles/Tile";
import { StandardTile } from "../engine/tiles/StandardTile";
import { GuardianTile } from "../engine/tiles/GuardianTile";
import { SlipperyTile } from "../engine/tiles/SlipperyTile";
import { FogTile } from "../engine/tiles/FogTile";
import { BouncerDecorator } from "../engine/pieces/decorators/BouncerDecorator";
import { CannibalDecorator } from "../engine/pieces/decorators/CannibalDecorator";
import { SwapperDecorator } from "../engine/pieces/decorators/SwapperDecorator";

type PieceConstructor<T extends Piece = Piece> = new (owner: PlayerColor, position: Vector2Int) => T;
type DecoratorConstructor<T extends PieceDecoratorBase = PieceDecoratorBase> = new (innerPiece: Piece) => T;
type TileConstructor<T extends Tile = Tile> = new (position?: Vector2Int, id?: string) => T;

const pieceDefinitions = [
  {
    id: "Pawn",
    icon: "pawn",
    create: (owner: PlayerColor, position: Vector2Int) => new Pawn(owner, position),
    klass: Pawn as PieceConstructor,
  },
  {
    id: "Knight",
    icon: "knight",
    create: (owner: PlayerColor, position: Vector2Int) => new Knight(owner, position),
    klass: Knight as PieceConstructor,
  },
  {
    id: "Bishop",
    icon: "bishop",
    create: (owner: PlayerColor, position: Vector2Int) => new Bishop(owner, position),
    klass: Bishop as PieceConstructor,
  },
  {
    id: "Rook",
    icon: "rook",
    create: (owner: PlayerColor, position: Vector2Int) => new Rook(owner, position),
    klass: Rook as PieceConstructor,
  },
  {
    id: "Queen",
    icon: "queen",
    create: (owner: PlayerColor, position: Vector2Int) => new Queen(owner, position),
    klass: Queen as PieceConstructor,
  },
  {
    id: "King",
    icon: "king",
    create: (owner: PlayerColor, position: Vector2Int) => new King(owner, position),
    klass: King as PieceConstructor,
  },
] as const;

const decoratorDefinitions = [
  {
    id: "Marksman",
    icon: "🎯",
    apply: (piece: Piece) => new MarksmanDecorator(piece),
    klass: MarksmanDecorator as DecoratorConstructor,
  },
  {
    id: "Exploding",
    icon: "💥",
    apply: (piece: Piece) => new ExplodingDecorator(piece),
    klass: ExplodingDecorator as DecoratorConstructor,
  },
  {
    id: "Scapegoat",
    icon: "🛡️",
    apply: (piece: Piece) => new ScapegoatDecorator(piece),
    klass: ScapegoatDecorator as DecoratorConstructor,
  },
  {
    id: "Piercing",
    icon: "⚡",
    apply: (piece: Piece) => new PiercingDecorator(piece),
    klass: PiercingDecorator as DecoratorConstructor,
  },
  {
    id: "Bouncer",
    icon: "🏀",
    apply: (piece: Piece) => new BouncerDecorator(piece),
    klass: BouncerDecorator as DecoratorConstructor,
  },
  {
    id: "Cannibal",
    icon: "🍔",
    apply: (piece: Piece) => new CannibalDecorator(piece),
    klass: CannibalDecorator as DecoratorConstructor,
  },
  {
    id: "Swapper",
    icon: "🔄",
    apply: (piece: Piece) => new SwapperDecorator(piece),
    klass: SwapperDecorator as DecoratorConstructor,
  },
] as const;

const tileDefinitions = [
  {
    id: "StandardTile",
    icon: "⬜",
    create: (position?: Vector2Int, id?: string) => new StandardTile(position, id),
    klass: StandardTile as TileConstructor,
  },
  {
    id: "GuardianTile",
    icon: "🛡️",
    create: (position?: Vector2Int, id?: string) => new GuardianTile(position, id),
    klass: GuardianTile as TileConstructor,
  },
  {
    id: "SlipperyTile",
    icon: "🧊",
    create: (position?: Vector2Int, id?: string) => new SlipperyTile(position, id),
    klass: SlipperyTile as TileConstructor,
  },
  {
    id: "FogTile",
    icon: "☁️",
    create: (position?: Vector2Int, id?: string) => new FogTile(position, id),
    klass: FogTile as TileConstructor,
  },
] as const;

export type PieceDefinition = (typeof pieceDefinitions)[number];
export type DecoratorDefinition = (typeof decoratorDefinitions)[number];
export type TileDefinition = (typeof tileDefinitions)[number];

export type PieceId = PieceDefinition["id"];
export type DecoratorId = DecoratorDefinition["id"];
export type TileId = TileDefinition["id"];

export const PIECE_IDS: ReadonlyArray<PieceId> = pieceDefinitions.map((def) => def.id);
export const DECORATOR_IDS: ReadonlyArray<DecoratorId> = decoratorDefinitions.map((def) => def.id);
export const TILE_IDS: ReadonlyArray<TileId> = tileDefinitions.map((def) => def.id);

const pieceById = Object.fromEntries(pieceDefinitions.map((def) => [def.id, def])) as Record<PieceId, PieceDefinition>;
const decoratorById = Object.fromEntries(decoratorDefinitions.map((def) => [def.id, def])) as Record<DecoratorId, DecoratorDefinition>;
const tileById = Object.fromEntries(tileDefinitions.map((def) => [def.id, def])) as Record<TileId, TileDefinition>;

export function getPieceDefinition(id: PieceId): PieceDefinition {
  return pieceById[id];
}

export function getDecoratorDefinition(id: DecoratorId): DecoratorDefinition {
  return decoratorById[id];
}

export function getTileDefinition(id: TileId): TileDefinition {
  return tileById[id];
}

export function createPiece(id: PieceId, owner: PlayerColor, position: Vector2Int): Piece {
  return getPieceDefinition(id).create(owner, position);
}

export function applyDecorator(id: DecoratorId, piece: Piece): Piece {
  return getDecoratorDefinition(id).apply(piece);
}

export function createTile(id: TileId, position?: Vector2Int, tileId?: string): Tile {
  return getTileDefinition(id).create(position, tileId);
}

export function iconForPiece(id: PieceId): string {
  return getPieceDefinition(id).icon;
}

export function iconForDecorator(id: DecoratorId): string {
  return getDecoratorDefinition(id).icon;
}

export function iconForTile(id: TileId): string {
  return getTileDefinition(id).icon;
}

export function tileIdForInstance(tile: Tile): TileId {
  for (const def of tileDefinitions) {
    if (tile instanceof def.klass) {
      return def.id;
    }
  }
  return "StandardTile";
}

export function decoratorIdsForPiece(piece: Piece): DecoratorId[] {
  const ids: DecoratorId[] = [];
  let current: Piece = piece;

  while (current instanceof PieceDecoratorBase) {
    const match = decoratorDefinitions.find((def) => current instanceof def.klass);
    if (match) {
      ids.push(match.id);
    }
    current = current.innerPiece;
  }

  return ids;
}

