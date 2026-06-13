/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameRoom, Doorway, GameObstacle } from "./types";

// ==========================================
// SVG ASSETS (Raw strings to load on Canvas)
// ==========================================

export const TOBBY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" width="100" height="200">
  <defs>
    <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#f3d0b8"/><stop offset="40%" stop-color="#e5bfa1"/><stop offset="100%" stop-color="#c69c80"/></linearGradient>
    <linearGradient id="shirtGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffffff"/><stop offset="60%" stop-color="#e1e5eb"/><stop offset="100%" stop-color="#b8c2cc"/></linearGradient>
    <linearGradient id="pantsGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#3d4852"/><stop offset="100%" stop-color="#1b2229"/></linearGradient>
    <linearGradient id="lensReflect" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.25"/><stop offset="30%" stop-color="#ffffff" stop-opacity="0.05"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
    <linearGradient id="mouthGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#3b0808"/><stop offset="100%" stop-color="#0e0000"/></linearGradient>
  </defs>
  <ellipse cx="200" cy="760" rx="70" ry="12" fill="#000000" opacity="0.45" />
  <g opacity="0.22" transform="translate(-3, -1)"><path d="M 148,245 Q 120,340 145,440 L 135,580 L 145,745 L 175,745 L 185,580 L 200,450 L 215,580 L 225,745 L 255,745 L 265,580 L 255,440 Q 280,340 252,245 Z" fill="#ff0000" /></g>
  <g opacity="0.22" transform="translate(3, 1)"><path d="M 148,245 Q 120,340 145,440 L 135,580 L 145,745 L 175,745 L 185,580 L 200,450 L 215,580 L 225,745 L 255,745 L 265,580 L 255,440 Q 280,340 252,245 Z" fill="#00ffff" /></g>
  <g id="left-leg"><path d="M 148,440 L 135,580 L 145,740 L 167,740 L 165,580 L 188,440 Z" fill="url(#pantsGrad)" stroke="#1b2229" stroke-width="2.5" /><rect x="145" y="740" width="22" height="10" fill="#e1e5eb" stroke="#1b2229" stroke-width="1.5" /><path d="M 145,750 Q 120,755 128,765 L 167,765 Q 170,756 167,750 Z" fill="#241a15" stroke="#0d0907" stroke-width="2" /></g>
  <g id="right-leg"><path d="M 212,440 L 235,580 L 223,740 L 245,740 L 265,580 L 252,440 Z" fill="url(#pantsGrad)" stroke="#1b2229" stroke-width="2.5" /><rect x="223" y="740" width="22" height="10" fill="#e1e5eb" stroke="#1b2229" stroke-width="1.5" /><path d="M 245,750 Q 270,755 262,765 L 223,765 Q 220,756 223,750 Z" fill="#241a15" stroke="#0d0907" stroke-width="2" /></g>
  <g id="torso"><path d="M 148,245 Q 125,340 145,440 L 255,440 Q 275,340 252,245 Z" fill="url(#shirtGrad)" stroke="#2c3540" stroke-width="2.5" /><path d="M 170,265 Q 200,340 230,265 Q 200,410 170,265 Z" fill="#8ca4c4" opacity="0.35" /><path d="M 188,290 Q 200,350 212,290 Q 200,390 188,290 Z" fill="#698bb0" opacity="0.35" /><path d="M 172,235 L 150,255 L 185,268 L 200,252 L 215,268 L 250,255 L 228,235 Z" fill="#ffffff" stroke="#2c3540" stroke-width="2" /><path d="M 194,250 L 206,250 L 211,330 L 200,350 L 189,330 Z" fill="#8c2d2d" stroke="#1c0505" stroke-width="2" /><path d="M 195,250 L 205,250 L 200,260 Z" fill="#5e1b1b" /></g>
  <g id="left-arm"><path d="M 150,247 Q 105,285 115,315 L 132,302 Q 125,282 152,258 Z" fill="url(#shirtGrad)" stroke="#2c3540" stroke-width="2" /><path d="M 122,308 L 100,360 L 110,365 L 130,311 Z" fill="url(#skinGrad)" stroke="#4a2e2b" stroke-width="1.8" /><path d="M 100,360 L 82,382 M 103,361 L 85,390 M 106,363 L 91,394" stroke="#4a2e2b" stroke-width="2" stroke-linecap="round" /><path d="M 82,382 L 78,386 M 85,390 L 81,396 M 91,394 L 88,401" stroke="#ff0000" stroke-width="1.8" /></g>
  <g id="right-arm"><path d="M 250,247 Q 285,290 278,325 L 260,318 Q 268,288 248,258 Z" fill="url(#shirtGrad)" stroke="#2c3540" stroke-width="2" /><path d="M 268,321 L 280,435 L 270,435 L 260,320 Z" fill="url(#skinGrad)" stroke="#4a2e2b" stroke-width="1.8" /><path d="M 268,435 Q 273,465 275,475" stroke="#4a2e2b" stroke-width="2.5" stroke-linecap="round" /><path d="M 272,435 Q 281,465 284,473" stroke="#4a2e2b" stroke-width="2.5" stroke-linecap="round" /><path d="M 276,435 Q 288,463 291,469" stroke="#4a2e2b" stroke-width="2.5" stroke-linecap="round" /></g>
  <g id="tobby-head" transform="translate(104, 25) scale(0.48)"><path d="M 160,290 L 160,395 Q 200,415 240,395 L 240,290 Z" fill="#b98f73" stroke="#4a2e2b" stroke-width="3" /><path d="M 110,160 Q 100,240 115,310 Q 140,370 200,370 Q 260,370 285,310 Q 300,240 290,160 Q 200,130 110,160 Z" fill="url(#skinGrad)" stroke="#4a2e2b" stroke-width="4" /><path d="M 190,200 L 185,255 Q 185,265 198,265 Q 212,265 212,255 L 208,200" fill="none" stroke="#92624d" stroke-width="3" stroke-linecap="round" opacity="0.7" /><path d="M 175,258 Q 185,268 200,268 Q 215,268 223,258" fill="none" stroke="#7e4f3a" stroke-width="3" opacity="0.8" /><g id="head-left-eye"><path d="M 125,185 Q 150,165 175,185 Q 150,200 125,185 Z" fill="#fcfbfa" stroke="#4c2f2c" stroke-width="2.5" /><path d="M 125,185 Q 150,165 175,185 Q 150,175 125,185 Z" fill="#ffb3b3" opacity="0.35" /><path d="M 143,172 A 12,12 0 0,1 157,172 Z" fill="#4d5f6e" opacity="0.8" /></g><g id="head-right-eye"><path d="M 225,185 Q 250,165 275,185 Q 250,200 225,185 Z" fill="#fcfbfa" stroke="#4c2f2c" stroke-width="2.5" /><path d="M 225,185 Q 250,165 275,185 Q 250,175 225,185 Z" fill="#ffb3b3" opacity="0.35" /><path d="M 243,172 A 12,12 0 0,1 257,172 Z" fill="#4d5f6e" opacity="0.8" /></g><g id="head-mouth"><path d="M 140,290 Q 200,270 260,290 Q 250,345 200,345 Q 150,345 140,290 Z" fill="url(#mouthGrad)" stroke="#3d1412" stroke-width="4" /><path d="M 160,325 Q 200,315 240,325 Q 200,345 160,325 Z" fill="#8c333a" /><path d="M 148,287 Q 200,277 252,287 L 248,298 Q 200,288 152,298 Z" fill="#eae7e4" /><line x1="165" y1="285" x2="165" y2="298" stroke="#877d75" stroke-width="1.5" /><line x1="182" y1="283" x2="182" y2="298" stroke="#877d75" stroke-width="1.5" /><line x1="200" y1="282" x2="200" y2="299" stroke="#877d75" stroke-width="2" /><line x1="218" y1="283" x2="218" y2="298" stroke="#877d75" stroke-width="1.5" /><line x1="235" y1="285" x2="235" y2="298" stroke="#877d75" stroke-width="1.5" /><path d="M 146,293 Q 200,283 254,293" fill="none" stroke="#8e9bb0" stroke-width="2" /><rect x="160" y="290" width="8" height="6" rx="1" fill="#497c5d" stroke="#bfb678" stroke-width="1" /><rect x="177" y="289" width="8" height="6" rx="1" fill="#497c5d" stroke="#bfb678" stroke-width="1" /><rect x="196" y="288" width="8" height="6" rx="1" fill="#497c5d" stroke="#bfb678" stroke-width="1" /><rect x="214" y="289" width="8" height="6" rx="1" fill="#497c5d" stroke="#bfb678" stroke-width="1" /><rect x="231" y="290" width="8" height="6" rx="1" fill="#497c5d" stroke="#bfb678" stroke-width="1" /><path d="M 158,335 Q 200,338 242,335 Q 238,342 200,343 Q 162,342 158,335 Z" fill="#d2ceca" /></g><g id="head-facial-hair" opacity="0.65"><path d="M 155,273 Q 200,268 245,273" fill="none" stroke="#2a201d" stroke-width="3" stroke-dasharray="4 2" /><path d="M 180,355 Q 200,358 220,355" fill="none" stroke="#2a201d" stroke-width="4" stroke-dasharray="2 3" /></g><path d="M 120,160 Q 145,150 170,162" fill="none" stroke="#211715" stroke-width="4.5" stroke-linecap="round" /><path d="M 230,162 Q 255,150 280,160" fill="none" stroke="#211715" stroke-width="4.5" stroke-linecap="round" /><g id="head-hair"><path d="M 110,160 Q 100,90 200,75 Q 300,90 290,160 Q 250,110 200,110 Q 150,110 110,160 Z" fill="#1f1816" stroke="#120c0b" stroke-width="2" /><path d="M 115,150 L 125,168 L 132,152 L 145,172 L 150,152 L 165,175 L 172,155 L 190,178 L 200,152 L 215,175 L 225,154 L 240,172 L 248,152 L 265,168 L 272,150 L 285,155" fill="#1f1816" stroke="#120c0b" stroke-width="1.5" /></g><g id="head-glasses"><circle cx="150" cy="195" r="44" fill="url(#lensReflect)" /><circle cx="150" cy="195" r="44" fill="none" stroke="#1c1615" stroke-width="5" /><circle cx="250" cy="195" r="44" fill="url(#lensReflect)" /><circle cx="250" cy="195" r="44" fill="none" stroke="#1c1615" stroke-width="5" /><path d="M 194,192 Q 200,184 206,192" fill="none" stroke="#1c1615" stroke-width="5" /><line x1="106" y1="195" x2="95" y2="192" stroke="#1c1615" stroke-width="5" stroke-linecap="round" /><line x1="294" y1="195" x2="305" y2="192" stroke="#1c1615" stroke-width="5" stroke-linecap="round" /></g></g>
  <g id="water-drips" fill="#7da1c4" opacity="0.85"><circle cx="200" cy="180" r="3" /><path d="M 199,195 Q 200,202 201,195 Z" /><circle cx="188" cy="210" r="2.5" /></g>
