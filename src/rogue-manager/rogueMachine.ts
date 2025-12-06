/**
 * Roguelike Chess State Machine
 * 
 * Manages the full roguelike game loop:
 * - Map: Choose between shop or encounter
 * - Shop: Buy random pieces with abilities
 * - Encounter: Combat with AI opponent
 * - GameOver: When player loses all pieces
 */

import { setup, assign, createActor } from "xstate";
import { Piece } from "../catalog/pieces/Piece";
import { PlayerColor } from "../chess-engine/primitives/PlayerColor";
import { Move } from "../chess-engine/primitives/Move";
import { GameState } from "../chess-engine/state/GameState";
import { ChessManager } from "../chess-manager/ChessManager";
import { EfficientAI } from "../catalog/ai/EfficientAI";
import { LastPieceStandingRuleSet } from "../catalog/rulesets/LastPieceStanding";
import { ShopOffer, createShopOffer, canBuyPiece, buyPiece } from "./shop/shop";
import { generateEnemyRoster } from "./encounter/encounter";
import { generateCombatBoard } from "./encounter/boardGeneration";
import { generateValueBasedRoster } from "./util/roster";

// =============================================================================
// Types
// =============================================================================

export interface RogueContext {
    /** Player's current roster of pieces (persists between encounters) */
    roster: Piece[];
    /** Player's money */
    money: number;
    /** Current shop offer (generated on entering map after encounter) */
    shopOffer: ShopOffer | null;
    /** Chess manager instance for current encounter */
    chessManager: ChessManager | null;
    /** IDs of roster pieces at the start of the current encounter (for tracking survivors) */
    encounterRosterIds: string[];
    /** The winner of the last encounter (null if not determined) */
    lastEncounterWinner: PlayerColor | null;
    /** Current round number (starts at 1, increments after each encounter) */
    round: number;
}

export type RogueEvent =
    | { type: "GO_TO_SHOP" }
    | { type: "GO_TO_ENCOUNTER" }
    | { type: "BUY_PIECE" }
    | { type: "LEAVE_SHOP" }
    | { type: "PLAYER_MOVE"; move: Move }
    | { type: "SURRENDER" }
    | { type: "RESTART" };

// =============================================================================
// Helpers
// =============================================================================

function createInitialRoster(): Piece[] {
    // Starting roster: 10 piece value, 2 ability value, minimum 2 pawns, with King
    return generateValueBasedRoster(10, 0, 2, PlayerColor.White, true);
}

function createInitialContext(): RogueContext {
    return {
        roster: createInitialRoster(),
        money: 0,
        shopOffer: createShopOffer(),
        chessManager: null,
        encounterRosterIds: [],
        lastEncounterWinner: null,
        round: 1,
    };
}

function startEncounter(roster: Piece[], round: number): { 
    chessManager: ChessManager; 
    encounterRosterIds: string[];
} {
    // Clone roster pieces for the encounter (so we don't mutate the originals)
    const playerPieces = roster.map(p => p.clone());
    
    // Calculate enemy scaling based on round
    // Base: 8 piece value, 0 ability value
    // Scaling: +2 piece value per round, +1 ability value every other round
    const enemyPieceValue = 8 + (round - 1) * 2;
    const enemyAbilityValue = Math.floor((round - 1) / 2);
    const enemyPieces = generateEnemyRoster(enemyPieceValue, enemyAbilityValue);
    
    // Track original IDs
    const encounterRosterIds = playerPieces.map(p => p.id);
    
    // Generate the combat board (6x6 default)
    const board = generateCombatBoard(playerPieces, enemyPieces, 6, 6);
    
    // Create initial game state (White = player goes first)
    const initialState = new GameState(board, PlayerColor.White, 1, []);
    
    // Create chess manager with LastPieceStanding ruleset
    const ruleset = new LastPieceStandingRuleSet();
    const chessManager = new ChessManager(initialState, ruleset);
    
    return { chessManager, encounterRosterIds };
}


// =============================================================================
// State Machine
// =============================================================================

