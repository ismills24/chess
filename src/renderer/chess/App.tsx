import React, { useState } from "react";
import { EngineProvider } from "./EngineContext";
import { BoardView } from "./BoardView";
import { DebugPanel } from "./DebugPanel";

export const App: React.FC = () => {
    const [debugPanelOpen, setDebugPanelOpen] = useState(false);

    return (
        <EngineProvider>
            <BoardView />
            <DebugPanel isOpen={debugPanelOpen} onToggle={() => setDebugPanelOpen(!debugPanelOpen)} />
        </EngineProvider>
    );
};
