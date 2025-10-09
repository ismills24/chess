import { PieceDecoratorBase } from "./PieceDecoratorBase";
import { Piece } from "../Piece";
import { Move } from "../../primitives/Move";
import { GameState } from "../../state/GameState";
import { MoveEvent, SwapEvent, CaptureEvent } from "../../events/GameEvent";
import { EventSequence, FallbackPolicy } from "../../events/EventSequence";
import { EventSequences } from "../../events/EventSequences";
import { Interceptor } from "../../events/Interceptor";
import { CandidateMoves } from "../MovementHelper";

/**
 * Allows the piece to swap positions with any friendly piece on the board.
 * Uses a charge system - once the charge is consumed, can no longer swap.
 */
export class SwapperDecorator extends PieceDecoratorBase implements Interceptor<MoveEvent>, Interceptor<CaptureEvent> {
    private swapsLeft: number;
    readonly priority = -1; // Run before all other interceptors
    
    constructor(inner: Piece, id?: string, charges = 1) {
        super(inner, id);
        this.swapsLeft = charges;
    }
    
    getCandidateMoves(state: GameState): CandidateMoves {
        const moves: Move[] = [];
        const innerMoves = this.inner.getCandidateMoves(state);
        
        // Keep all original moves from the inner piece
        moves.push(...innerMoves.moves);
        
        // If we have swaps remaining, add swap moves to all friendly pieces
        if (this.swapsLeft > 0) {
            const allPieces = state.board.getAllPieces();
            
            for (const friendlyPiece of allPieces) {
                // Only add swaps to friendly pieces (excluding self)
                if (friendlyPiece.owner === this.inner.owner && 
                    friendlyPiece.id !== this.id) {
                    
                    moves.push(new Move(
                        this.inner.position,
                        friendlyPiece.position,
                        this.inner,
                        false // Not a capture
                    ));
                }
            }
        }
        
        return new CandidateMoves(moves);
    }
    
    intercept(ev: MoveEvent | CaptureEvent, state: GameState): EventSequence {
        // Handle CaptureEvent - replace friendly captures with swaps
        if (ev instanceof CaptureEvent) {
            console.log(`[Swapper] Intercepting CaptureEvent`);
            
            // Only intercept player actions
            if (!ev.isPlayerAction) {
                return EventSequences.Continue as EventSequence;
            }
            
            // Check if this is our piece attacking a friendly piece (swap scenario)
            if (ev.attacker.id === this.id && ev.target.owner === this.inner.owner) {
                console.log(`[Swapper] Creating swap from CaptureEvent`);
                
                // Check if we have swaps remaining
                if (this.swapsLeft <= 0) {
                    return EventSequences.Continue as EventSequence;
                }
                
                // Consume the charge
                this.swapsLeft--;
                
                // Create SwapEvent to replace the capture
                const swapEvent = new SwapEvent(
                    ev.attacker,
                    ev.target,
                    ev.attacker.position,
                    ev.target.position,
                    ev.actor,
                    this.id,
                    false
                );
                
                console.log(`[Swapper] Swapping ${ev.attacker.name} at ${ev.attacker.position} with ${ev.target.name} at ${ev.target.position}`);
                
                // AbortChain clears the rest of the stack (including MoveEvent), but we've already created the swap
                return new EventSequence([swapEvent], FallbackPolicy.AbortChain);
            }
            
            return EventSequences.Continue as EventSequence;
        }
        
        // Handle MoveEvent - this shouldn't be reached for swaps since CaptureEvent handles them
        // But we keep this as a fallback for edge cases
        if (!(ev instanceof MoveEvent)) {
            return EventSequences.Continue as EventSequence;
        }
        
        // MoveEvents for swaps shouldn't reach here since CaptureEvent already handled it
        // This is just for safety/normal moves
        return EventSequences.Continue as EventSequence;
    }
    
    protected createDecoratorClone(inner: Piece): Piece {
        return new SwapperDecorator(inner, this.id, this.swapsLeft);
    }
}

