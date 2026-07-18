/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Play, Shield, Key, Scroll, HelpCircle, Heart, EyeOff, MapPin, 
  Skull, Eye, Flame, Droplets, Volume2, Info, BookOpen, Compass, 
  Activity, MousePointer, ShieldCheck, Zap
} from "lucide-react";
import { playMenuClickSound } from "../utils";

interface IntroProps {
  onProceed: () => void;
}

type TabType = "tobby_intel" | "survival_manual" | "class_roster";

export function Intro({ onProceed }: IntroProps) {
  const [activeTab, setActiveTab] = useState<TabType>("tobby_intel");

  const handleProceedWithSound = () => {
    playMenuClickSound();
    onProceed();
  };

  const handleTabClick = (tab: TabType) => {
    playMenuClickSound();
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 md:p-10 font-sans selection:bg-rose-500 selection:text-white relative overflow-hidden">
      {/* Decorative ambient highlights */}
      <div className="absolute inset-0 bg-radial-gradient from-red-950/25 via-slate-950 to-black opacity-90 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 animate-pulse" />

      {/* Hero Header */}
      <header className="z-10 text-center max-w-4xl mx-auto mt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-950/50 border border-red-500/20 rounded-full text-red-400 text-xs font-mono tracking-widest uppercase mb-4 animate-pulse">
          <HelpCircle size={12} /> EXPERIMENTAL DETENTION SANCTION
        </div>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-mono font-extrabold tracking-widest bg-clip-text text-transparent bg-gradient-to-b from-red-500 to-rose-700 drop-shadow-[0_0_20px_rgba(220,38,38,0.35)] select-none uppercase">
          ESCAPE FROM TOBBY
        </h1>
        <p className="mt-2 text-slate-400 font-mono text-xs md:text-sm max-w-xl mx-auto leading-relaxed border-t border-slate-900/80 pt-3">
          TOP-DOWN SURVIVAL HORROR • SURVIVE DETENTION AGAINST THE CLONES
        </p>
      </header>

      {/* Interactive Hub Navigation Tabs */}
      <div className="z-10 w-full max-w-5xl mx-auto mt-8 flex flex-col md:flex-row gap-2 border-b border-slate-900 pb-px">
        <button
          onClick={() => handleTabClick("tobby_intel")}
          className={`flex-1 py-3 px-4 rounded-t-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-t border-x transition-all duration-200 ${
            activeTab === "tobby_intel"
              ? "bg-slate-900 border-red-950 text-red-400 border-b-2 border-b-red-500 shadow-lg bg-red-950/10"
              : "bg-slate-950/20 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
          }`}
        >
          <Skull size={14} className={activeTab === "tobby_intel" ? "text-red-500 animate-pulse" : "text-slate-400"} />
          <span>I. Tobby Clones Dossier</span>
        </button>

        <button
          onClick={() => handleTabClick("survival_manual")}
          className={`flex-1 py-3 px-4 rounded-t-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-t border-x transition-all duration-200 ${
            activeTab === "survival_manual"
              ? "bg-slate-900 border-emerald-950 text-emerald-400 border-b-2 border-b-emerald-400 shadow-lg bg-emerald-950/10"
              : "bg-slate-950/20 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
          }`}
        >
          <BookOpen size={14} className={activeTab === "survival_manual" ? "text-emerald-400" : "text-slate-400"} />
          <span>II. Survival Training Manual</span>
        </button>

        <button
          onClick={() => handleTabClick("class_roster")}
          className={`flex-1 py-3 px-4 rounded-t-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-t border-x transition-all duration-200 ${
            activeTab === "class_roster"
              ? "bg-slate-900 border-rose-950 text-rose-400 border-b-2 border-b-rose-400 shadow-lg bg-rose-950/10"
              : "bg-slate-950/20 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
          }`}
        >
          <ShieldCheck size={14} className={activeTab === "class_roster" ? "text-rose-400" : "text-slate-400"} />
          <span>III. Playable Classes Spec List</span>
        </button>
      </div>

      {/* Main Tabbed Content Area */}
      <main className="z-10 max-w-5xl mx-auto w-full flex-1 my-6 flex flex-col justify-center min-h-[420px]">
        {activeTab === "tobby_intel" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch w-full animate-fadeIn">
            {/* Lore and Profile Column */}
            <div className="lg:col-span-5 flex flex-col justify-between p-6 rounded-2xl border border-rose-950/40 bg-slate-900/20 backdrop-blur-sm shadow-xl">
              <div>
                <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-bold uppercase tracking-wider mb-3">
                  <Info size={14} /> Origin & Biological Anomalies
                </div>
                <h3 className="text-xl font-bold font-mono text-slate-100 mb-4">
                  The Mystery of Tobby
                </h3>
                <div className="text-xs text-slate-300 space-y-3 font-sans leading-relaxed">
                  <p>
                    <strong className="text-red-400 font-mono">SUBJECT IDENTIFIER:</strong> Tobby (Anomalous Clone Host).
                  </p>
                  <p>
                    A rogue laboratory synthesis and chemistry classroom experiment went catastrophically wrong, triggering an immediate biological replication cascade. A single biological template replicated into a group of <strong className="text-amber-400">5 to 7 separate active specimens per floor</strong>, all carrying hostile defensive reflexes.
                  </p>
                  <p>
                    <strong className="text-rose-400">VISUAL BLUEPRINT:</strong> Unnaturally tall, lanky, wearing a disheveled and messy school uniform with a crooked school necktie, wild rolled-back eyes behind wire-rimmed glasses, and a continuous stream of slippery slime water dripping from his chin.
                  </p>
                  <p className="text-slate-400 italic bg-black/40 p-2.5 rounded border border-slate-900 font-mono text-[10px]">
                    "They patrol the dark classrooms, corridors, and toilets. Clones feature localized motion scanning and emit high-intensity acoustic shrieks when cornered."
                  </p>
                </div>
              </div>

              <div className="mt-6 p-3 bg-red-950/20 border border-red-900/30 rounded-xl flex gap-3 items-center">
                <Skull size={24} className="text-red-500 flex-shrink-0 animate-bounce" />
                <span className="text-[10px] uppercase font-mono text-red-400 leading-snug">
                  DANGER RATING: 5 - 7 HOVERING SPECIMENS DETECTED PER Level. THEY CAN CROSS WALL BLUEPRINTS UP GENERATION ENCLOSURES.
                </span>
              </div>
            </div>

            {/* Combat Specs Column */}
            <div className="lg:col-span-7 p-6 rounded-2xl border border-red-950/60 bg-red-950/5 backdrop-blur-sm shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-rose-500 font-mono text-xs font-bold uppercase tracking-wider mb-3 border-b border-red-950/30 pb-2">
                  <Activity size={14} /> COMBAT PROFILE & SKILLS SPECS
                </div>
                <h3 className="text-lg font-bold font-mono text-red-200 mb-4 flex justify-between items-center">
                  <span>5 Anomalous Attack Parameters</span>
                  <span className="text-xs text-red-500 font-bold border border-red-500/30 px-2 py-0.5 rounded uppercase">MAX SUSCEPTIBILITY</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-950/50 border border-red-950/30 rounded-xl flex gap-2.5 items-start">
                    <div className="p-1 rounded bg-red-950/60 text-red-400 border border-red-900/30 mt-0.5">
                      <Droplets size={12} className="animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-bold text-red-200 font-mono text-[11px] uppercase">1. Water Spill Slime</h4>
                      <p className="text-slate-400 font-mono text-[10px] mt-0.5 leading-normal">
                        Triggers within <strong className="text-rose-400">30px (0.6m)</strong> of front <strong className="text-rose-400">80° field-of-view cone</strong>. Leaves a slippery fluid puddle on the floor for 10s. Slipping slows players by <strong className="text-amber-400">50%</strong> and inflicts <strong className="text-red-400">1 HP continuous damage/sec</strong>. Cooldown: 20s.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/50 border border-red-950/30 rounded-xl flex gap-2.5 items-start">
                    <div className="p-1 rounded bg-red-950/60 text-red-400 border border-red-900/30 mt-0.5">
                      <Eye size={12} />
                    </div>
                    <div>
                      <h4 className="font-bold text-red-200 font-mono text-[11px] uppercase">2. Searchlight Stare</h4>
                      <p className="text-slate-400 font-mono text-[10px] mt-0.5 leading-normal">
                        Projects a high-intensity scanning light within <strong className="text-rose-400">50px (1.0m)</strong> in a narrow <strong className="text-rose-400">30° front cone</strong>. Triggers chase AI immediately. Must be actively stared at for <strong className="text-rose-400">&gt; 5 consecutive seconds</strong> to suffer 1 tick damage. Cooldown: 10s.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/50 border border-red-950/30 rounded-xl flex gap-2.5 items-start">
                    <div className="p-1 rounded bg-red-950/60 text-red-400 border border-red-900/30 mt-0.5">
                      <Volume2 size={12} />
                    </div>
                    <div>
                      <h4 className="font-bold text-red-200 font-mono text-[11px] uppercase">3. Scary Sound Wave Shriek</h4>
                      <p className="text-slate-400 font-mono text-[10px] mt-0.5 leading-normal">
                        Deploys a broad radial acoustic impact of <strong className="text-rose-400">150px (3.0m)</strong> (360° AOE) when aggressive. Inflicts <strong className="text-red-400">2 direct damage</strong> to nearby ears inside classrooms. Cooldown: 15s.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/50 border border-red-950/30 rounded-xl flex gap-2.5 items-start">
                    <div className="p-1 rounded bg-red-950/60 text-red-400 border border-red-900/30 mt-0.5">
                      <Zap size={11} />
                    </div>
                    <div>
                      <h4 className="font-bold text-red-200 font-mono text-[11px] uppercase">4. Melee Contact Hit</h4>
                      <p className="text-slate-400 font-mono text-[10px] mt-0.5 leading-normal">
                        Physical body contact or direct block trap collision. Instantly hits player for <strong className="text-red-400">2 direct HP damage</strong> with instant pushback. Cooldown: 5s.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/50 border border-red-950/30 rounded-xl flex gap-2.5 items-start md:col-span-2">
                    <div className="p-1 rounded bg-red-950/60 text-red-400 border border-red-900/30 mt-0.5">
                      <Flame size={12} />
                    </div>
                    <div>
                      <h4 className="font-bold text-red-200 font-mono text-[11px] uppercase">5. Corrosive Claws (Scratch DoT)</h4>
                      <p className="text-slate-400 font-mono text-[10px] mt-0.5 leading-normal">
                        Direct slash scratch on physical impact. Inflicts a painful continuous bleeding wound dealing <strong className="text-red-500 font-bold">1 damage per second for 3 consecutive seconds</strong> (Damage over Time) unless treated. Cooldown: 3s.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-[9px] text-slate-500 font-mono text-right uppercase tracking-widest border-t border-red-950/30 pt-2.5">
                SUBJECT ID: CHS-TOBBY-30 • BIOMETRIC SPEED: 30-41 PX/SEC
              </div>
            </div>
          </div>
        )}

        {activeTab === "survival_manual" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch w-full animate-fadeIn">
            {/* Controls Guide */}
            <div className="lg:col-span-7 p-6 rounded-2xl border border-emerald-950/40 bg-slate-900/20 backdrop-blur-sm shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider mb-3">
                  <Compass size={14} /> OPERATIONAL NAVIGATION SCHEMATIC
                </div>
                <h3 className="text-xl font-bold font-mono text-slate-100 mb-4">
                  Controls & Interface
                </h3>

                <div className="space-y-4 font-mono text-xs">
                  <div className="flex items-start gap-3">
                    <span className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-amber-400 font-bold font-mono">WASD / ARROWS</span>
                    <div>
                      <h4 className="text-slate-200 font-bold uppercase text-[11px]">Primary Keyboard Navigation</h4>
                      <p className="text-slate-400 text-[10px] leading-relaxed pt-0.5">
                        Familiar and direct responsiveness. Tap and hold to move your selected character. Combine inputs to execute beautiful diagonal maneuvers.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-sky-400 font-bold font-mono flex items-center gap-1">
                      <MousePointer size={11} /> CLICK & DRAG
                    </div>
                    <div>
                      <h4 className="text-slate-200 font-bold uppercase text-[11px]">Dynamic Mouse Navigation Pointer</h4>
                      <p className="text-slate-400 text-[10px] leading-relaxed pt-0.5">
                        Need fluid cursor maneuvers? Simply <strong className="text-sky-400">click and hold the mouse button</strong> anywhere on the map to drag your player directly towards that vector. Great for tight escapes through narrow toilets!
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-6">
                    <span className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-rose-400 font-bold font-mono">SPACEKEY</span>
                    <div>
                      <h4 className="text-slate-200 font-bold uppercase text-[11px]">Deploy Unique Class Skill</h4>
                      <p className="text-slate-400 text-[10px] leading-relaxed pt-0.5">
                        Triggers Marcus's <strong className="text-red-400">Ram Charge</strong> or Faibe's <strong className="text-emerald-400">Pacify Charm</strong>. Always check the persistent active status icons and remaining cooldown timers displayed on your HUD overlay.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-xl text-[10px] text-emerald-400 leading-normal">
                <span className="font-bold flex items-center gap-1.5 uppercase mb-1">
                  <Key size={12} className="animate-spin" /> Escaping down levels
                </span>
                Navigate through classrooms, the central corridor, and toilets to look for the <strong className="text-amber-400">Staircase Key</strong>. Once picked up, travel to the <span className="text-indigo-400 font-bold">indigo-yellow exit staircase marker (Exit)</span> to escape to the next floor. You must descend from Level 5 down to Level 1 to win!
              </div>
            </div>

            {/* Mechanics Map elements */}
            <div className="lg:col-span-5 p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-500 font-mono text-xs font-bold uppercase tracking-wider mb-3">
                  <MapPin size={14} /> SCATTERED EXTRAS & PERSISTENCE
                </div>
                <h3 className="text-xl font-bold font-mono text-slate-100 mb-3">
                  The Detention Rules
                </h3>
                
                <div className="space-y-4 text-xs font-sans text-slate-300 leading-relaxed">
                  <div className="flex items-start gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 mt-1 flex-shrink-0" />
                    <div>
                      <strong className="text-emerald-400 font-mono block text-xs">MEDICINE THERAPY RECOVERIES</strong>
                      Your health is absolutely persistent as you traverse across levels. Scavenge classrooms and corridors for the glowing <strong className="text-emerald-400 font-mono">Green Medicine Kits</strong>. Each collected kit immediately restores <strong className="text-emerald-400">+10 HP</strong>.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1 flex-shrink-0" />
                    <div>
                      <strong className="text-rose-405 font-mono block text-xs">DAMAGE-OVER-TIME (DoT) BLEEDING</strong>
                      If you get scratched, a persistent <span className="text-rose-400 font-bold">glowing red warning screen effect</span> will blink. Run immediately to a safer room to prevent Tobby clones from following while your HP continuously drops!
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 mt-1 flex-shrink-0" />
                    <div>
                      <strong className="text-yellow-405 font-mono block text-xs">AUTOMATED DETENTION BLUEPRINT PERSISTENCE</strong>
                      Your level progression, chosen character stats, remaining HP, and high scores are tracked dynamically. You will start back on Floor 5 if you fail, but your courage is immortal!
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-slate-900/60 pt-3 flex justify-between items-center text-[10px] font-mono text-slate-500">
                <span>SEALED EMERGENCY PROTOCOL</span>
                <span className="text-amber-500 tracking-widest font-extrabold font-mono text-[9px] uppercase">★★★★★ DETENTION RUSH</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "class_roster" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch w-full animate-fadeIn">
            {/* Marcus Card */}
            <div className="flex flex-col justify-between p-6 rounded-2xl border border-emerald-900/50 bg-emerald-950/5 backdrop-blur-sm shadow-xl hover:border-emerald-800 transition-all">
              <div>
                <div className="flex justify-between items-center mb-4 border-b border-emerald-950/40 pb-2">
                  <span className="text-emerald-400 font-mono text-xs font-bold uppercase tracking-widest">CLASS 01 • THE TANK</span>
                  <span className="px-2 py-0.5 bg-emerald-900/50 text-emerald-400 rounded-full font-mono text-[9px] font-bold">30 HP BASE</span>
                </div>
                
                <h3 className="text-xl font-bold font-mono text-slate-100 mb-1">Marcus</h3>
                <span className="text-slate-500 font-mono text-[10px] block mb-4 uppercase">Chubby, Short build, Green vest, thick square spectacles</span>

                <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed font-sans">
                  <p>
                    Marcus possesses the largest stamina reserves on the floor (<strong className="text-emerald-400">30 Health Points</strong>), letting him survive multiple clone attacks. His base pace is heavy at <strong className="text-slate-400">1.0x (50 px/s)</strong>.
                  </p>
                  
                  <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-xl">
                    <span className="text-emerald-400 font-mono font-bold uppercase text-[10px] tracking-wider block mb-1">
                      ACTIVE SKILL: RAM CHARGE (SPACE)
                    </span>
                    <p className="text-[10px] text-slate-405 leading-relaxed font-mono">
                      Builds massive momentum to reach <strong className="text-emerald-300">1.5x Speed (75 px/s)</strong>. Colliding with a Tobby clone in this active charge state <strong className="text-emerald-400">INSTANTLY CRUSHES & ELIMINATES</strong> that specific Tobby! Speed resets immediately on hit. Cooldown: 30s.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-between items-center text-[10px] font-mono text-emerald-500">
                <span>DIFFICULTY: NOVICE-FRIENDLY</span>
                <span>30s CD LIMIT</span>
              </div>
            </div>

            {/* Faibe Card */}
            <div className="flex flex-col justify-between p-6 rounded-2xl border border-red-900/50 bg-red-950/5 backdrop-blur-sm shadow-xl hover:border-red-800 transition-all">
              <div>
                <div className="flex justify-between items-center mb-4 border-b border-red-950/40 pb-2">
                  <span className="text-red-400 font-mono text-xs font-bold uppercase tracking-widest">CLASS 02 • THE CONTROLLER</span>
                  <span className="px-2 py-0.5 bg-red-900/50 text-red-400 rounded-full font-mono text-[9px] font-bold">15 HP BASE</span>
                </div>
                
                <h3 className="text-xl font-bold font-mono text-slate-100 mb-1">Faibe</h3>
                <span className="text-slate-500 font-mono text-[10px] block mb-4 uppercase">Middle-aged woman, Permed hair, Red patterned blouse, Jade bracelet</span>

                <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed font-sans">
                  <p>
                    Faibe is a fragile but powerful crowd controller. She starts with low health (<strong className="text-red-400">15 Health Points</strong>) and a baseline velocity of <strong className="text-slate-400">1.0x (50 px/s)</strong>.
                  </p>
                  
                  <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl">
                    <span className="text-red-400 font-mono font-bold uppercase text-[10px] tracking-wider block mb-1">
                      ACTIVE SKILL: PACIFY CHARM (SPACE)
                    </span>
                    <p className="text-[10px] text-rose-300 leading-relaxed font-mono">
                      Invokes a classroom calmness spell. <strong className="text-red-400">PACIFIES ALL TOBBY CLONES</strong> on the current floor level for <strong className="text-emerald-400 font-bold">15 SECONDS</strong>! Pacified Tobbys halt their aggression immediately, stop chasing, and deal absolutely zero contact damage. Cooldown: 45s.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-between items-center text-[10px] font-mono text-red-500">
                <span>DIFFICULTY: HIGH-RISK STRATEGIC</span>
                <span>45s CD LIMIT</span>
              </div>
            </div>

            {/* Runner Card */}
            <div className="flex flex-col justify-between p-6 rounded-2xl border border-sky-900/50 bg-sky-950/5 backdrop-blur-sm shadow-xl hover:border-sky-800 transition-all">
              <div>
                <div className="flex justify-between items-center mb-4 border-b border-sky-950/40 pb-2">
                  <span className="text-sky-400 font-mono text-xs font-bold uppercase tracking-widest">CLASS 03 • THE RUNNER</span>
                  <span className="px-2 py-0.5 bg-sky-900/50 text-sky-400 rounded-full font-mono text-[9px] font-bold">20 HP BASE</span>
                </div>
                
                <h3 className="text-xl font-bold font-mono text-slate-100 mb-1">Normal Student</h3>
                <span className="text-slate-500 font-mono text-[10px] block mb-4 uppercase">Athletic stance, tracksuit hoodie, custom red sneakers</span>

                <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed font-sans">
                  <p>
                    The balanced, swift runner is built for escaping through rapid speed. He starts with balanced health (<strong className="text-sky-400">20 Health Points</strong>) and is able to traverse maps fluently.
                  </p>
                  
                  <div className="p-3 bg-sky-950/20 border border-sky-900/30 rounded-xl">
                    <span className="text-sky-400 font-mono font-bold uppercase text-[10px] tracking-wider block mb-1">
                      PASSIVE: INHERENT FLUID RUNNING
                    </span>
                    <p className="text-[10px] text-sky-300 leading-relaxed font-mono">
                      No cooldown active keys to worry about! Possesses a permanent, hyper-agile base speed of <strong className="text-sky-400 font-bold">1.5x (75 px/s)</strong>. Outruns most Tobby patrol clusters with simple, rapid athletic maneuvers.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-between items-center text-[10px] font-mono text-sky-500">
                <span>DIFFICULTY: AGILITY MAESTRO</span>
                <span>PERMANENT 1.5X VELOCITY</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Navigation Controls */}
      <footer className="z-10 max-w-6xl mx-auto w-full flex justify-center items-center py-4">
        <button
          onClick={handleProceedWithSound}
          id="btn-goto-characters"
          className="px-14 py-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-rose-700 hover:from-red-600 hover:to-rose-600 text-white font-mono font-bold tracking-widest text-lg shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:shadow-[0_0_35px_rgba(244,63,94,0.6)] transition-all duration-300 transform active:scale-95 flex items-center gap-2 group cursor-pointer"
        >
          <span>ENTER CHARACTER RECRUITMENT</span>
          <Play size={18} className="fill-white group-hover:translate-x-1 transition-transform" />
        </button>
      </footer>
    </div>
  );
}