</svg>`;

export const RUNNER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 700" width="80" height="140">
  <defs>
    <linearGradient id="studentSkin" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#fcd8c4"/><stop offset="100%" stop-color="#e2b7a0"/></linearGradient>
    <linearGradient id="hoodieGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#1d4ed8"/></linearGradient>
  </defs>
  <ellipse cx="200" cy="650" rx="60" ry="10" fill="#000" opacity="0.3" />
  <g id="legs">
    <path d="M 165,420 L 150,530 L 140,620 L 170,620 L 175,530 L 185,420 Z" fill="#1f2937" stroke="#111827" stroke-width="2" />
    <path d="M 140,620 L 130,642 L 168,642 L 170,620 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="2" /><rect x="142" y="632" width="20" height="4" fill="#ffffff" />
    <path d="M 215,420 L 230,520 L 245,615 L 275,610 L 255,520 L 235,420 Z" fill="#1f2937" stroke="#111827" stroke-width="2" />
    <path d="M 245,615 L 258,638 L 288,632 L 275,610 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="2" /><rect x="256" y="622" width="20" height="4" fill="#ffffff" transform="rotate(-5, 256, 622)" />
  </g>
  <g id="torso">
    <path d="M 150,260 L 130,420 L 270,420 L 250,260 Z" fill="url(#hoodieGrad)" stroke="#1e3a8a" stroke-width="2.5" />
    <path d="M 155,260 L 138,420" stroke="#ffffff" stroke-width="4" />
    <path d="M 245,260 L 262,420" stroke="#ffffff" stroke-width="4" />
    <path d="M 195,260 Q 192,290 190,305 M 205,260 Q 208,290 210,305" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
  </g>
  <g id="arms">
    <path d="M 150,260 L 115,340 L 128,350 L 160,285 Z" fill="url(#hoodieGrad)" stroke="#1e3a8a" stroke-width="2" />
    <circle cx="115" cy="350" r="12" fill="url(#studentSkin)" stroke="#a16244" stroke-width="1.5" />
    <path d="M 250,260 L 280,340 L 268,350 L 240,285 Z" fill="url(#hoodieGrad)" stroke="#1e3a8a" stroke-width="2" />
    <circle cx="280" cy="350" r="12" fill="url(#studentSkin)" stroke="#a16244" stroke-width="1.5" />
  </g>
  <g id="head">
    <path d="M 160,180 Q 150,250 200,250 Q 250,250 240,180 Q 200,165 160,180 Z" fill="url(#studentSkin)" stroke="#a16244" stroke-width="2.5" />
    <path d="M 155,185 Q 150,135 190,140 Q 200,130 215,140 Q 250,145 245,185 Q 235,160 200,165 Q 165,160 155,185 Z" fill="#2d1e18" stroke="#1a100c" stroke-width="2" />
    <ellipse cx="185" cy="195" rx="4" ry="2" fill="#111827" />
    <ellipse cx="215" cy="195" rx="4" ry="2" fill="#111827" />
    <path d="M 178,187 Q 185,183 192,188 M 208,188 Q 215,183 222,188" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" />
    <path d="M 193,222 Q 200,215 207,222" fill="none" stroke="#a16244" stroke-width="2.5" stroke-linecap="round" />
  </g>
</svg>`;

