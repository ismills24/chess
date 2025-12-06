import React, { useMemo } from "react";
import { useEngine, useEngineState } from "./EngineContext";
import { GameEvent } from "../../chess-engine/events/EventRegistry";
import { MoveEvent, CaptureEvent, DestroyEvent, TurnStartEvent, TurnEndEvent, TurnAdvancedEvent, TileChangedEvent, PieceChangedEvent } from "../../chess-engine/events/EventRegistry";
import "./debugPanel.css";

interface DebugPanelProps {
    isOpen: boolean;
    onToggle: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ isOpen, onToggle }) => {
    const engine = useEngine();
    const manager = engine.manager;
    // Use useEngineState to trigger re-renders when state changes
    const state = useEngineState(); // This ensures we re-render when moves happen
    
    // Get moves with events (skip initial state at index 0)
    // Read history directly on each render - useEngineState() ensures we re-render on moves
    const history = manager.history;
    const movesWithEvents = history.slice(1).map((entry, index) => ({
        moveNumber: index + 1,
        state: entry.state,
        events: entry.eventLog,
        resolveTimeMs: entry.resolveTimeMs,
    }));

    if (!isOpen) {
        return (
            <button className="debug-panel-toggle" onClick={onToggle}>
                🐛 Debug
            </button>
        );
    }

    return (
        <div className="debug-panel">
            <div className="debug-panel-header">
                <h3>Debug Panel</h3>
                <button className="debug-panel-close" onClick={onToggle}>
                    ×
                </button>
            </div>
            <div className="debug-panel-content">
                {movesWithEvents.length === 0 ? (
                    <div className="debug-panel-empty">No moves yet</div>
                ) : (
                    <div className="debug-panel-moves">
                        {movesWithEvents.map((move, idx) => (
                            <MoveDebugEntry key={idx} move={move} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

interface MoveDebugEntryProps {
    move: {
        moveNumber: number;
        state: any;
        events: readonly GameEvent[];
        resolveTimeMs?: number;
    };
}

const MoveDebugEntry: React.FC<MoveDebugEntryProps> = ({ move }) => {
    const [expanded, setExpanded] = React.useState(false);

    const formatTime = (ms?: number): string => {
        if (ms === undefined) return "N/A";
        if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
        if (ms < 1000) return `${ms.toFixed(2)}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };

    const eventTypeCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        move.events.forEach(event => {
            const type = event.constructor.name;
            counts[type] = (counts[type] || 0) + 1;
        });
        return counts;
    }, [move.events]);

    return (
        <div className="debug-move-entry">
            <div 
                className="debug-move-header"
                onClick={() => setExpanded(!expanded)}
            >
                <span className="debug-move-number">Move #{move.moveNumber}</span>
                <span className="debug-move-stats">
                    {move.events.length} event{move.events.length !== 1 ? 's' : ''}
                    {move.resolveTimeMs !== undefined && (
                        <span className="debug-move-time">
                            {' • '}
                            <strong>{formatTime(move.resolveTimeMs)}</strong>
                        </span>
                    )}
                </span>
                <span className="debug-move-toggle">{expanded ? '▼' : '▶'}</span>
            </div>
            {expanded && (
                <div className="debug-move-details">
                    <div className="debug-event-summary">
                        <strong>Event Types:</strong>
                        <div className="debug-event-type-list">
                            {Object.entries(eventTypeCounts).map(([type, count]) => (
                                <span key={type} className="debug-event-type-badge">
                                    {type}: {count}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="debug-events-list">
                        {move.events.map((event, idx) => (
                            <EventDebugItem key={idx} event={event} index={idx} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

interface EventDebugItemProps {
    event: GameEvent;
    index: number;
}

const EventDebugItem: React.FC<EventDebugItemProps> = ({ event, index }) => {
    const getEventDetails = (event: GameEvent): string => {
        if (event instanceof MoveEvent) {
            return `${event.subtype ? event.subtype + ": " : ""}${event.piece.name} ${event.from.toString()} → ${event.to.toString()}`;
        }
        if (event instanceof CaptureEvent) {
            return `${event.subtype ? event.subtype + ": " : ""}${event.attacker.name} captures ${event.target.name} at ${event.target.position.toString()}`;
        }
        if (event instanceof DestroyEvent) {
            return `${event.subtype ? event.subtype + ": " : ""}${event.target.name} destroyed at ${event.target.position.toString()}`;
        }
        if (event instanceof TurnStartEvent) {
            return `Turn ${event.turnNumber} starts (${event.player})`;
        }
        if (event instanceof TurnEndEvent) {
            return `Turn ${event.turnNumber} ends (${event.player})`;
        }
        if (event instanceof TurnAdvancedEvent) {
            return `Turn advances to ${event.turnNumber} (${event.nextPlayer})`;
        }
        if (event instanceof TileChangedEvent) {
            return `Tile changed at ${event.position.toString()}`;
        }
        if (event instanceof PieceChangedEvent) {
            return `Piece changed at ${event.position.toString()}`;
        }
        return event.description || event.constructor.name;
    };

    return (
        <div className="debug-event-item">
            <span className="debug-event-index">[{index}]</span>
            <span className="debug-event-type">{event.constructor.name}</span>
            <span className="debug-event-details">{getEventDetails(event)}</span>
            {event.isPlayerAction && (
                <span className="debug-event-player-action">Player Action</span>
            )}
        </div>
    );
};

