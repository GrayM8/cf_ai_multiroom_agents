import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useRoom } from "./useRoom";
import { ChatPanel } from "./ChatPanel";
import { SidePanel } from "./SidePanel";
import { Header } from "./Header";
import { ExportModal } from "./ExportModal";

const DISPLAY_NAME_KEY = "agentworkspaces-display-name";

function randomName() {
  return "User" + Math.floor(Math.random() * 9000 + 1000);
}

export function RoomView({ roomId }: { roomId: string }) {
  const [, navigate] = useLocation();
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem(DISPLAY_NAME_KEY) || randomName(),
  );
  const room = useRoom(roomId, displayName);
  const connected = room.status === "connected";

  // Persist display name changes
  useEffect(() => {
    if (displayName.trim()) {
      localStorage.setItem(DISPLAY_NAME_KEY, displayName.trim());
    }
  }, [displayName]);

  // Auto-connect on mount
  useEffect(() => {
    room.connect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDisconnect = () => {
    room.disconnect();
    navigate("/");
  };

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <Header
        roomId={roomId}
        displayName={displayName}
        setDisplayName={setDisplayName}
        status={room.status}
        presence={room.presence}
        onDisconnect={handleDisconnect}
        onExport={() => room.sendChat("/export")}
        onReset={() => room.sendChat("/reset")}
      />

      {connected ? (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col border-r border-zinc-800">
            <ChatPanel
              messages={room.messages}
              onSend={room.sendChat}
              connected={connected}
            />
          </div>
          <div className="w-96 flex-shrink-0 overflow-hidden">
            <SidePanel
              pinned={room.pinned}
              artifacts={room.artifacts}
              artifactDetail={room.artifactDetail}
              isOwner={room.isOwner}
              roomId={roomId}
              onAddMemory={room.addMemory}
              onCreateArtifact={room.createArtifact}
              onDeleteArtifact={room.deleteArtifact}
              onGetArtifact={room.getArtifact}
              onSetArtifactDetail={room.setArtifactDetail}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-zinc-500">
          <p>Connecting to room...</p>
        </div>
      )}

      {room.exportData && (
        <ExportModal data={room.exportData} onClose={() => room.setExportData(null)} />
      )}
    </div>
  );
}