export const MARCUS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 650" width="85" height="138">
  <defs>
    <linearGradient id="marcusSkin" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#fae0d4"/><stop offset="100%" stop-color="#dfbaa7"/></linearGradient>
    <linearGradient id="vestGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#15803d"/><stop offset="100%" stop-color="#166534"/></linearGradient>
  </defs>
  <ellipse cx="200" cy="610" rx="100" ry="16" fill="#000" opacity="0.4" />
  <g id="legs-heavy">
    <path d="M 125,430 L 115,580 L 165,580 L 165,450 Z" fill="#374151" stroke="#1f2937" stroke-width="3" />
    <path d="M 115,580 L 105,605 L 165,605 L 165,580 Z" fill="#1e1b18" stroke="#000" stroke-width="2" />
    <path d="M 275,430 L 285,580 L 235,580 L 235,450 Z" fill="#374151" stroke="#1f2937" stroke-width="3" />
    <path d="M 285,580 L 295,605 L 235,605 L 235,580 Z" fill="#1e1b18" stroke="#000" stroke-width="2" />
  </g>
  <g id="torso-heavy">
    <ellipse cx="200" cy="355" rx="98" ry="98" fill="#ffffff" stroke="#9ca3af" stroke-width="2" />
    <path d="M 115,260 C 100,340 105,410 115,440 L 285,440 C 295,410 300,340 285,260 Z" fill="url(#vestGrad)" stroke="#14532d" stroke-width="3" />
    <circle cx="200" cy="310" r="4" fill="#ffffff" stroke="#14532d" stroke-width="1" />
    <circle cx="200" cy="355" r="4" fill="#ffffff" stroke="#14532d" stroke-width="1" />
    <circle cx="200" cy="400" r="4" fill="#ffffff" stroke="#14532d" stroke-width="1" />
    <path d="M 170,260 L 200,295 L 230,260 Z" fill="#ffffff" stroke="#14532d" stroke-width="2.5" />
    <path d="M 194,260 L 206,260 L 200,295 Z" fill="#991b1b" />
  </g>
  <g id="arms-heavy">
    <path d="M 110,270 Q 70,330 85,380 L 110,365 Q 95,330 120,285 Z" fill="#ffffff" stroke="#9ca3af" stroke-width="2" />
    <circle cx="85" cy="380" r="16" fill="url(#marcusSkin)" stroke="#b38771" stroke-width="2" />
    <path d="M 290,270 Q 330,330 315,380 L 290,365 Q 305,330 280,285 Z" fill="#ffffff" stroke="#9ca3af" stroke-width="2" />
    <circle cx="315" cy="380" r="16" fill="url(#marcusSkin)" stroke="#b38771" stroke-width="2" />
  </g>
  <g id="head-heavy">
    <ellipse cx="200" cy="245" rx="45" ry="18" fill="#dfbaa7" />
    <path d="M 155,175 Q 140,245 200,250 Q 260,245 245,175 Q 200,165 155,175 Z" fill="url(#marcusSkin)" stroke="#b38771" stroke-width="3" />
    <ellipse cx="160" cy="220" rx="12" ry="10" fill="#fca5a5" opacity="0.3" />
    <ellipse cx="240" cy="220" rx="12" ry="10" fill="#fca5a5" opacity="0.3" />
    <path d="M 152,180 Q 150,135 200,135 Q 250,135 248,180 Z" fill="#1c1917" stroke="#000" stroke-width="2" />
    <rect x="155" y="185" width="34" height="26" rx="4" fill="#ffffff" fill-opacity="0.2" stroke="#000000" stroke-width="4" />
    <rect x="211" y="185" width="34" height="26" rx="4" fill="#ffffff" fill-opacity="0.2" stroke="#000000" stroke-width="4" />
    <line x1="189" y1="195" x2="211" y2="195" stroke="#000000" stroke-width="4" />
    <circle cx="172" cy="198" r="3" fill="#1c1917" />
    <circle cx="228" cy="198" r="3" fill="#1c1917" />
    <path d="M 185,230 Q 200,225 215,230" fill="none" stroke="#1c1917" stroke-width="3" stroke-linecap="round" />
  </g>
