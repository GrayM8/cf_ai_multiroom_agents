export interface ChatMsg {
  type: "chat";
  user: string;
  text: string;
  ts: number;
}

export interface PinnedMemory {
  goal?: string;
  facts: string[];
  decisions: string[];
  todos: string[];
}

export interface ArtifactMeta {
  id: string;
  type: string;
  title: string;
  createdAt: number;
  createdBy: string;
}

export interface ArtifactFull extends ArtifactMeta {
  content: string;
}

export type ConnectionStatus = "disconnected" | "connecting" | "connected";
