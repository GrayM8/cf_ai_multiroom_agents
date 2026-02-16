import { useState } from "react";
import { useRoom } from "./useRoom";
import { ChatPanel } from "./ChatPanel";
import { SidePanel } from "./SidePanel";
import { Header } from "./Header";
import { ExportModal } from "./ExportModal";

function randomName() {
  return "User" + Math.floor(Math.random() * 9000 + 1000);
}

export default function App() {
  const [roomId, setRoomId] = useState(
    () => new URLSearchParams(window.location.search).get("room") ?? "demo",
  );
  const [displayName, setDisplayName] = useState(randomName);
  const room = useRoom(roomId, displayName);
  const connected = room.status === "connected";

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <Header
        roomId={roomId}
        setRoomId={setRoomId}
        displayName={displayName}
        setDisplayName={setDisplayName}
        status={room.status}
        presence={room.presence}
        isOwner={room.isOwner}
        onConnect={room.connect}
        onDisconnect={room.disconnect}
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
          <p>Connect to a room to start collaborating.</p>
        </div>
      )}

      {room.exportData && (
        <ExportModal data={room.exportData} onClose={() => room.setExportData(null)} />
      )}
    </div>
  );
}