</svg>`;

export const FAIBE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 700" width="80" height="140">
  <defs>
    <linearGradient id="faibeSkin" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#ffe6d5"/><stop offset="100%" stop-color="#e8c2a7"/></linearGradient>
    <linearGradient id="blouseGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#be123c"/><stop offset="100%" stop-color="#9f1239"/></linearGradient>
  </defs>
  <ellipse cx="200" cy="650" rx="70" ry="12" fill="#000" opacity="0.3" />
  <g id="pants-traditional">
    <path d="M 155,420 L 145,615 L 180,615 L 185,420 Z" fill="#1e293b" stroke="#0f172a" stroke-width="2.5" />
    <path d="M 215,420 L 220,615 L 255,615 L 245,420 Z" fill="#1e293b" stroke="#0f172a" stroke-width="2.5" />
    <path d="M 145,615 Q 130,620 135,635 L 180,635 Q 183,622 180,615 Z" fill="#111827" stroke="#000" stroke-width="2" />
    <path d="M 220,615 Q 217,622 220,635 L 265,635 Q 270,620 255,615 Z" fill="#111827" stroke="#000" stroke-width="2" />
  </g>
  <g id="tunic">
    <path d="M 145,260 Q 120,340 135,430 L 265,430 Q 280,340 255,260 Z" fill="url(#blouseGrad)" stroke="#881337" stroke-width="3" />
    <path d="M 200,260 L 200,430" stroke="#fbbf24" stroke-width="2" />
    <path d="M 185,295 C 190,290 210,290 215,295" fill="none" stroke="#fbbf24" stroke-width="3" stroke-linecap="round" />
    <path d="M 185,335 C 190,330 210,330 215,335" fill="none" stroke="#fbbf24" stroke-width="3" stroke-linecap="round" />
    <path d="M 185,375 C 190,370 210,370 215,375" fill="none" stroke="#fbbf24" stroke-width="3" stroke-linecap="round" />
    <path d="M 175,260 Q 200,245 225,260" fill="none" stroke="#fbbf24" stroke-width="4.5" />
  </g>
  <g id="arms-traditional">
    <path d="M 145,260 Q 100,285 105,320 L 122,330 Q 120,305 155,280 Z" fill="url(#blouseGrad)" stroke="#881337" stroke-width="2" />
    <path d="M 108,322 L 95,355 L 110,360 L 122,328 Z" fill="url(#faibeSkin)" stroke="#9a6e55" stroke-width="1.5" />
    <circle cx="100" cy="365" r="10" fill="url(#faibeSkin)" stroke="#9a6e55" stroke-width="1.5" />
    <ellipse cx="102" cy="358" rx="8" ry="4" fill="none" stroke="#10b981" stroke-width="3" transform="rotate(-15, 102, 358)" />
    <path d="M 255,260 Q 290,300 280,345 L 262,345 Q 270,310 245,280 Z" fill="url(#blouseGrad)" stroke="#881337" stroke-width="2" />
    <path d="M 271,345 L 271,385 L 261,385 L 262,345 Z" fill="url(#faibeSkin)" stroke="#9a6e55" stroke-width="1.5" />
    <circle cx="266" cy="392" r="10" fill="url(#faibeSkin)" stroke="#9a6e55" stroke-width="1.5" />
  </g>
  <g id="head-faibe">
    <path d="M 160,185 Q 150,250 200,250 Q 250,250 240,185 Q 200,172 160,185 Z" fill="url(#faibeSkin)" stroke="#9a6e55" stroke-width="2.5" />
    <path d="M 145,185 C 135,160 145,135 165,135 C 175,125 195,125 205,130 C 215,125 230,130 235,140 C 255,140 260,165 250,190 C 242,170 235,165 200,168 C 165,165 155,170 145,185 Z" fill="#292524" stroke="#1c1917" stroke-width="2" />
    <circle cx="145" cy="175" r="8" fill="#292524" /><circle cx="148" cy="160" r="9" fill="#292524" /><circle cx="251" cy="175" r="8" fill="#292524" /><circle cx="248" cy="160" r="9" fill="#292524" />
    <path d="M 175,198 Q 185,203 190,198" fill="none" stroke="#1c1917" stroke-width="2" stroke-linecap="round" /><path d="M 210,198 Q 215,203 225,198" fill="none" stroke="#1c1917" stroke-width="2" stroke-linecap="round" />
    <path d="M 165,220 Q 170,222 175,225" fill="none" stroke="#9a6e55" stroke-width="1.5" stroke-linecap="round" opacity="0.6" /><path d="M 235,220 Q 230,222 225,225" fill="none" stroke="#9a6e55" stroke-width="1.5" stroke-linecap="round" opacity="0.6" />
    <path d="M 188,226 Q 200,234 212,226" fill="none" stroke="#1c1917" stroke-width="2" stroke-linecap="round" />
  </g>
</svg>`;

