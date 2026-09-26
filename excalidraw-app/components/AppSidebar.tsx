import { DefaultSidebar, Sidebar } from "@excalidraw/excalidraw";
import { useUIAppState } from "@excalidraw/excalidraw/context/ui-appState";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { ClaudePanel } from "../ai/ClaudePanel";
import { useBridgeState } from "../ai/bridgeClient";

export const CLAUDE_SIDEBAR_TAB = "claude";

// The upstream Excalidraw+ trial promo tabs (comments, presentation) are
// removed in this fork; Excalidraw+ is still credited in the main menu and the
// fork notice.
export const AppSidebar = ({
  excalidrawAPI,
}: {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
}) => {
  const { openSidebar } = useUIAppState();
  const { aiEnabled } = useBridgeState();

  return (
    <DefaultSidebar>
      <DefaultSidebar.TabTriggers>
        <Sidebar.TabTrigger
          tab={CLAUDE_SIDEBAR_TAB}
          title={aiEnabled ? "AI assistant" : "MCP and templates"}
          style={{
            opacity: openSidebar?.tab === CLAUDE_SIDEBAR_TAB ? 1 : 0.4,
            fontFamily: "var(--ui-font)",
            fontWeight: 700,
            fontSize: 11,
          }}
        >
          {aiEnabled ? "AI" : "MCP"}
        </Sidebar.TabTrigger>
      </DefaultSidebar.TabTriggers>
      <Sidebar.Tab tab={CLAUDE_SIDEBAR_TAB} className="app-sidebar-claude-tab">
        <ClaudePanel api={excalidrawAPI} />
      </Sidebar.Tab>
    </DefaultSidebar>
  );
};
