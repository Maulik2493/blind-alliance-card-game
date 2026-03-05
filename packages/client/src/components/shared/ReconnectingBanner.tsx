import { useGameStore } from '../../store/gameStore';

export function ReconnectingBanner() {
  const isReconnecting = useGameStore((s) => s.isReconnecting);
  const attempt = useGameStore((s) => s.reconnectAttempt);
  const disconnectedPlayers = useGameStore((s) => s.disconnectedPlayers);

  return (
    <>
      {/* Reconnecting banner — shown when this client is reconnecting */}
      {isReconnecting && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white text-center px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2">
          <span className="animate-spin">⟳</span>
          Reconnecting... (attempt {attempt}/10)
        </div>
      )}

      {/* Disconnected player notice — shown when someone else drops */}
      {disconnectedPlayers.length > 0 && !isReconnecting && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-orange-400 text-white text-center px-4 py-2 text-xs font-medium">
          {disconnectedPlayers.map((p) => p.playerName).join(', ')} disconnected — waiting to reconnect...
        </div>
      )}
    </>
  );
}