// Define the 30 desk layout generator for MAP_SVG
export const generateSvgDesks = (): string => {
  let svg = "";
  const roomYs = [40, 215, 390, 565, 740];
  for (const rY of roomYs) {
    // 30 desks per classroom: 6 columns, 5 rows
    for (let col = 0; col < 6; col++) {
      for (let row = 0; row < 5; row++) {
        let offsetX = col * 34;
        if (col >= 2) offsetX += 15;
        if (col >= 4) offsetX += 15;
        
        const offsetY = row * 21;
        
        const x = 18 + offsetX;
        const y = 16 + offsetY;
        
        svg += `  <use href="#desk-set-sm" x="${40 + x}" y="${rY + y}" />\n`;
      }
    }
    // Also teacher desk
    svg += `  <use href="#teacher-desk" x="${40 + 270}" y="${rY + 60}" transform="rotate(-90, ${40 + 270}, ${rY + 60})" />\n`;
  }
  return svg;
};

export const MAP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1000" width="100%" height="100%">
  <defs>
    <linearGradient id="hallwayFloor" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#1e293b"/><stop offset="100%" stop-color="#0f172a"/></linearGradient>
    <linearGradient id="classroomFloor" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#2a3547"/><stop offset="100%" stop-color="#1e293b"/></linearGradient>
    <linearGradient id="officeFloor" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#1b3c2d"/><stop offset="100%" stop-color="#0f291e"/></linearGradient>
    <linearGradient id="toiletFloor" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#113d42"/><stop offset="100%" stop-color="#0a2629"/></linearGradient>
    <linearGradient id="stairFloor" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#334155"/><stop offset="100%" stop-color="#1e293b"/></linearGradient>
    
    <g id="desk-set">
      <rect x="12" y="2" width="16" height="14" rx="3" fill="#475569" stroke="#0f172a" stroke-width="1" />
      <path d="M 12,9 Q 20,13 28,9" fill="none" stroke="#0f172a" stroke-width="1" />
      <rect x="0" y="18" width="40" height="22" rx="2" fill="#92400e" stroke="#451a03" stroke-width="1.5" />
      <rect x="4" y="20" width="32" height="4" fill="#f59e0b" opacity="0.3" />
    </g>
    <g id="desk-set-sm">
      <rect x="3" y="0" width="10" height="4" rx="1" fill="#475569" stroke="#020617" stroke-width="0.75" />
      <rect x="0" y="5" width="16" height="7" rx="1" fill="#92400e" stroke="#451a03" stroke-width="1" />
      <rect x="1.5" y="6" width="13" height="1.5" fill="#f59e0b" opacity="0.3" />
    </g>
    <g id="teacher-desk">
      <rect x="15" y="0" width="20" height="18" rx="4" fill="#0f172a" stroke="#000" stroke-width="1" />
      <rect x="0" y="22" width="50" height="28" rx="2" fill="#78350f" stroke="#451a03" stroke-width="2" />
      <rect x="15" y="28" width="20" height="12" fill="#475569" />
      <line x1="15" y1="40" x2="35" y2="40" stroke="#1e293b" stroke-width="2" />
    </g>
    <g id="cubicle">
      <rect x="0" y="0" width="60" height="50" fill="#334155" stroke="#1e293b" stroke-width="2" />
      <rect x="5" y="15" width="50" height="30" fill="#78350f" stroke="#451a03" stroke-width="1" />
      <circle cx="30" cy="8" r="8" fill="#1e293b" />
      <rect x="24" y="2" width="12" height="4" rx="1" fill="#151f30" />
    </g>
    <g id="toilet-stall">
      <rect x="0" y="0" width="35" height="40" fill="none" stroke="#cbd5e1" stroke-width="2" />
      <ellipse cx="17.5" cy="15" rx="8" ry="11" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5" />
      <rect x="7.5" y="2" width="20" height="6" rx="1" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1.5" />
      <path d="M 0,40 A 35,35 0 0,1 30,15" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="2 2" />
      <line x1="0" y1="40" x2="30" y2="15" stroke="#cbd5e1" stroke-width="2" />
    </g>
    <g id="door-left">
      <rect x="-2" y="-2" width="4" height="4" fill="#000" />
      <line x1="0" y1="0" x2="40" y2="0" stroke="#d97706" stroke-width="3" />
      <path d="M 40,0 A 40,40 0 0,1 0,40" fill="none" stroke="#d97706" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.5" />
    </g>
    <g id="door-right">
      <rect x="-2" y="-2" width="4" height="4" fill="#000" />
      <line x1="0" y1="0" x2="-40" y2="0" stroke="#d97706" stroke-width="3" />
      <path d="M -40,0 A 40,40 0 0,0 0,40" fill="none" stroke="#d97706" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.5" />
    </g>
  </defs>
  
  <!-- Outer Dark Space -->
  <rect x="0" y="0" width="900" height="1000" fill="#020617" />
  
  <!-- Outer wall padding -->
  <rect x="15" y="15" width="870" height="970" fill="#0f172a" stroke="#1e293b" stroke-width="3" />
  
  <!-- Blueprints overlay title -->
  <g transform="translate(45, 935)" fill="#64748b" opacity="0.75">
    <text font-family="monospace" font-size="20" font-weight="bold" letter-spacing="2" fill="#38bdf8">SCHOOL FLOOR BLUEPRINT</text>
    <text font-family="monospace" font-size="12" y="20">FLOOR STRUCTURE: ACCESSIBLE SAFETY CHANNELS</text>
    <text font-family="monospace" font-size="11" fill="#f59e0b" y="38">▲ WARNING: SEVERE WATER SPILLS RECORDED INSIDE PATROL ZONES</text>
  </g>
  
  <!-- Room Floors (Filled with nice structural gradients) -->
  <rect x="40" y="40" width="320" height="155" rx="12" fill="url(#classroomFloor)" />
  <rect x="40" y="215" width="320" height="155" rx="12" fill="url(#classroomFloor)" />
  <rect x="40" y="390" width="320" height="155" rx="12" fill="url(#classroomFloor)" />
  <rect x="40" y="565" width="320" height="155" rx="12" fill="url(#classroomFloor)" />
  <rect x="40" y="740" width="320" height="155" rx="12" fill="url(#classroomFloor)" />
  
  <rect x="380" y="40" width="130" height="855" rx="8" fill="url(#hallwayFloor)" />
  
  <rect x="530" y="40" width="190" height="110" rx="12" fill="url(#stairFloor)" />
  <rect x="530" y="170" width="190" height="120" rx="12" fill="url(#officeFloor)" />
  <rect x="530" y="310" width="190" height="260" rx="12" fill="url(#officeFloor)" />
  <rect x="530" y="590" width="190" height="110" rx="12" fill="url(#stairFloor)" />
  <rect x="530" y="720" width="190" height="175" rx="12" fill="url(#toiletFloor)" />
  
  <!-- Classrooms Dynamic Grid Objects (30 desks + 1 teacher desk per classroom) -->
  ${generateSvgDesks()}
  
  <!-- Office 1 Objects -->
  <g transform="translate(530, 170)">
    <use href="#teacher-desk" x="30" y="3.5" transform="rotate(90, 30, 35)" />
    <rect x="140" y="15" width="40" height="15" fill="#475569" stroke="#1e293b" />
    <rect x="140" y="90" width="40" height="15" fill="#475569" stroke="#1e293b" />
  </g>
  
  <!-- Office 2 Objects -->
  <g transform="translate(530, 310)">
    <rect x="65" y="80" width="60" height="100" rx="10" fill="#78350f" stroke="#451a03" stroke-width="2" />
    <circle cx="50" cy="100" r="6" fill="#1e293b" /><circle cx="50" cy="130" r="6" fill="#1e293b" /><circle cx="50" cy="160" r="6" fill="#1e293b" />
    <circle cx="140" cy="100" r="6" fill="#1e293b" /><circle cx="140" cy="130" r="6" fill="#1e293b" /><circle cx="140" cy="160" r="6" fill="#1e293b" />
    <use href="#cubicle" x="10" y="10" /><use href="#cubicle" x="120" y="10" transform="rotate(180, 150, 35)" />
    <use href="#cubicle" x="10" y="200" /><use href="#cubicle" x="120" y="200" transform="rotate(180, 150, 225)" />
  </g>
  
  <!-- Staircase A (Steps textures & Arrow) -->
  <g transform="translate(530, 40)" stroke="#475569" stroke-width="2">
    <line x1="15" y1="15" x2="175" y2="15" /><line x1="15" y1="30" x2="175" y2="30" /><line x1="15" y1="45" x2="175" y2="45" /><line x1="15" y1="60" x2="175" y2="60" /><line x1="15" y1="75" x2="175" y2="75" /><line x1="15" y1="95" x2="175" y2="95" />
    <path d="M 95,15 L 95,95 M 85,30 L 95,15 L 105,30" fill="none" stroke="#22c55e" stroke-width="3" />
    <text x="110" y="25" font-family="sans-serif" font-size="10" fill="#22c55e" stroke="none">UP TO NEXT FLOOR</text>
  </g>
  
  <!-- Staircase B (Steps textures & Arrow) -->
  <g transform="translate(530, 590)" stroke="#475569" stroke-width="2">
    <line x1="15" y1="15" x2="175" y2="15" /><line x1="15" y1="30" x2="175" y2="30" /><line x1="15" y1="45" x2="175" y2="45" /><line x1="15" y1="60" x2="175" y2="60" /><line x1="15" y1="75" x2="175" y2="75" /><line x1="15" y1="95" x2="175" y2="95" />
    <path d="M 95,95 L 95,15 M 85,80 L 95,95 L 105,80" fill="none" stroke="#ef4444" stroke-width="3" />
    <text x="105" y="90" font-family="sans-serif" font-size="10" fill="#ef4444" stroke="none">SPAWN POINT</text>
  </g>
  
  <!-- Toilets Objects -->
  <g transform="translate(530, 720)">
    <use href="#toilet-stall" x="15" y="10" /><use href="#toilet-stall" x="15" y="50" /><use href="#toilet-stall" x="15" y="90" /><use href="#toilet-stall" x="15" y="130" />
    <rect x="155" y="25" width="20" height="12" rx="4" fill="#1e293b" stroke="#cbd5e1" stroke-width="1.5" />
    <rect x="155" y="75" width="20" height="12" rx="4" fill="#1e293b" stroke="#cbd5e1" stroke-width="1.5" />
    <rect x="155" y="125" width="20" height="12" rx="4" fill="#1e293b" stroke="#cbd5e1" stroke-width="1.5" />
  </g>
  
  <!-- Thick solid structural wall outlines -->
  <g fill="none" stroke="#64748b" stroke-width="6" stroke-linejoin="round" stroke-linecap="round" opacity="0.85">
    <rect x="40" y="40" width="320" height="155" rx="12" /><rect x="40" y="215" width="320" height="155" rx="12" /><rect x="40" y="390" width="320" height="155" rx="12" /><rect x="40" y="565" width="320" height="155" rx="12" /><rect x="40" y="740" width="320" height="155" rx="12" />
    <rect x="530" y="40" width="190" height="110" rx="12" /><rect x="530" y="170" width="190" height="120" rx="12" /><rect x="530" y="310" width="190" height="260" rx="12" /><rect x="530" y="590" width="190" height="110" rx="12" /><rect x="530" y="720" width="190" height="175" rx="12" />
  </g>
  
  <!-- Break walls for doors (drawing background-matching panels or color to hollow them) -->
  <g fill="url(#classroomFloor)">
    <rect x="357" y="135" width="6" height="40" /><rect x="357" y="310" width="6" height="40" /><rect x="357" y="485" width="6" height="40" /><rect x="357" y="660" width="6" height="40" /><rect x="357" y="835" width="6" height="40" />
  </g>
  <g fill="url(#officeFloor)">
    <rect x="527" y="235" width="6" height="40" /><rect x="527" y="335" width="6" height="40" />
  </g>
  <g fill="url(#toiletFloor)">
    <rect x="527" y="825" width="6" height="40" />
  </g>
  <g fill="url(#stairFloor)">
    <rect x="527" y="95" width="6" height="40" /><rect x="527" y="605" width="6" height="40" />
  </g>
  
  <!-- Swing doors indicators -->
  <use href="#door-right" x="360" y="135" transform="rotate(90, 360, 135)" />
  <use href="#door-right" x="360" y="310" transform="rotate(90, 360, 310)" />
  <use href="#door-right" x="360" y="485" transform="rotate(90, 360, 485)" />
  <use href="#door-right" x="360" y="660" transform="rotate(90, 360, 660)" />
  <use href="#door-right" x="360" y="835" transform="rotate(90, 360, 835)" />
  <use href="#door-left" x="530" y="235" transform="rotate(-90, 530, 235)" />
  <use href="#door-left" x="530" y="335" transform="rotate(-90, 530, 335)" />
  <use href="#door-left" x="530" y="825" transform="rotate(-90, 530, 825)" />
  <use href="#door-left" x="530" y="95" transform="rotate(-90, 530, 95)" />
  <use href="#door-left" x="530" y="605" transform="rotate(-90, 530, 605)" />
  
  <!-- Room Labels -->
  <g font-family="monospace" font-weight="bold" font-size="14" fill="#475569" text-anchor="middle" opacity="0.6">
    <text x="200" y="120">CLASSROOM 1</text><text x="200" y="295">CLASSROOM 2</text><text x="200" y="470">CLASSROOM 3</text><text x="200" y="645">CLASSROOM 4</text><text x="200" y="820">CLASSROOM 5</text>
    <text x="625" y="100">STAIRCASE A</text><text x="625" y="235">OFFICE 1</text><text x="625" y="450">OFFICE 2</text><text x="625" y="650">STAIRCASE B</text><text x="625" y="810">TOILETS</text>
    <g transform="translate(450, 467)">
      <text transform="rotate(90)" letter-spacing="10" font-size="18" fill="#1e293b">CORRIDOR</text>
    </g>
  </g>
