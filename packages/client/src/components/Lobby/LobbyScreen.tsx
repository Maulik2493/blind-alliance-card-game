import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';

export function LobbyScreen() {
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const players = useGameStore((s) => s.players);
  const roomId = useGameStore((s) => s.roomId);
  const isConnected = useGameStore((s) => s.isConnected);
  const connect = useGameStore((s) => s.connect);
  const startGame = useGameStore((s) => s.startGame);

  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const isHost = players.length > 0 && players[0]?.id === myPlayerId;

  // ── Mode 1: Not yet connected ──────────────────────────────────────────

  if (!myPlayerId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-gray-800 rounded-xl p-8 w-96 shadow-2xl">
          <h1 className="text-3xl font-bold text-center mb-6">Blind Alliance</h1>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
                placeholder="Enter your name"
                maxLength={20}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Room Code <span className="text-gray-600">(leave blank to create new room)</span>
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="ABCDEF"
                maxLength={6}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              />
            </div>

            <button
              onClick={() => connect(playerName, roomCode || undefined)}
              disabled={!playerName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              Join Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Mode 2: Connected, waiting in lobby ────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-gray-800 rounded-xl p-8 w-96 shadow-2xl">
        {/* Connection status dot */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Lobby</h1>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Room code */}
        {roomId && (
          <div className="mb-6 text-center">
            <p className="text-sm text-gray-400 mb-1">Room Code</p>
            <button
              onClick={() => navigator.clipboard.writeText(roomId)}
              className="text-3xl font-mono font-bold tracking-widest text-yellow-400 hover:text-yellow-300 transition-colors cursor-pointer"
              title="Click to copy"
            >
              {roomId}
            </button>
            <p className="text-xs text-gray-500 mt-1">Share this code with other players</p>
          </div>
        )}

        {/* Player list */}
        <div className="mb-6">
          <p className="text-sm text-gray-400 mb-2">
            {players.length} / 10 players
          </p>
          <div className="space-y-2">
            {players.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center justify-between bg-gray-700 rounded-lg px-3 py-2 ${
                  p.id === myPlayerId ? 'ring-1 ring-blue-500' : ''
                }`}
              >
                <span className="text-white">{p.name}</span>
                <div className="flex gap-2">
                  {i === 0 && (
                    <span className="text-xs bg-yellow-600 text-white px-2 py-0.5 rounded-full">
                      HOST
                    </span>
                  )}
                  {p.id === myPlayerId && (
                    <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                      YOU
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Start / Wait */}
        {isHost ? (
          <div>
            <button
              onClick={startGame}
              disabled={players.length < 3}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              Start Game
            </button>
            {players.length < 3 && (
              <p className="text-xs text-gray-500 text-center mt-2">
                Minimum 3 players required
              </p>
            )}
          </div>
        ) : (
          <p className="text-center text-gray-400">
            Waiting for host to start the game...
          </p>
        )}
      </div>
    </div>
  );
}