const rogueSetup = setup({
    types: {} as {
        context: RogueContext;
        events: RogueEvent;
    },
    actions: {
        buyPieceAction: assign(({ context }) => {
            if (!context.shopOffer || !canBuyPiece(context.money, context.roster)) {
                return {};
            }
            const result = buyPiece(context.money, context.roster, context.shopOffer);
            return {
                money: result.money,
                roster: result.roster,
                shopOffer: null, // Clear offer after purchase
            };
        }),
        
        startEncounterAction: assign(({ context }) => {
            const { chessManager, encounterRosterIds } = startEncounter(context.roster, context.round);
            return {
                chessManager,
                encounterRosterIds,
                lastEncounterWinner: <PlayerColor | null> null,
            };
        }),
        
        playPlayerMove: assign(({ context, event }) => {
            if (event.type !== "PLAYER_MOVE" || !context.chessManager) {
                return {};
            }
            context.chessManager.playMove(event.move, true);
            return {
                chessManager: context.chessManager,
            };
        }),
        
        playAIMove: assign(({ context }) => {
            if (!context.chessManager) {
                return {};
            }
            const ruleset = new LastPieceStandingRuleSet();
            const ai = new EfficientAI(ruleset, { depth: 3, timeLimitMs: 10000 });
            context.chessManager.playAITurn(PlayerColor.Black, ai);
            return {
                chessManager: context.chessManager,
            };
        }),
        
        resolveEncounter: assign(({ context }) => {
            if (!context.chessManager) {
                return {};
            }
            
            const winner = context.chessManager.getWinner();
            
            if (winner === PlayerColor.White) {
                // Player won - keep all pieces, give reward, and advance to next round
                return {
                    roster: context.roster,
                    money: context.money + 1, // Win reward
                    chessManager: null,
                    encounterRosterIds: [],
                    lastEncounterWinner: PlayerColor.White,
                    shopOffer: createShopOffer(), // Generate new shop offer
                    round: context.round + 1, // Advance to next round
                };
            } else {
                // Player lost - keep all pieces, don't advance round
                return {
                    roster: context.roster,
                    chessManager: null,
                    encounterRosterIds: [],
                    lastEncounterWinner: PlayerColor.Black,
                };
            }
        }),
        
        resetGame: assign(() => createInitialContext()),
    },
    guards: {
        canBuyPiece: ({ context }) => {
            return canBuyPiece(context.money, context.roster) && context.shopOffer !== null;
        },
        
        isPlayerTurn: ({ context }) => {
            return context.chessManager?.currentState.currentPlayer === PlayerColor.White;
        },
        
        isAITurn: ({ context }) => {
            return context.chessManager?.currentState.currentPlayer === PlayerColor.Black;
        },
        
        isEncounterOver: ({ context }) => {
            return context.chessManager?.isGameOver() ?? false;
        },
        
        didPlayerWin: ({ context }) => {
            return context.chessManager?.getWinner() === PlayerColor.White;
        },
        
        didPlayerLose: ({ context }) => {
            return context.chessManager?.getWinner() === PlayerColor.Black;
        },
        
        isGameOver: ({ context }) => {
            // Game over if player has no pieces left after an encounter
            return context.roster.length === 0 && context.lastEncounterWinner === PlayerColor.Black;
        },
        
        hasRoster: ({ context }) => {
            return context.roster.length > 0;
        },
    },
});

export const rogueMachine = rogueSetup.createMachine({
    id: "rogue",
    initial: "map",
    context: createInitialContext,
    on: {
        SURRENDER: {
            target: "#rogue.map",
            actions: "resetGame",
        },
    },
    states: {
        map: {
            always: [
                {
                    guard: "isGameOver",
                    target: "gameOver",
                },
            ],
            on: {
                GO_TO_SHOP: {
                    target: "shop",
                },
                GO_TO_ENCOUNTER: {
                    target: "encounter",
                    guard: "hasRoster",
                },
            },
        },
        
        shop: {
            on: {
                BUY_PIECE: {
                    actions: "buyPieceAction",
                    guard: "canBuyPiece",
                },
                LEAVE_SHOP: {
                    target: "map",
                },
            },
        },
        
        encounter: {
            initial: "starting",
            entry: "startEncounterAction",
            states: {
                starting: {
                    always: {
                        target: "waitingForPlayerTurn",
                    },
                },
                
                waitingForPlayerTurn: {
                    always: [
                        {
                            guard: "isEncounterOver",
                            target: "resolved",
                        },
                    ],
                    on: {
                        PLAYER_MOVE: {
                            actions: "playPlayerMove",
                            target: "waitingForAIMove",
                        },
                    },
                },
                
                waitingForAIMove: {
                    entry: "playAIMove",
                    // Use delayed transition to give React time to re-render
                    after: {
                        100: [
                            {
                                guard: "isEncounterOver",
                                target: "resolved",
                            },
                            {
                                target: "waitingForPlayerTurn",
                            },
                        ],
                    },
                },
                
                resolved: {
                    entry: "resolveEncounter",
                    always: {
                        target: "#rogue.map",
                    },
                },
            },
        },
        
        gameOver: {
            on: {
                RESTART: {
                    target: "map",
                    actions: "resetGame",
                },
            },
        },
    },
});

// =============================================================================
// Actor Factory
// =============================================================================

export function createRogueActor() {
    return createActor(rogueMachine);
}

export type RogueActor = ReturnType<typeof createRogueActor>;
export type RogueSnapshot = ReturnType<RogueActor["getSnapshot"]>;

