/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { BookOpen, X, Key, Shield, Sparkles, AlertTriangle, HelpCircle, Activity, ShoppingBag, Eye } from "lucide-react";

interface SurvivalGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

type GuideTab = "CONTROLS" | "CLASSES" | "ITEMS" | "THREATS";

export function SurvivalGuide({ isOpen, onClose }: SurvivalGuideProps) {
  const [activeTab, setActiveTab] = useState<GuideTab>("CONTROLS");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-mono">
      <div 
        id="survival-handbook"
        className="w-full max-w-2xl bg-slate-950 border border-red-900/50 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.25)] flex flex-col overflow-hidden max-h-[85vh] animate-in fade-in zoom-in duration-200"
      >
        {/* Header bar */}
        <div className="bg-gradient-to-r from-red-950/70 to-slate-950 border-b border-red-900/40 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-red-500">
            <BookOpen size={20} className="animate-pulse" />
            <span className="font-extrabold tracking-widest text-sm md:text-base">SURVIVAL HANDBOOK : TOBBY THREAT SECURE INTELLIGENCE</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="bg-slate-900/50 border-b border-slate-900 p-2 flex flex-wrap gap-1 md:gap-2">
          {(["CONTROLS", "CLASSES", "ITEMS", "THREATS"] as GuideTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wider transition-all border ${
                activeTab === tab
                  ? "bg-red-950/40 text-red-400 border-red-800/60"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Dynamic content scroll area */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-300">
          
          {activeTab === "CONTROLS" && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="bg-slate-900/10 border border-slate-900 rounded-xl p-4">
                <h4 className="text-sm font-extrabold text-amber-500 mb-2 flex items-center gap-1.5">
                  <Key size={15} /> PLAYER MOVEMENT
                </h4>
                <div className="space-y-2 mt-1">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-slate-100 flex-shrink-0 min-w-[100px]">Keyboard:</span>
                    <span>Use <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded">W</kbd> <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded">A</kbd> <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded">S</kbd> <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded">D</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded">←</kbd> <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded">↑</kbd> <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded">↓</kbd> <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded">→</kbd> keys to roll. Direct slide collision has been refined to allow smooth sliding past desk edges.</span>
                  </div>
                  <div className="flex items-start gap-2 pt-2 border-t border-slate-900">
                    <span className="font-bold text-slate-100 flex-shrink-0 min-w-[100px]">Mouse/Touch:</span>
                    <span>Click and hold inside the viewport to guide the player toward your cursor trajectory automatically. Excellent for sweeping turns.</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/10 border border-slate-900 rounded-xl p-4">
                <h4 className="text-sm font-extrabold text-cyan-400 mb-2 flex items-center gap-1.5">
                  <Activity size={15} /> ACTIONS & SKILLS
                </h4>
                <div className="space-y-3 mt-1">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-slate-100 flex-shrink-0 min-w-[100px]"><kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-850 rounded">SPACEBAR</kbd>:</span>
                    <span>Activates your chosen student's Class Special Defense capacity. Check Cooldown clocks on the bottom HUD sidebar.</span>
                  </div>
                  <div className="flex items-start gap-2 pt-2 border-t border-slate-900">
                    <span className="font-bold text-slate-100 flex-shrink-0 min-w-[100px]"><kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-850 rounded">E</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-850 rounded">F</kbd>:</span>
                    <span><strong>MELEE STRIKE / PUNCH:</strong> Knocks down Tobby clones in a short visual hemisphere arc. Inflicts 2 Damage to clear paths. 
                    <br />
                    <span className="text-amber-500 font-semibold uppercase text-[10px]">▲ NOTE: Supports a highly strict, tactical 1.0 second cooldown period.</span></span>
                  </div>
                  <div className="flex items-start gap-2 pt-2 border-t border-slate-900">
                    <span className="font-bold text-slate-100 flex-shrink-0 min-w-[100px]"><kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-850 rounded">L_SHIFT</kbd>:</span>
                    <span><strong>SENSE BURST MODE:</strong> Consumes burst energy to step into visual golden bullet hyper-speed mode. Recharge occurs passively.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "CLASSES" && (
            <div className="space-y-3.5 animate-in fade-in duration-100">
              <div className="border border-blue-950 bg-blue-950/5 p-3.5 rounded-xl space-y-1">
                <div className="flex justify-between items-center text-blue-400">
                  <span className="font-extrabold text-sm flex items-center gap-1.5">🏃 NORMAL STUDENT [THE RUNNER]</span>
                  <span className="text-[10px] font-bold uppercase border border-blue-900/60 px-1.5 rounded">20 HP • Athletic</span>
                </div>
                <p className="text-slate-400 mt-1">
                  Equipped with <strong>passive athletic speed of 1.5x</strong>. Outruns most Tobby patrol fields easily. He has no cooldown or charge constraints to limit his rolling velocity. Perfect class for speedy map sweeps.
                </p>
              </div>

              <div className="border border-green-950 bg-green-950/5 p-3.5 rounded-xl space-y-1">
                <div className="flex justify-between items-center text-green-400">
                  <span className="font-extrabold text-sm flex items-center gap-1.5">🛡️ MARCUS [THE TANK]</span>
                  <span className="text-[10px] font-bold uppercase border border-green-900/60 px-1.5 rounded">30 HP • Ram Blockade</span>
                </div>
                <p className="text-slate-400 mt-1">
                  High vitals allows him to take hits. Active capacity is <strong>Ram Charge (Spacebar)</strong>: sprints forward instantly, slamming, cracking, and obliterating any Tobby clone in the way. 30s cooldown on contact.
                </p>
              </div>

              <div className="border border-rose-950 bg-rose-950/5 p-3.5 rounded-xl space-y-1">
                <div className="flex justify-between items-center text-rose-400">
                  <span className="font-extrabold text-sm flex items-center gap-1.5">✨ FAIBE [THE CONTROLLER]</span>
                  <span className="text-[10px] font-bold uppercase border border-rose-900/60 px-1.5 rounded font-mono">15 HP • Pacifier</span>
                </div>
                <p className="text-slate-400 mt-1">
                  A strict warden. Her active skill is <strong>Pacify Charm (Spacebar)</strong>: casts a deep harmonic lavender pulse that freezes all 30 Tobby specimens on the floor in a quiet daydream for 15.0 seconds. 45s cooldown clock.
                </p>
              </div>
            </div>
          )}

          {activeTab === "ITEMS" && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <p className="text-[11px] text-slate-400 border-b border-slate-900 pb-2">
                Pick up item briefcases on floor rooms. Check your item count stocks on the right side HUD and use keys <kbd className="px-1 text-[9px] bg-slate-900 border rounded">1</kbd> <kbd className="px-1 text-[9px] bg-slate-900 border rounded">2</kbd> <kbd className="px-1 text-[9px] bg-slate-900 border rounded">3</kbd> to deploy:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="bg-slate-900/10 border border-slate-900 rounded-xl p-3 flex gap-2.5 items-start">
                  <span className="p-1 rounded bg-green-950/60 text-green-400 text-sm font-black mt-0.5">➕</span>
                  <div>
                    <h5 className="font-extrabold text-green-400">Medicine Briefcase</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">Used instantly on contact. Provides <strong>+8 HP healing injection</strong>. Only consumed if player is damaged.</p>
                  </div>
                </div>

                <div className="bg-slate-900/10 border border-slate-900 rounded-xl p-3 flex gap-2.5 items-start">
                  <span className="p-1.5 rounded bg-purple-950/60 text-purple-400 text-sm font-bold mt-0.5 font-mono">1</span>
                  <div>
                    <h5 className="font-extrabold text-purple-400">Catnip Pouch decoy</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">Throws a smelly lavender decoy bag. Calms and diverts nearby Tobbys inside its 260px smelling range, dragging them away.</p>
                  </div>
                </div>

                <div className="bg-slate-900/10 border border-slate-900 rounded-xl p-3 flex gap-2.5 items-start">
                  <span className="p-1.5 rounded bg-amber-950/60 text-amber-400 text-sm font-bold mt-0.5 font-mono">2</span>
                  <div>
                    <h5 className="font-extrabold text-amber-500">Hyper Energy Can</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">Drink to enter a <strong>7-second Golden Rebuff</strong> speed burst state (1.75x velocity) with motion trails. Grants brief immunity to slowing water.</p>
                  </div>
                </div>

                <div className="bg-slate-900/10 border border-slate-900 rounded-xl p-3 flex gap-2.5 items-start">
                  <span className="p-1.5 rounded bg-cyan-950/60 text-cyan-400 text-sm font-bold mt-0.5 font-mono">3</span>
                  <div>
                    <h5 className="font-extrabold text-cyan-400">Electric EMP Core</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">Discharges a massive electrical pulse to <strong>completely freeze all Tobbys on map</strong> for 5 entire seconds under crackling arcs.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "THREATS" && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="bg-red-950/10 border border-red-950/30 rounded-xl p-4">
                <h4 className="text-sm font-extrabold text-red-500 flex items-center gap-1.5">
                  <AlertTriangle size={15} /> TOBBY CLONES - INTEL ASSESSMENT
                </h4>
                <p className="text-slate-400 mt-1">
                  Each floor contains dozens of clones of Tobby patrolling modular workspaces. Upon sighting you, they screech and execute lethal automated combat spells:
                </p>

                <div className="space-y-3.5 mt-4 text-[11px] font-mono leading-relaxed">
                  <div className="border-l-2 border-red-800 pl-2.5">
                    <span className="font-extrabold text-red-300 block">1. WATER SPILL SLIME</span>
                    <span className="text-slate-400 text-[10.5px]">Triggers within 30px (narrow front cone). Spills a toxic puddle that deals 1 HP / sec and slows you down by 50% for 10 seconds.</span>
                    <span className="block text-[10px] text-red-400 mt-0.5">Tobby attack cooldown: 20 seconds.</span>
                  </div>

                  <div className="border-l-2 border-red-800 pl-2.5">
                    <span className="font-extrabold text-red-300 block">2. SEARCHLIGHT STARE</span>
                    <span className="text-slate-400 text-[10.5px]">Unstoppable tracking beam. Consecutively staring into you for over 5 seconds triggers physical internal shock waves, dealing 1 HP.</span>
                    <span className="block text-[10px] text-red-400 mt-0.5">Tobby attack cooldown: 10 seconds.</span>
                  </div>

                  <div className="border-l-2 border-red-800 pl-2.5">
                    <span className="font-extrabold text-red-300 block">3. SCARY RADIAL SHRIEK</span>
                    <span className="text-slate-400 text-[10.5px]">High frequency scream covering a huge 150px audio block. Deals 2 static damage in a wide radius. Watch the ripple wave ring!</span>
                    <span className="block text-[10px] text-red-400 mt-0.5">Tobby attack cooldown: 15 seconds.</span>
                  </div>

                  <div className="border-l-2 border-red-805 pl-2.5">
                    <span className="font-extrabold text-red-300 block">4. MELEE SLAM & BLEEDING CLAWS</span>
                    <span className="text-slate-400 text-[10.5px]">Direct physical touch deals 2 direct physical damage + inflicts scratch bleeding (deals 1 HP / sec for 3 seconds).</span>
                    <span className="block text-[10px] text-red-400 mt-0.5">Tobby attack cooldowns: 5 seconds (strike) & 3 seconds (scratch).</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer controls */}
        <div className="bg-slate-900 p-3 border-t border-slate-900 text-center text-[10px] text-slate-500 font-mono">
          ESCAPE FROM TOBBY SURVIVAL HANDBOOK v1.27 • DESIGN FOR COMPREHENSIVE OUTCOMES
        </div>
      </div>
    </div>
  );
}
