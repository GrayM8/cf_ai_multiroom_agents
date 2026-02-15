// TODO: These will come from env / URL params once we build the real UI
const WORKER_URL = import.meta.env.VITE_WORKER_URL ?? "http://localhost:8787";
const _ROOM_ID = new URLSearchParams(window.location.search).get("room") ?? "default";

export default function App() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>EdgeRooms</h1>
      <p>Frontend scaffold is running.</p>
      <p>
        Worker URL: <code>{WORKER_URL}</code>
      </p>
    </div>
  );
}
