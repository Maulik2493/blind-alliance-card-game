import { useGameStore } from '../../../store/gameStore';

export function GameLog() {
  const gameLog = useGameStore((s) => s.gameLog);
  const clearLog = useGameStore((s) => s.clearLog);

  const reversedLog = [...gameLog].reverse();

  return (
    <div className="border-t border-gray-200 p-3 text-xs font-mono text-emerald-700 bg-white h-full flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <span className="text-gray-500 uppercase tracking-wider text-xs">Game Log</span>
        <button
          onClick={clearLog}
          className="text-gray-400 hover:text-gray-800 text-xs cursor-pointer"
        >
          Clear
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-0.5">
        {reversedLog.map((entry) => (
          <div key={entry.id}>
            <span className="text-gray-400">[{entry.timestamp}]</span> {entry.message}
          </div>
        ))}
        {reversedLog.length === 0 && (
          <span className="text-gray-400">No log entries yet</span>
        )}
      </div>
    </div>
  );
}
