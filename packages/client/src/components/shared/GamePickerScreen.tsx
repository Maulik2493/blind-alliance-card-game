import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';

interface GamePickerScreenProps {
  playerName: string;
  onGameSelected: (gameId: string) => void;
  onBack: () => void;
}

export function GamePickerScreen({ playerName, onGameSelected, onBack }: GamePickerScreenProps) {
  const gameList = useGameStore((s) => s.gameList);
  const gameListLoading = useGameStore((s) => s.gameListLoading);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">

      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-700 text-xl cursor-pointer"
        >
          ←
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Choose a Game</h1>
          <p className="text-sm text-gray-500">Playing as {playerName}</p>
        </div>
      </div>

      {/* Game tiles */}
      <div className="flex-1 px-4 pb-4 space-y-3 overflow-y-auto">
        {gameListLoading && (
          <div className="text-center py-12 text-gray-400">
            Loading games...
          </div>
        )}

        {!gameListLoading && gameList.map((game) => (
          <button
            key={game.gameId}
            onClick={() => setSelectedGameId(game.gameId)}
            className={`w-full text-left p-4 rounded-2xl border-2
                        transition-all active:scale-98 cursor-pointer ${
              selectedGameId === game.gameId
                ? 'border-amber-400 bg-amber-50 shadow-md'
                : 'border-gray-200 bg-white shadow-sm'
            }`}
          >
            {/* Game name + selected indicator */}
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-gray-800 text-base">
                {game.gameName}
              </h2>
              {selectedGameId === game.gameId && (
                <span className="text-amber-500 text-lg">✓</span>
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-gray-500 leading-relaxed mb-3">
              {game.description}
            </p>

            {/* Player count badge */}
            <div className="flex items-center gap-1">
              <span className="text-xs bg-gray-100 text-gray-600
                               px-2 py-1 rounded-full font-medium">
                {game.minPlayers}–{game.maxPlayers} players
              </span>
            </div>
          </button>
        ))}

        {!gameListLoading && gameList.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No games available
          </div>
        )}
      </div>

      {/* Confirm button — sticky at bottom */}
      <div className="px-4 py-4 bg-amber-50 border-t border-amber-100">
        <button
          onClick={() => selectedGameId && onGameSelected(selectedGameId)}
          disabled={!selectedGameId}
          className="w-full py-4 text-base font-bold text-white
                     bg-amber-500 hover:bg-amber-600 rounded-xl
                     transition-colors active:scale-95
                     disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {selectedGameId
            ? `Create Room — ${gameList.find((g) => g.gameId === selectedGameId)?.gameName}`
            : 'Select a game to continue'}
        </button>
      </div>

    </div>
  );
}
