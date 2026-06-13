/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Play, Shield, Key, Scroll, HelpCircle, Heart, EyeOff, MapPin } from "lucide-react";

interface IntroProps {
  onProceed: () => void;
}

export function Intro({ onProceed }: IntroProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 md:p-10 font-sans selection:bg-rose-500 selection:text-white relative overflow-hidden">
      {/* Decorative ambient highlights */}
      <div className="absolute inset-0 bg-radial-gradient from-red-950/20 via-slate-950 to-black opacity-80 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 animate-pulse" />

      {/* Hero Header */}
      <header className="z-10 text-center max-w-3xl mx-auto mt-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-950/40 border border-red-500/20 rounded-full text-red-400 text-xs font-mono tracking-widest uppercase mb-4 animate-pulse">
          <HelpCircle size={12} /> CLASSROOM PROTOCOL ACTIVATED
        </div>
        <h1 className="text-4xl md:text-7xl font-mono font-extrabold tracking-widest bg-clip-text text-transparent bg-gradient-to-b from-red-500 to-rose-700 drop-shadow-[0_0_20px_rgba(220,38,38,0.35)] select-none uppercase">
          ESCAPE FROM TOBBY
        </h1>
        <p className="mt-4 text-slate-400 font-mono text-sm max-w-lg mx-auto leading-relaxed border-t border-slate-900 pt-3">
          SCHOOL FLOOR SURVIVAL EXPERIMENT
        </p>
      </header>

      {/* Main Lore & Guide Cards */}
      <main className="z-10 max-w-4xl mx-auto w-full my-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        
        {/* Lore Card */}
        <div className="flex flex-col justify-between p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm shadow-xl hover:border-slate-700 transition-all duration-300">
          <div>
            <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-bold uppercase tracking-wider mb-4 border-b border-slate-800/80 pb-2">
              <Scroll size={14} /> The Backstory
            </div>
            <h2 className="text-xl font-bold font-mono text-slate-100 mb-3 tracking-wide">
              Eerie Clone Quarantine
            </h2>
            <div className="text-sm text-slate-300 leading-relaxed space-y-3 font-sans">
              <p>
                In a quiet high school, a rogue classroom experiment went catastrophically wrong. A mysterious entity named <strong className="text-rose-400">Tobby</strong> has duplicated itself into dozens of aggressive clones!
              </p>
              <p>
                The school has been sealed off. All emergency stairs are locked. To survive, you must navigate from Floor 5 down to Floor 1, avoiding the Tobby clones patrolling the dark, modular blueprints.
              </p>
              <p className="text-xs text-slate-400 italic">
                Tobby clones are highly hostile. They can hear your heavy breathing, sense movement, spill water slimes, and rupture eardrums with shriek waves of sound.
              </p>
            </div>
          </div>

          <div className="mt-6 p-3 bg-red-950/20 border border-red-900/30 rounded-xl flex gap-3 items-start">
            <span className="p-1 px-2 text-xs bg-red-600/20 text-red-400 font-bold rounded">MANDATE</span>
            <span className="text-[11px] text-slate-400 leading-snug">
              Spawn points are restricted exclusively to safe classroom quadrants on Floor 5. Once eliminated, you will always be returned to a safe classroom start on Floor 5.
            </span>
          </div>
        </div>

        {/* Hazards & Mechanics Card */}
        <div className="flex flex-col justify-between p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm shadow-xl hover:border-slate-700 transition-all duration-300">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider mb-4 border-b border-slate-800/80 pb-2">
              <Shield size={14} /> Survival Manual
            </div>
            <h2 className="text-xl font-bold font-mono text-slate-100 mb-3 tracking-wide">
              Tactical Guidelines
            </h2>
            
            <div className="space-y-4 text-xs font-mono">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded bg-emerald-950 text-emerald-400 mt-0.5">
                  <Heart size={14} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200 uppercase">NO AUTO-REGENERATION</h4>
                  <p className="text-slate-400 leading-relaxed text-[11px] pt-0.5">
                    Your health will <strong className="text-red-400">NOT recover back automatically</strong>! You must explore classrooms and offices to find green <strong className="text-emerald-400">Medicine Medical Kits</strong> to patch up lacerations.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded bg-amber-950 text-amber-400 mt-0.5">
                  <EyeOff size={14} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200 uppercase">HALLWAY SENTRIES</h4>
                  <p className="text-slate-400 leading-relaxed text-[11px] pt-0.5">
                    Extra Tobby clones patrol the main <strong className="text-amber-400">Corridor Hallway</strong> of the school randomly. Keep out of their visual gaze, and stay quiet.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded bg-blue-950 text-blue-400 mt-0.5">
                  <MapPin size={14} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200 uppercase">TOILETS CLEARANCE</h4>
                  <p className="text-slate-400 leading-relaxed text-[11px] pt-0.5">
                    The washing toilets area has been renovated with clear stall alignments to prevent accidental player trapping. Watch out for hazards!
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-800/60 pt-4 text-xs font-mono justify-self-end">
            <span className="text-slate-500 uppercase tracking-wider block mb-2">Controls:</span>
            <div className="flex flex-wrap gap-2 text-slate-300">
              <span className="px-1.5 py-0.5 bg-slate-850 rounded border border-slate-850">WASD</span>
              <span className="text-slate-600">or</span>
              <span className="px-1.5 py-0.5 bg-slate-850 rounded border border-slate-850">Arrow Keys</span>
              <span className="text-slate-500">to move</span>
              <span className="text-slate-600">|</span>
              <span className="px-1.5 py-0.5 bg-slate-850 rounded border border-slate-850">Spacebar</span>
              <span className="text-slate-500">to trigger Active Ability</span>
            </div>
          </div>
        </div>

      </main>

      {/* Navigation Controls */}
      <footer className="z-10 max-w-4xl mx-auto w-full flex justify-center items-center py-4">
        <button
          onClick={onProceed}
          id="btn-goto-characters"
          className="px-14 py-4 rounded-xl bg-gradient-to-r from-red-650 via-rose-600 to-rose-700 hover:from-red-600 hover:to-rose-600 text-white font-mono font-bold tracking-widest text-lg shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:shadow-[0_0_35px_rgba(244,63,94,0.6)] transition-all duration-300 transform active:scale-95 flex items-center gap-2 group"
        >
          <span>ENTER SUBJECT DISCOVERY</span>
          <Play size={18} className="fill-white group-hover:translate-x-1 transition-transform" />
        </button>
      </footer>
    </div>
  );
}
