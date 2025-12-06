import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import { Piece } from "../pieces/Piece";
import { Tile } from "../tiles/Tile";
import { AbilityBase } from "../abilities/AbilityBase";

// Standard pieces
import { Pawn } from "../pieces/standard/Pawn";
import { Knight } from "../pieces/standard/Knight";
import { Bishop } from "../pieces/standard/Bishop";
import { Rook } from "../pieces/standard/Rook";
import { Queen } from "../pieces/standard/Queen";
import { King } from "../pieces/standard/King";

// Abilities
import { MarksmanAbility } from "../abilities/MarksmanAbility";
import { ExplodingAbility } from "../abilities/ExplodingAbility";
import { ScapegoatAbility } from "../abilities/ScapegoatAbility";
import { PiercingAbility } from "../abilities/PiercingAbility";
import { BouncerAbility } from "../abilities/BouncerAbility";
import { CannibalAbility } from "../abilities/CannibalAbility";

// Tiles
import { StandardTile } from "../tiles/StandardTile";
import { GuardianTile } from "../tiles/GuardianTile";
import { SlipperyTile } from "../tiles/SlipperyTile";
import { FogTile } from "../tiles/FogTile";

type PieceConstructor<T extends Piece = Piece> = new (owner: PlayerColor, position: Vector2Int) => T;
type AbilityConstructor<T extends AbilityBase = AbilityBase> = new (innerPiece: Piece, id?: string, ...args: any[]) => T;
type TileConstructor<T extends Tile = Tile> = new (position?: Vector2Int, id?: string) => T;

const pieceDefinitions = [
    {
        id: "Pawn",
        icon: "pawn",
        create: (owner: PlayerColor, position: Vector2Int) => new Pawn(owner, position),
        animation: "slide",
        animParams: {},
        klass: Pawn as PieceConstructor,
    },
    {
        id: "Knight",
        icon: "knight",
        create: (owner: PlayerColor, position: Vector2Int) => new Knight(owner, position),
        animation: "jump",
        animParams: { jumpHeight: 0.6 },
        klass: Knight as PieceConstructor,
    },
    {
        id: "Bishop",
        icon: "bishop",
        create: (owner: PlayerColor, position: Vector2Int) => new Bishop(owner, position),
        animation: "slide",
        animParams: {},
        klass: Bishop as PieceConstructor,
    },
    {
        id: "Rook",
        icon: "rook",
        create: (owner: PlayerColor, position: Vector2Int) => new Rook(owner, position),
        animation: "slide",
        animParams: {},
        klass: Rook as PieceConstructor,
    },
    {
        id: "Queen",
        icon: "queen",
        create: (owner: PlayerColor, position: Vector2Int) => new Queen(owner, position),
        animation: "slide",
        animParams: {},
        klass: Queen as PieceConstructor,
    },
    {
        id: "King",
        icon: "king",
        create: (owner: PlayerColor, position: Vector2Int) => new King(owner, position),
        animation: "slide",
        animParams: {},
        klass: King as PieceConstructor,
    },
] as const;

const abilityDefinitions = [
    {
        id: "Marksman",
        icon: "🎯",
        apply: (piece: Piece, ...args: any[]) => new MarksmanAbility(piece, undefined, ...args),
        klass: MarksmanAbility as AbilityConstructor,
    },
    {
        id: "Exploding",
        icon: "💥",
        apply: (piece: Piece) => new ExplodingAbility(piece),
        klass: ExplodingAbility as AbilityConstructor,
    },
    {
        id: "Scapegoat",
        icon: "🛡️",
        apply: (piece: Piece) => new ScapegoatAbility(piece),
        klass: ScapegoatAbility as AbilityConstructor,
    },
    {
        id: "Piercing",
        icon: "⚡",
        apply: (piece: Piece) => new PiercingAbility(piece),
        klass: PiercingAbility as AbilityConstructor,
    },
    {
        id: "Bouncer",
        icon: "🏀",
        apply: (piece: Piece) => new BouncerAbility(piece),
        klass: BouncerAbility as AbilityConstructor,
    },
    {
        id: "Cannibal",
        icon: "🍔",
        apply: (piece: Piece) => new CannibalAbility(piece),
        klass: CannibalAbility as AbilityConstructor,
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
export type AbilityDefinition = (typeof abilityDefinitions)[number];
export type TileDefinition = (typeof tileDefinitions)[number];

export type PieceId = PieceDefinition["id"];
export type AbilityId = AbilityDefinition["id"];
export type TileId = TileDefinition["id"];

export const PIECE_IDS: ReadonlyArray<PieceId> = pieceDefinitions.map((def) => def.id);
export const ABILITY_IDS: ReadonlyArray<AbilityId> = abilityDefinitions.map((def) => def.id);
export const TILE_IDS: ReadonlyArray<TileId> = tileDefinitions.map((def) => def.id);

const pieceById = Object.fromEntries(pieceDefinitions.map((def) => [def.id, def])) as Record<PieceId, PieceDefinition>;
const abilityById = Object.fromEntries(abilityDefinitions.map((def) => [def.id, def])) as Record<AbilityId, AbilityDefinition>;
const tileById = Object.fromEntries(tileDefinitions.map((def) => [def.id, def])) as Record<TileId, TileDefinition>;

export function getPieceDefinition(id: PieceId): PieceDefinition {
    return pieceById[id];
}

export function getAbilityDefinition(id: AbilityId): AbilityDefinition {
    return abilityById[id];
}

export function getTileDefinition(id: TileId): TileDefinition {
    return tileById[id];
}

export function createPiece(id: PieceId, owner: PlayerColor, position: Vector2Int): Piece {
    return getPieceDefinition(id).create(owner, position);
}

export function applyAbility(id: AbilityId, piece: Piece, ...args: any[]): Piece {
    return getAbilityDefinition(id).apply(piece, ...args);
}

export function createTile(id: TileId, position?: Vector2Int, tileId?: string): Tile {
    return getTileDefinition(id).create(position, tileId);
}

export function iconForPiece(id: PieceId): string {
    return getPieceDefinition(id).icon;
}

export function iconForAbility(id: AbilityId): string {
    return getAbilityDefinition(id).icon;
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

export function abilityIdsForPiece(piece: Piece): AbilityId[] {
    const ids: AbilityId[] = [];
    let current: Piece = piece;

    while (current instanceof AbilityBase) {
        const match = abilityDefinitions.find((def) => current instanceof def.klass);
        if (match) {
            ids.push(match.id);
        }
        current = (current as AbilityBase).innerPiece;
    }

    return ids;
}


