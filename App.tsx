import React, { useState, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import { GameState } from './types';
import { Play, RotateCcw, Trophy } from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [resetCounter, setResetCounter] = useState(0);

  const startGame = useCallback(() => {
    setGameState(GameState.PLAYING);
    setResetCounter(c => c + 1);
  }, []);

  const handleGameOver = useCallback((newState: GameState) => {
    if (newState === GameState.GAME_OVER) {
      setHighScore(prev => Math.max(prev, score));
    }
    setGameState(newState);
  }, [score]);

  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden select-none font-sans">
      {/* Game Layer */}
      <div className="absolute inset-0 z-0">
        <GameCanvas 
          gameState={gameState} 
          setGameState={handleGameOver}
          setScore={setScore}
          triggerReset={resetCounter}
        />
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">
        
        {/* Header HUD */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
             <h1 className="text-2xl font-bold text-white tracking-widest uppercase drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]">
               Neon Dash
             </h1>
             <div className="text-cyan-400 text-sm font-mono">Build 1.0.0</div>
          </div>

          <div className="flex flex-col items-end gap-2">
             <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10">
                <span className="text-3xl font-black text-white">{Math.floor(score)}</span>
                <span className="text-xs text-gray-400 uppercase tracking-wide">Score</span>
             </div>
             {highScore > 0 && (
                 <div className="flex items-center gap-2 text-yellow-400 text-sm font-bold shadow-black drop-shadow-md">
                     <Trophy size={14} />
                     <span>HI: {Math.floor(highScore)}</span>
                 </div>
             )}
          </div>
        </div>

        {/* Center Menus */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
          
          {/* Main Menu */}
          {gameState === GameState.MENU && (
            <div className="bg-black/60 backdrop-blur-xl p-10 rounded-2xl border border-cyan-500/30 shadow-[0_0_50px_rgba(0,242,255,0.2)] text-center animate-in fade-in zoom-in duration-300">
               <h2 className="text-5xl font-black text-white mb-2 italic tracking-tighter" 
                   style={{ textShadow: '4px 4px 0px #00f2ff' }}>
                 NEON DASH
               </h2>
               <p className="text-gray-300 mb-8 font-mono text-sm">CLICK or SPACE to JUMP</p>
               
               <button 
                 onClick={startGame}
                 className="group relative px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xl uppercase tracking-wider skew-x-[-10deg] transition-all hover:scale-105 active:scale-95"
               >
                 <span className="block skew-x-[10deg] flex items-center gap-3">
                   <Play fill="currentColor" /> Start Game
                 </span>
                 <div className="absolute inset-0 border-2 border-white opacity-20 group-hover:opacity-40 rounded-sm" />
               </button>
            </div>
          )}

          {/* Game Over Screen */}
          {gameState === GameState.GAME_OVER && (
            <div className="bg-black/80 backdrop-blur-xl p-10 rounded-2xl border border-red-500/30 shadow-[0_0_50px_rgba(255,0,85,0.3)] text-center animate-in fade-in zoom-in duration-300">
               <h2 className="text-5xl font-black text-white mb-2 italic tracking-tighter"
                   style={{ textShadow: '4px 4px 0px #ff0055' }}>
                 CRASHED!
               </h2>
               <div className="flex flex-col gap-1 mb-8">
                 <span className="text-gray-400 text-lg">Score: <span className="text-white font-bold">{Math.floor(score)}</span></span>
                 {score >= highScore && score > 0 && (
                   <span className="text-yellow-400 font-bold animate-pulse">NEW HIGH SCORE!</span>
                 )}
               </div>
               
               <button 
                 onClick={startGame}
                 className="group relative px-8 py-4 bg-red-500 hover:bg-red-400 text-white font-bold text-xl uppercase tracking-wider skew-x-[-10deg] transition-all hover:scale-105 active:scale-95"
               >
                 <span className="block skew-x-[10deg] flex items-center gap-3">
                   <RotateCcw /> Retry
                 </span>
               </button>
            </div>
          )}

        </div>

        {/* Footer Hint */}
        {gameState === GameState.PLAYING && (
            <div className="w-full text-center pb-4 opacity-50 animate-pulse">
                <span className="text-white font-mono text-xs tracking-[0.2em] uppercase">Tap to Jump</span>
            </div>
        )}
      </div>
    </div>
  );
};

export default App;
