import { useState } from 'react';
import { useGameStore } from '../../../store/gameStore';

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
        <div className="bg-white rounded-2xl p-8 w-96 shadow-lg border border-amber-100">
          <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">Blind Alliance</h1>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
                placeholder="Enter your name"
                maxLength={20}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">
                Room Code <span className="text-gray-400">(leave blank to create new room)</span>
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="ABCDEF"
                maxLength={6}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 uppercase"
              />
            </div>

            <button
              onClick={() => connect(playerName, roomCode || undefined)}
              disabled={!playerName.trim()}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors cursor-pointer"
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
      <div className="bg-white rounded-2xl p-8 w-96 shadow-lg border border-amber-100">
        {/* Connection status dot */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Lobby</h1>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Room code */}
        {roomId && (
          <div className="mb-6 text-center">
            <p className="text-sm text-gray-500 mb-1">Room Code</p>
            <button
              onClick={() => navigator.clipboard.writeText(roomId)}
              className="text-3xl font-mono font-bold tracking-widest text-amber-600 hover:text-amber-500 transition-colors cursor-pointer"
              title="Click to copy"
            >
              {roomId}
            </button>
            <p className="text-xs text-gray-400 mt-1">Share this code with other players</p>
          </div>
        )}

        {/* Player list */}
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-2">
            {players.length} / 10 players
          </p>
          <div className="space-y-2">
            {players.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 ${
                  p.id === myPlayerId ? 'ring-1 ring-amber-400' : ''
                }`}
              >
                <span className="text-gray-800">{p.name}</span>
                <div className="flex gap-2">
                  {i === 0 && (
                    <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full">
                      HOST
                    </span>
                  )}
                  {p.id === myPlayerId && (
                    <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
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
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              Start Game
            </button>
            {players.length < 3 && (
              <p className="text-xs text-gray-400 text-center mt-2">
                Minimum 3 players required
              </p>
            )}
            {players.length >= 13 && (
              <p className="text-xs text-amber-600 text-center mt-2">
                Room is full (max 13 players)
              </p>
            )}
          </div>
        ) : (
          <p className="text-center text-gray-500">
            Waiting for host to start the game...
          </p>
        )}
      </div>
    </div>
  );
}