</svg>`;

// ==========================================
// STATIC LAYOUT DETAILS & COLLISION BLOCKS
// ==========================================

export const ROOMS: GameRoom[] = [
  { id: "C1", name: "Classroom 1", minX: 40, maxX: 360, minY: 40, maxY: 195, obstacles: [] },
  { id: "C2", name: "Classroom 2", minX: 40, maxX: 360, minY: 215, maxY: 370, obstacles: [] },
  { id: "C3", name: "Classroom 3", minX: 40, maxX: 360, minY: 390, maxY: 545, obstacles: [] },
  { id: "C4", name: "Classroom 4", minX: 40, maxX: 360, minY: 565, maxY: 720, obstacles: [] },
  { id: "C5", name: "Classroom 5", minX: 40, maxX: 360, minY: 740, maxY: 895, obstacles: [] },
  { id: "Hallway", name: "Corrridor Hallway", minX: 380, maxX: 510, minY: 40, maxY: 895, obstacles: [] },
  { id: "StairA", name: "Staircase A (Exit)", minX: 530, maxX: 720, minY: 40, maxY: 150, obstacles: [] },
  { id: "Office1", name: "Office 1 (Small)", minX: 530, maxX: 720, minY: 170, maxY: 290, obstacles: [] },
  { id: "Office2", name: "Office 2 (Large)", minX: 530, maxX: 720, minY: 310, maxY: 570, obstacles: [] },
  { id: "StairB", name: "Staircase B (Entrance)", minX: 530, maxX: 720, minY: 590, maxY: 700, obstacles: [] },
  { id: "Toilets", name: "Washing Toilets", minX: 530, maxX: 720, minY: 720, maxY: 895, obstacles: [] },
];

export const DOORWAYS: Doorway[] = [
  { id: "D_C1", minX: 360, maxX: 380, minY: 135, maxY: 175 },
  { id: "D_C2", minX: 360, maxX: 380, minY: 310, maxY: 350 },
  { id: "D_C3", minX: 360, maxX: 380, minY: 485, maxY: 525 },
  { id: "D_C4", minX: 360, maxX: 380, minY: 660, maxY: 700 },
  { id: "D_C5", minX: 360, maxX: 380, minY: 835, maxY: 875 },
  { id: "D_StairA", minX: 510, maxX: 530, minY: 95, maxY: 135 },
  { id: "D_Office1", minX: 510, maxX: 530, minY: 235, maxY: 275 },
  { id: "D_Office2", minX: 510, maxX: 530, minY: 335, maxY: 375 },
  { id: "D_StairB", minX: 510, maxX: 530, minY: 605, maxY: 645 },
  { id: "D_Toilets", minX: 510, maxX: 530, minY: 825, maxY: 865 },
];

// Desk sizes & locations to populate classroom obstacles
const getClassroomObstacles = (roomX: number, roomY: number): GameObstacle[] => {
  const obstacles: GameObstacle[] = [];
  
  // 30 desks aligned with generateSvgDesks
  for (let col = 0; col < 6; col++) {
    for (let row = 0; row < 5; row++) {
      let offsetX = col * 34;
      if (col >= 2) offsetX += 15;
      if (col >= 4) offsetX += 15;
      
      const offsetY = row * 21;
      
      const x = 18 + offsetX;
      const y = 16 + offsetY;
      
      obstacles.push({
        x: roomX + x,
        y: roomY + y,
        width: 16,
        height: 12,
        name: "Desk Unit",
      });
    }
  }

  // Teacher desk
  obstacles.push({
    x: roomX + 270 - 15, // centered around rotation point
    y: roomY + 60 - 25,
    width: 28,
    height: 50,
    name: "Teacher Table",
  });

  return obstacles;
};

export const ALL_OBSTACLES: GameObstacle[] = [
  // Populate all classroom obstacles
  ...getClassroomObstacles(40, 40),   // C1
  ...getClassroomObstacles(40, 215),  // C2
  ...getClassroomObstacles(40, 390),  // C3
  ...getClassroomObstacles(40, 565),  // C4
  ...getClassroomObstacles(40, 740),  // C5

  // Office 1
  { x: 530 + 10, y: 170 + 15, width: 40, height: 50, name: "Supervisor Desk" },
  { x: 530 + 130, y: 170 + 10, width: 50, height: 25, name: "File Cabinet L" },
  { x: 530 + 130, y: 170 + 85, width: 50, height: 25, name: "File Cabinet R" },

  // Office 2
  { x: 530 + 55, y: 310 + 70, width: 80, height: 120, name: "Conference Table" },
  { x: 530 + 10, y: 310 + 10, width: 60, height: 50, name: "Cubicle 1" },
  { x: 530 + 120, y: 310 + 10, width: 60, height: 50, name: "Cubicle 2" },
  { x: 530 + 10, y: 310 + 200, width: 60, height: 50, name: "Cubicle 3" },
  { x: 530 + 120, y: 310 + 200, width: 60, height: 50, name: "Cubicle 4" },

  // Toilets
  { x: 530 + 15, y: 720 + 10, width: 45, height: 160, name: "Toilet Partition Stalls" },
  { x: 530 + 150, y: 720 + 20, width: 25, height: 120, name: "Washing Sinks Row" },
];
