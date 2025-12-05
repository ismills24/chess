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
import { GreedyAI } from "../catalog/ai/GreedyAI";
import { LastPieceStandingRuleSet } from "../catalog/rulesets/LastPieceStanding";
import { ShopOffer, createShopOffer, canBuyPiece, buyPiece } from "./shop/shop";
import { generateEnemyRoster } from "./encounter/encounter";
import { generateCombatBoard } from "./encounter/boardGeneration";
import { createRandomRosterPiece } from "./util/roster";

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
}

export type RogueEvent =
    | { type: "GO_TO_SHOP" }
    | { type: "GO_TO_ENCOUNTER" }
    | { type: "BUY_PIECE" }
    | { type: "LEAVE_SHOP" }
    | { type: "PLAYER_MOVE"; move: Move }
    | { type: "RESTART" };

// =============================================================================
// Helpers
// =============================================================================

function createInitialRoster(): Piece[] {
    const roster: Piece[] = [];
    for (let i = 0; i < 4; i++) {
        roster.push(createRandomRosterPiece());
    }
    return roster;
}

function createInitialContext(): RogueContext {
    return {
        roster: createInitialRoster(),
        money: 0,
        shopOffer: createShopOffer(),
        chessManager: null,
        encounterRosterIds: [],
        lastEncounterWinner: null,
    };
}

function startEncounter(roster: Piece[]): { 
    chessManager: ChessManager; 
    encounterRosterIds: string[];
} {
    // Clone roster pieces for the encounter (so we don't mutate the originals)
    const playerPieces = roster.map(p => p.clone());
    const enemyPieces = generateEnemyRoster();
    
    // Track original IDs
    const encounterRosterIds = playerPieces.map(p => p.id);
    
    // Generate the combat board
    const board = generateCombatBoard(playerPieces, enemyPieces);
    
    // Create initial game state (White = player goes first)
    const initialState = new GameState(board, PlayerColor.White, 1, []);
    
    // Create chess manager with LastPieceStanding ruleset
    const ruleset = new LastPieceStandingRuleSet();
    const chessManager = new ChessManager(initialState, ruleset);
    
    return { chessManager, encounterRosterIds };
}

function getSurvivingRoster(
    originalRoster: Piece[],
    encounterRosterIds: string[],
    chessManager: ChessManager
): Piece[] {
    // Get IDs of player pieces still on the board
    const survivingIds = new Set(
        chessManager.currentState.board
            .getAllPieces(PlayerColor.White)
            .map(p => p.id)
    );
    
    // Filter original roster to only pieces that survived
    // We use the original roster pieces (not the clones) to preserve state
    return originalRoster.filter(piece => {
        // Find the corresponding encounter piece ID
        const index = originalRoster.indexOf(piece);
        if (index >= 0 && index < encounterRosterIds.length) {
            return survivingIds.has(encounterRosterIds[index]);
        }
        return false;
    });
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
            const { chessManager, encounterRosterIds } = startEncounter(context.roster);
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
            const ai = new GreedyAI(ruleset, 3);
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
                // Player won - get surviving pieces and reward
                const survivingRoster = getSurvivingRoster(
                    context.roster,
                    context.encounterRosterIds,
                    context.chessManager
                );
                return {
                    roster: survivingRoster,
                    money: context.money + 1, // Win reward
                    chessManager: null,
                    encounterRosterIds: [],
                    lastEncounterWinner: PlayerColor.White,
                    shopOffer: createShopOffer(), // Generate new shop offer
                };
            } else {
                // Player lost - update roster (may be empty)
                const survivingRoster = getSurvivingRoster(
                    context.roster,
                    context.encounterRosterIds,
                    context.chessManager
                );
                return {
                    roster: survivingRoster,
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

