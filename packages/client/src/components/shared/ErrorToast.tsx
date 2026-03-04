import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';

export function ErrorToast() {
  const lastError = useGameStore((s) => s.lastError);
  const clearError = useGameStore((s) => s.clearError);

  useEffect(() => {
    if (lastError) {
      const timer = setTimeout(() => clearError(), 4000);
      return () => clearTimeout(timer);
    }
  }, [lastError, clearError]);

  if (!lastError) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 flex justify-between items-center">
      <span>{lastError}</span>
      <button onClick={clearError} className="text-white font-bold text-lg leading-none cursor-pointer">
        ✕
      </button>
    </div>
  );
}
