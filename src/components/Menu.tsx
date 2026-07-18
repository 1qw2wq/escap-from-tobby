/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { CharacterClass } from "../types";
import { MARCUS_SVG, FAIBE_SVG, RUNNER_SVG } from "../data";
import { Skull, ShieldAlert, Zap, RefreshCw, Sparkles, HelpCircle, BookOpen } from "lucide-react";
import { playMenuClickSound } from "../utils";
import { SurvivalGuide } from "./SurvivalGuide";

interface MenuProps {
  onStartGame: (selectedClass: CharacterClass) => void;
}

export function Menu({ onStartGame }: MenuProps) {
  const [selected, setSelected] = useState<CharacterClass>(CharacterClass.RUNNER);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const characters = [
    {
      id: CharacterClass.RUNNER,
      name: "Normal Student",
      title: "The Runner",
      hp: 20,
      speed: "1.5x (75 px/s)",
      color: "border-blue-500 bg-blue-950/40 text-blue-200",
      accent: "text-blue-400 bg-blue-900/10",
      svg: RUNNER_SVG,
      desc: "An athletic, slim student wearing a blue hoodie and red sneakers. Passive athletic acceleration allows him to lose threats easily.",
      abilityName: "Fleet Footwork",
      abilityType: "Passive",
      abilityDesc: "Always moves at a whopping 1.5x speed. Perfect for swift navigation and escaping direct pinches.",
      cooldown: "None (Always Active)",
    },
    {
      id: CharacterClass.MARCUS,
      name: "Marcus",
      title: "The Tank",
      hp: 30,
      speed: "1.0x (50 px/s)",
      color: "border-green-600 bg-green-950/40 text-green-200",
      accent: "text-green-400 bg-green-900/10",
      svg: MARCUS_SVG,
      desc: "Chubby stature, green school vest over a white buttoned shirt, and square thick glasses. Capable of absorbing massive physical punishment.",
      abilityName: "Ram Charge",
      abilityType: "Active (Spacebar)",
      abilityDesc: "Builds momentum to reach Full Speed (1.5x). Colliding with any Tobby while charging instantly obliterates them.",
      cooldown: "30-second cooldown on hit.",
    },
    {
      id: CharacterClass.FAIBE,
      name: "Faibe",
      title: "The Controller",
      hp: 15,
      speed: "1.0x (50 px/s)",
      color: "border-rose-600 bg-rose-950/40 text-rose-200",
      accent: "text-rose-400 bg-rose-900/10",
      svg: FAIBE_SVG,
      desc: "Middle-aged Chinese supervisor with wavy permed hair, a traditional patterned red mandarin-collar blouse, and a green jade bracelet.",
      abilityName: "Pacify Charm",
      abilityType: "Active (Spacebar)",
      abilityDesc: "Emits a harmonic pulse that pacifies all 30 Tobbys on the current floor for 15 seconds. Pacified Tobbys freeze and do no damage.",
      cooldown: "45-second cooldown.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 md:p-10 font-sans selection:bg-rose-500 selection:text-white relative overflow-hidden">
      
      {/* Decorative Atmosphere lines */}
      <div className="absolute inset-0 bg-radial-gradient from-slate-900 via-slate-950 to-black opacity-60 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-transparent to-red-600 animate-pulse" />
      
      {/* Head section */}
      <header className="z-10 text-center max-w-2xl mx-auto mt-4">
        <h1 className="text-4xl md:text-6xl font-mono font-extrabold tracking-widest text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)] select-none">
          ESCAPE FROM TOBBY
        </h1>
        <p className="mt-3 text-slate-400 font-mono text-sm max-w-lg mx-auto leading-relaxed border-t border-slate-800/80 pt-3">
          SCHOOL FLOOR SURVIVAL HORROR • LEVEL 1 TO 5
        </p>
      </header>

      {/* Grid: Character Selection */}
      <main className="z-10 max-w-6xl mx-auto w-full my-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {characters.map((char) => {
          const isSelected = selected === char.id;
          return (
            <div
              key={char.id}
              onClick={() => {
                playMenuClickSound();
                setSelected(char.id);
              }}
              id={`char-card-${char.id}`}
              className={`group relative flex flex-col cursor-pointer rounded-2xl border-2 p-5 transition-all duration-300 transform hover:-translate-y-1 ${
                isSelected
                  ? `${char.color} shadow-[0_0_25px_rgba(244,63,94,0.15)] ring-1 ring-rose-500`
                  : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900/90"
              }`}
            >
              {/* Highlight badge deleted as per request */}

              {/* Character visual SVG wrapper */}
              <div className="h-44 flex items-center justify-center p-2 mb-4 bg-slate-950/80 rounded-xl border border-slate-800/80 overflow-hidden relative">
                {/* SVG embedding dynamically */}
                <div
                  className={`w-full h-full flex items-center justify-center transition-transform duration-500 group-hover:scale-105`}
                  dangerouslySetInnerHTML={{ __html: char.svg }}
                />
              </div>

              {/* Identity labels */}
              <div className="flex justify-between items-baseline mb-1">
                <h3 className="text-xl font-bold font-mono text-slate-100 group-hover:text-rose-400 transition-colors">
                  {char.name}
                </h3>
                <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-md bg-slate-800/80 text-rose-300 tracking-wider">
                  {char.title}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed mb-4 min-h-[48px]">
                {char.desc}
              </p>

              {/* Core stat sliders */}
              <div className="space-y-2.5 border-t border-slate-800/80 pt-4 mb-4 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1.5 uppercase">
                    <Skull size={13} className="text-red-500/80" /> Vital Endurance:
                  </span>
                  <span className="font-bold text-slate-200">{char.hp} HP</span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-600 rounded-full"
                    style={{ width: `${(char.hp / 30) * 100}%` }}
                  />
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-500 flex items-center gap-1.5 uppercase">
                    <Zap size={13} className="text-amber-500/80" /> Movement Velocity:
                  </span>
                  <span className="font-bold text-slate-200">{char.speed}</span>
                </div>
              </div>

              {/* Ability Dashboard Block */}
              <div className={`mt-auto rounded-xl p-3.5 border border-slate-800/40 ${char.accent}`}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles size={14} className="text-rose-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-300 font-mono">
                    {char.abilityName}
                  </span>
                </div>
                
                <p className="text-[11px] text-slate-300 leading-normal mb-2">
                  {char.abilityDesc}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono border-t border-slate-800/50 pt-2 opacity-85">
                  <span>Usage: {char.abilityType}</span>
                  <span className="flex items-center gap-1 text-rose-300/90 font-semibold">
                    <RefreshCw size={10} /> {char.cooldown}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {/* Foot Controls section */}
      <footer className="z-10 border-t border-slate-900 pt-6 max-w-4xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Game Rules / Brief */}
        <div className="text-left max-w-md font-mono text-xs text-slate-500 space-y-1 bg-slate-900/20 p-3 rounded-lg border border-slate-900/65">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-1 uppercase tracking-wider text-[11px]">
            <HelpCircle size={14} className="text-amber-500" /> Instructions Guide
          </div>
          <p>• Avoid <span className="text-red-400">30 Tobby clones</span> roaming the modular floors.</p>
          <p>• Reach <span className="text-emerald-400">Staircase A</span> (Top-Right) to ascend floors (5 levels to escape).</p>
          <p>• Use <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">WASD</kbd> or <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">Arrows</kbd> to crawl. <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">SPACE</kbd> triggers Ability.</p>
          <button
            onClick={() => {
              playMenuClickSound();
              setIsGuideOpen(true);
            }}
            id="menu-open-guide-btn"
            className="mt-2.5 w-full py-1.5 px-3 rounded-lg bg-red-950/40 hover:bg-red-900/60 transition-all border border-red-900/40 text-[10px] text-red-400 hover:text-white flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider"
          >
            <BookOpen size={12} /> OPEN FULL SURVIVAL HANDBOOK
          </button>
        </div>

        {/* Start trigger */}
        <button
          onClick={() => onStartGame(selected)}
          id="btn-start-game"
          className="w-full md:w-auto px-12 py-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-mono font-bold tracking-widest text-lg shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_35px_rgba(220,38,38,0.7)] transition-all duration-350 transform active:scale-95"
        >
          DEPLOY STUDENT ESCAPE
        </button>
      </footer>

      {/* Interactive Survival Guide Modal */}
      <SurvivalGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}
