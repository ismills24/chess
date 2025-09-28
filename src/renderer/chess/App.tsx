import React from "react";
import { EngineProvider } from "./EngineContext";
import { BoardView } from "./BoardView";

export const App: React.FC = () => {
    return (
        <EngineProvider>
            <BoardView />
        </EngineProvider>
    );
};
