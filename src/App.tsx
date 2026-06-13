/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { CharacterClass } from "./types";
import { Menu } from "./components/Menu";
import { GameCanvas } from "./components/GameCanvas";
import { Intro } from "./components/Intro";
import { Skull, Trophy, HelpCircle, Footprints, AlertTriangle, ChevronRight, RefreshCw, LogIn, LogOut, Flame } from "lucide-react";
import { playMenuClickSound, playStaircasePassSound, playGameOverSound, playLevelWinSound } from "./utils";

type GameScreen = "INTRO" | "MENU" | "PLAYING" | "DESCENDING" | "ASCENDING" | "GAMEOVER" | "WIN";

export default function App() {
  const [screen, setScreen] = useState<GameScreen>("INTRO");
  const [selectedClass, setSelectedClass] = useState<CharacterClass>(CharacterClass.RUNNER);
  const [currentFloor, setCurrentFloor] = useState<number>(5);

  // Stats log
  const [deathReason, setDeathReason] = useState<string>("Caught by Tobby in the corridor corridors.");

  const handleStartGame = (chosenClass: CharacterClass) => {
    playMenuClickSound();
    setSelectedClass(chosenClass);
    setCurrentFloor(5);
    setScreen("PLAYING");
  };

  const handleFloorComplete = () => {
    if (currentFloor > 1) {
      setCurrentFloor((prev) => prev - 1);
      playStaircasePassSound();
      setScreen("DESCENDING");
    } else {
      playLevelWinSound();
      setScreen("WIN");
    }
  };

  const handleFloorAscend = () => {
    if (currentFloor < 5) {
      setCurrentFloor((prev) => prev + 1);
      playStaircasePassSound();
      setScreen("ASCENDING");
    }
  };

  const handleGameOver = () => {
    playGameOverSound();
    const reasons = [
      "Staged water spill caused lethal hypothermia slipping.",
      "Stared into wire glasses field too long – physical shock.",
      "Radial shriek sound wave ruptured eardrum levels.",
      "Physical corner collision melee slam was fatal.",
      "Bleeding scratch lacerations drained remaining student vitals.",
    ];
    // select random lore flavor reason
    const randomReason = reasons[Math.floor(Math.random() * reasons.length)];
    setDeathReason(randomReason);
    setScreen("GAMEOVER");
  };

  const handleDescendStart = () => {
    playMenuClickSound();
    setScreen("PLAYING");
  };

  const handleQuit = () => {
    playMenuClickSound();
    setScreen("MENU");
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      
      {/* Top Status Border line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />

      {screen === "INTRO" && (
        <Intro onProceed={() => setScreen("MENU")} />
      )}

      {screen === "MENU" && (
        <Menu onStartGame={handleStartGame} />
      )}

      {screen === "PLAYING" && (
        <div className="flex-1 p-3 md:p-6 flex flex-col justify-center items-center">
          <GameCanvas
            characterClass={selectedClass}
            currentFloor={currentFloor}
            onFloorComplete={handleFloorComplete}
            onFloorAscend={handleFloorAscend}
            onGameOver={handleGameOver}
            onQuit={handleQuit}
            onResetFloor5={() => setCurrentFloor(5)}
          />
        </div>
      )}

      {screen === "DESCENDING" && (
        <div id="descend-transition-screen" className="flex-1 flex flex-col justify-center items-center max-w-lg mx-auto p-6 md:p-10 font-mono text-center">
          <div className="p-4 rounded-full bg-emerald-950/40 border border-emerald-500/35 mb-6 text-emerald-400 animate-pulse">
            <Footprints size={48} />
          </div>

          <h2 className="text-3xl font-extrabold tracking-widest text-emerald-500 mb-2">
            FLOOR LEVEL {currentFloor + 1} CLEARED
          </h2>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-6">
            Descending emergency evacuation stairwell
          </p>

          <p className="text-slate-300 text-sm leading-relaxed mb-8 border-y border-slate-900 py-6">
            You successfully navigated the dark concrete stairs downwards. You are now stepping onto <strong className="text-rose-450">Floor Level {currentFloor}</strong>. 
            The building grows colder as you go deeper, and the echoes of Tobby's footsteps are amplifying. Prepare your defenses!
          </p>

          <button
            onClick={handleDescendStart}
            id="btn-confirm-descend"
            className="w-full px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold tracking-widest text-sm flex items-center justify-center gap-2 group transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transform active:scale-95"
          >
            <span>DESCEND FURTHER DOWN</span>
            <ChevronRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}

      {screen === "ASCENDING" && (
        <div id="ascend-transition-screen" className="flex-1 flex flex-col justify-center items-center max-w-lg mx-auto p-6 md:p-10 font-mono text-center">
          <div className="p-4 rounded-full bg-cyan-950/40 border border-cyan-500/35 mb-6 text-cyan-400 animate-pulse">
            <Footprints size={48} className="transform -rotate-180" />
          </div>

          <h2 className="text-3xl font-extrabold tracking-widest text-cyan-400 mb-2">
            RETURNING TO UPPER FLOOR
          </h2>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-6">
            Climbing emergency evacuation stairwell backwards
          </p>

          <p className="text-slate-300 text-sm leading-relaxed mb-8 border-y border-slate-900 py-6">
            You pushed open the steel door and climbed back up the concrete stairs to <strong className="text-rose-400">Floor Level {currentFloor}</strong>. 
            All Tobbys on this floor are exactly as you left them. Backtrack with extreme caution!
          </p>

          <button
            onClick={handleDescendStart}
            id="btn-confirm-ascend"
            className="w-full px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold tracking-widest text-sm flex items-center justify-center gap-2 group transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transform active:scale-95"
          >
            <span>ENTER UPPER LEVEL</span>
            <ChevronRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}

      {screen === "GAMEOVER" && (
        <div id="game-over-screen" className="flex-1 flex flex-col justify-center items-center max-w-lg mx-auto p-6 md:p-10 font-mono text-center">
          <div className="p-4 rounded-full bg-red-950/40 border border-red-600/35 mb-6 text-red-500 animate-bounce">
            <Skull size={48} />
          </div>

          <h2 className="text-3xl font-extrabold tracking-widest text-red-600 mb-2">
            STUDENT TERMINATED
          </h2>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-6">
            Failed to Escape from Tobby
          </p>

          <div className="w-full bg-slate-900/40 border border-slate-900 rounded-xl p-4 mb-8 text-left space-y-3.5">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">LAST SEEN LOCATION:</span>
              <span className="text-xs text-slate-300 font-bold">FLOOR LEVEL {currentFloor} • school floor</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">CAUSE OF DEATH:</span>
              <span className="text-xs text-red-400 leading-relaxed font-semibold block pt-0.5">
                {deathReason}
              </span>
            </div>
          </div>

          <div className="w-full flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => handleStartGame(selectedClass)}
              id="gameover-retry-btn"
              className="flex-1 px-6 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold tracking-widest text-xs flex items-center justify-center gap-1.5 transition transform active:scale-95 shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:shadow-[0_0_25px_rgba(220,38,38,0.5)]"
            >
              <RefreshCw size={14} />
              <span>REDEPLOY PROTOTYPE</span>
            </button>
            
            <button
              onClick={handleQuit}
              id="gameover-quit-btn"
              className="px-6 py-3.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900 text-slate-300 hover:text-slate-100 transition transform active:scale-95 text-xs font-bold tracking-wider"
            >
              MAIN MENU
            </button>
          </div>
        </div>
      )}

      {screen === "WIN" && (
        <div id="game-win-screen" className="flex-1 flex flex-col justify-center items-center max-w-lg mx-auto p-6 md:p-10 font-mono text-center">
          <div className="p-4 rounded-full bg-amber-950/40 border border-amber-500/35 mb-6 text-amber-400 animate-spin transition duration-1000">
            <Trophy size={48} />
          </div>

          <h2 className="text-3xl font-extrabold tracking-widest text-amber-500 mb-2">
            SURVIVED & ESCAPED!
          </h2>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-6">
            Roof Access Secured Successfully
          </p>

          <p className="text-slate-300 text-sm leading-relaxed mb-8 border-y border-slate-900 py-6">
            You climbed the final metal ladder in Staircase A and pushed open the heavy emergency fire hatch. 
            Warm fresh air hits your face as you emerge onto the school rooftop. 
            Down below inside the dark modular corridors, you hear 150 clones of Tobby wailing in frustration, but you have successfully escaped them all!
          </p>

          <div className="w-full flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleQuit}
              id="win-mainmenu-btn"
              className="flex-1 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-extrabold tracking-widest text-xs flex items-center justify-center gap-1.5 transition transform active:scale-95"
            >
              <RefreshCw size={14} />
              <span>COMMENCE NEW ESCAPE</span>
            </button>
          </div>
        </div>
      )}

      {/* Footer Branding credits */}
      <footer className="w-full text-center py-4 text-[10px] text-slate-600 font-mono select-none bg-slate-950 border-t border-slate-900 border-opacity-50">
        ESCAPE FROM TOBBY SURVIVAL ENGINE • MADE WITH GOOGLE AI STUDIO BUILD • 2026
      </footer>
    </div>
  );
}
