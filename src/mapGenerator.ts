import { GameRoom, Doorway, GameObstacle, ItemType, GameItemState } from "./types";

export const MAP_WIDTH = 4500;
export const MAP_HEIGHT = 1000;
export const WING_WIDTH = 900;
export const NUM_WINGS = 5;

export interface FloorMapData {
  rooms: GameRoom[];
  doorways: Doorway[];
  obstacles: GameObstacle[];
  spawnX: number;
  spawnY: number;
  exitX: number;
  exitY: number;
}

export interface GameMapCampaign {
  floors: { [floorNum: number]: FloorMapData };
  gameId: string;
}

/**
 * Procedural Map Generator for the 5x Larger Map Campaign
 */
export function generateCampaignMap(): GameMapCampaign {
  const campaign: GameMapCampaign = {
    floors: {},
    gameId: Math.random().toString(36).substring(2, 9),
  };

  for (let floor = 1; floor <= 5; floor++) {
    campaign.floors[floor] = generateFloorMap(floor);
  }

  return campaign;
}

function generateFloorMap(floorNum: number): FloorMapData {
  const rooms: GameRoom[] = [];
  const doorways: Doorway[] = [];
  const obstacles: GameObstacle[] = [];

  // 1. Generate 5 Wings horizontally
  for (let w = 0; w < NUM_WINGS; w++) {
    const baseX = w * WING_WIDTH;

    // A. Vertical Corridor Hallway
    rooms.push({
      id: `H_W${w}`,
      name: `Wing ${w + 1} Corridor`,
      minX: baseX + 380,
      maxX: baseX + 510,
      minY: 40,
      maxY: 895,
      obstacles: [],
    });

    // B. Left Classrooms (5 slots)
    const slotHeight = 171; // 855 / 5
    for (let r = 0; r < 5; r++) {
      const slotMinY = 40 + r * slotHeight;
      const slotMaxY = slotMinY + slotHeight;
      const classMinY = slotMinY + 6 + Math.floor(Math.random() * 8);
      const classMaxY = slotMaxY - 6 - Math.floor(Math.random() * 8);
      const classMinX = baseX + 40;
      const classMaxX = baseX + 360;

      const roomId = `C_W${w}_R${r}`;
      rooms.push({
        id: roomId,
        name: `Wing ${w + 1} Classroom ${r + 1}`,
        minX: classMinX,
        maxX: classMaxX,
        minY: classMinY,
        maxY: classMaxY,
        obstacles: [],
      });

      // Doorway connecting Classroom to Hallway
      const doorHeight = 40;
      const doorMinY = classMinY + 20 + Math.floor(Math.random() * (classMaxY - classMinY - 60));
      const doorMaxY = doorMinY + doorHeight;
      doorways.push({
        id: `D_C_W${w}_R${r}`,
        minX: baseX + 360,
        maxX: baseX + 380,
        minY: doorMinY,
        maxY: doorMaxY,
      });

      // Classroom desks obstacles
      generateClassroomFurniture(classMinX, classMaxX, classMinY, classMaxY, obstacles, floorNum, w, r);
    }

    // C. Right Rooms (5 slots)
    // Slot 0: Staircase A or Storage/Office
    const r0MinY = 40;
    const r0MaxY = 150;
    const rightMinX = baseX + 530;
    const rightMaxX = baseX + 720;
    if (w === 0) {
      rooms.push({
        id: `StairA_W${w}`,
        name: "Staircase A (Ascent)",
        minX: rightMinX,
        maxX: rightMaxX,
        minY: r0MinY,
        maxY: r0MaxY,
        obstacles: [],
      });
    } else {
      rooms.push({
        id: `OfficeUpper_W${w}`,
        name: `Wing ${w + 1} Storage`,
        minX: rightMinX,
        maxX: rightMaxX,
        minY: r0MinY,
        maxY: r0MaxY,
        obstacles: [],
      });
      // Place file cabinets/shelves
      obstacles.push({ x: rightMinX + 15, y: r0MinY + 15, width: 45, height: 20, name: "Storage Cabinet" });
      obstacles.push({ x: rightMaxX - 60, y: r0MinY + 15, width: 45, height: 20, name: "Storage Shelf" });
    }

    doorways.push({
      id: `D_R0_W${w}`,
      minX: baseX + 510,
      maxX: baseX + 530,
      minY: r0MinY + 35,
      maxY: r0MinY + 75,
    });

    // Slot 1: Office 1
    const r1MinY = 170;
    const r1MaxY = 290;
    rooms.push({
      id: `Office1_W${w}`,
      name: `Wing ${w + 1} Office 1`,
      minX: rightMinX,
      maxX: rightMaxX,
      minY: r1MinY,
      maxY: r1MaxY,
      obstacles: [],
    });
    doorways.push({
      id: `D_R1_W${w}`,
      minX: baseX + 510,
      maxX: baseX + 530,
      minY: r1MinY + 40,
      maxY: r1MinY + 80,
    });
    // Add Office 1 Obstacles
    obstacles.push({ x: rightMinX + 15, y: r1MinY + 20, width: 45, height: 35, name: "Desk" });
    obstacles.push({ x: rightMaxX - 50, y: r1MinY + 20, width: 35, height: 45, name: "Cabinet" });

    // Slot 2: Office 2 (Large)
    const r2MinY = 310;
    const r2MaxY = 570;
    rooms.push({
      id: `Office2_W${w}`,
      name: `Wing ${w + 1} Office 2`,
      minX: rightMinX,
      maxX: rightMaxX,
      minY: r2MinY,
      maxY: r2MaxY,
      obstacles: [],
    });
    doorways.push({
      id: `D_R2_W${w}`,
      minX: baseX + 510,
      maxX: baseX + 530,
      minY: r2MinY + 25,
      maxY: r2MinY + 65,
    });
    // Office 2 furniture: Conference table and cubicles
    obstacles.push({ x: rightMinX + 50, y: r2MinY + 80, width: 80, height: 100, name: "Conference Table" });
    obstacles.push({ x: rightMinX + 10, y: r2MinY + 15, width: 50, height: 40, name: "Cubicle A" });
    obstacles.push({ x: rightMaxX - 60, y: r2MinY + 15, width: 50, height: 40, name: "Cubicle B" });
    obstacles.push({ x: rightMinX + 10, y: r2MaxY - 55, width: 50, height: 40, name: "Cubicle C" });
    obstacles.push({ x: rightMaxX - 60, y: r2MaxY - 55, width: 50, height: 40, name: "Cubicle D" });

    // Slot 3: Staircase B or Office 3
    const r3MinY = 590;
    const r3MaxY = 700;
    if (w === NUM_WINGS - 1) {
      rooms.push({
        id: `StairB_W${w}`,
        name: "Staircase B (Descent)",
        minX: rightMinX,
        maxX: rightMaxX,
        minY: r3MinY,
        maxY: r3MaxY,
        obstacles: [],
      });
    } else {
      rooms.push({
        id: `Office3_W${w}`,
        name: `Wing ${w + 1} Breakroom`,
        minX: rightMinX,
        maxX: rightMaxX,
        minY: r3MinY,
        maxY: r3MaxY,
        obstacles: [],
      });
      // Breakroom tables/sofa
      obstacles.push({ x: rightMinX + 20, y: r3MinY + 20, width: 55, height: 35, name: "Breakroom Couch" });
      obstacles.push({ x: rightMaxX - 55, y: r3MinY + 40, width: 40, height: 40, name: "Vending Machine" });
    }
    doorways.push({
      id: `D_R3_W${w}`,
      minX: baseX + 510,
      maxX: baseX + 530,
      minY: r3MinY + 15,
      maxY: r3MinY + 55,
    });

    // Slot 4: Toilets
    const r4MinY = 720;
    const r4MaxY = 895;
    rooms.push({
      id: `Toilets_W${w}`,
      name: `Wing ${w + 1} Toilets`,
      minX: rightMinX,
      maxX: rightMaxX,
      minY: r4MinY,
      maxY: r4MaxY,
      obstacles: [],
    });
    doorways.push({
      id: `D_R4_W${w}`,
      minX: baseX + 510,
      maxX: baseX + 530,
      minY: r4MinY + 105,
      maxY: r4MinY + 145,
    });
    // Toilet partitions and sinks
    obstacles.push({ x: rightMaxX - 35, y: r4MinY + 15, width: 25, height: 110, name: "Stall Partition" });
    obstacles.push({ x: rightMinX + 15, y: r4MinY + 20, width: 24, height: 60, name: "Sinks" });

    // D. Corridor Lockers and Benches
    obstacles.push({ x: baseX + 502, y: 180, width: 8, height: 60, name: `Locker W${w}_1` });
    obstacles.push({ x: baseX + 502, y: 400, width: 8, height: 60, name: `Locker W${w}_2` });
    obstacles.push({ x: baseX + 502, y: 730, width: 8, height: 60, name: `Locker W${w}_3` });
    obstacles.push({ x: baseX + 502, y: 470, width: 10, height: 45, name: `Bench W${w}` });

    // E. Corridor Barricades (Leaves clear walkable gaps so map is 100% solvable!)
    const hallwayBarPositions = [130, 270, 410, 550, 690, 810];
    hallwayBarPositions.forEach((barY, idx) => {
      // 35% chance to have a barricade on each floor
      if (Math.random() < 0.35 + (floorNum * 0.05)) {
        const side = Math.random() < 0.5 ? "left" : "right";
        if (side === "left") {
          // Leaves 45px gap on the right
          obstacles.push({
            x: baseX + 380,
            y: barY,
            width: 85,
            height: 22,
            name: `Barricade W${w}_${idx}`,
          });
        } else {
          // Leaves 45px gap on the left
          obstacles.push({
            x: baseX + 425,
            y: barY,
            width: 85,
            height: 22,
            name: `Barricade W${w}_${idx}`,
          });
        }
      }
    });
  }

  // 2. Generate Inter-Wing Connective Passages & Doors
  for (let w = 0; w < NUM_WINGS - 1; w++) {
    const baseX = w * WING_WIDTH;

    // A. Upper corridor passage: connecting Wing W's Office 1 to Wing W+1's Classroom 1
    const pUpperId = `Passage_Upper_W${w}`;
    rooms.push({
      id: pUpperId,
      name: `Connector Corridor W${w}-${w + 1}`,
      minX: baseX + 720,
      maxX: baseX + 940, // baseX + 900 + 40
      minY: 215,
      maxY: 275,
      obstacles: [],
    });
    // Door at left end (Wing W side)
    doorways.push({
      id: `D_Passage_Upper_L_W${w}`,
      minX: baseX + 710,
      maxX: baseX + 730,
      minY: 225,
      maxY: 265,
    });
    // Door at right end (Wing W+1 side)
    doorways.push({
      id: `D_Passage_Upper_R_W${w}`,
      minX: baseX + 930,
      maxX: baseX + 950,
      minY: 225,
      maxY: 265,
    });

    // B. Lower corridor passage: connecting Wing W's Breakroom to Wing W+1's Classroom 3
    const pLowerId = `Passage_Lower_W${w}`;
    rooms.push({
      id: pLowerId,
      name: `Connector Corridor W${w}-${w + 1}`,
      minX: baseX + 720,
      maxX: baseX + 940,
      minY: 615,
      maxY: 675,
      obstacles: [],
    });
    // Door at left end
    doorways.push({
      id: `D_Passage_Lower_L_W${w}`,
      minX: baseX + 710,
      maxX: baseX + 730,
      minY: 625,
      maxY: 665,
    });
    // Door at right end
    doorways.push({
      id: `D_Passage_Lower_R_W${w}`,
      minX: baseX + 930,
      maxX: baseX + 950,
      minY: 625,
      maxY: 665,
    });
  }

  // Coordinates of starting stairs (Wing 0, Staircase A) and exit stairs (Wing 4, Staircase B)
  const spawnX = 625;
  const spawnY = 95;
  const exitX = 4 * WING_WIDTH + 625; // Wing 4 Staircase B
  const exitY = 650;

  return {
    rooms,
    doorways,
    obstacles,
    spawnX,
    spawnY,
    exitX,
    exitY,
  };
}

function generateClassroomFurniture(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  obstacles: GameObstacle[],
  floorNum: number,
  wing: number,
  roomIdx: number
) {
  // Let's place classroom desks in rows/cols
  const roomW = maxX - minX;
  const roomH = maxY - minY;

  // We have a 5 col x 4 row spacing potential
  const deskW = 16;
  const deskH = 12;

  const cols = 5;
  const rows = 4;

  const stepX = (roomW - 80) / cols;
  const stepY = (roomH - 40) / rows;

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      // 60% spawn probability creates organic spacing and pathways
      if (Math.random() < 0.60) {
        const dX = minX + 25 + c * stepX + Math.floor(Math.random() * 5);
        const dY = minY + 15 + r * stepY + Math.floor(Math.random() * 4);

        obstacles.push({
          x: dX,
          y: dY,
          width: deskW,
          height: deskH,
          name: `Classroom Desk W${wing}_R${roomIdx}_C${c}_R${r}`,
        });
      }
    }
  }

  // Teacher desk near the front
  obstacles.push({
    x: maxX - 45,
    y: minY + roomH / 2 - 25,
    width: 25,
    height: 50,
    name: "Teacher Table",
  });
}

/**
 * Loads campaign from localStorage or generates and saves a fresh one.
 */
export function getOrGenerateCampaign(forceNew: boolean = false): GameMapCampaign {
  const LOCAL_STORAGE_KEY = "creepy_manager_map_campaign_v2";

  if (!forceNew) {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const campaign = JSON.parse(stored) as GameMapCampaign;
        if (campaign && campaign.floors && campaign.gameId) {
          return campaign;
        }
      }
    } catch (e) {
      console.error("Failed to read map campaign from localStorage", e);
    }
  }

  // Generate completely fresh campaign
  const freshCampaign = generateCampaignMap();
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(freshCampaign));
  } catch (e) {
    console.error("Failed to write map campaign to localStorage", e);
  }

  return freshCampaign;
}

/**
 * Procedurally draws the technical blueprint of the 5x map to a Canvas.
 * This canvas is used both for the 2D minimap background and the 3D floor texture.
 */
export function drawCampaignMapToCanvas(canvas: HTMLCanvasElement, floorMap: FloorMapData, floorNum: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  // 1. Dark Blueprint background
  ctx.fillStyle = "#030712"; // Deep black-blue
  ctx.fillRect(0, 0, w, h);

  // 2. Blueprint technical grid lines
  ctx.strokeStyle = "rgba(56, 189, 248, 0.08)"; // Very faint glowing blue
  ctx.lineWidth = 1;
  const gridSpacing = 40;
  for (let x = 0; x < w; x += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // 3. Draw Rooms
  floorMap.rooms.forEach((room) => {
    let floorColor = "#0f172a"; // Default Corridor Hallway (slate blue)
    let strokeColor = "rgba(71, 85, 105, 0.4)"; // Faint slate outline

    if (room.id.startsWith("C_W")) {
      floorColor = "#0b0f19"; // Classroom (charcoal dark)
      strokeColor = "rgba(56, 189, 248, 0.35)"; // Cyan accent
    } else if (room.id.startsWith("Office") || room.id.includes("Storage") || room.id.includes("Breakroom")) {
      floorColor = "#091424"; // Office (warm dark slate)
      strokeColor = "rgba(129, 140, 248, 0.35)"; // Indigo accent
    } else if (room.id.startsWith("Stair")) {
      floorColor = "#1f140d"; // Stairwell (industrial rust brown)
      strokeColor = "rgba(245, 158, 11, 0.5)"; // Amber accent
    } else if (room.id.startsWith("Toilets")) {
      floorColor = "#180f24"; // Toilets (subtle violet)
      strokeColor = "rgba(168, 85, 247, 0.35)"; // Purple accent
    } else if (room.id.startsWith("Passage")) {
      floorColor = "#050a14"; // Inter-wing connector hallway
      strokeColor = "rgba(56, 189, 248, 0.25)";
    }

    // Draw Room Floor
    ctx.fillStyle = floorColor;
    ctx.fillRect(room.minX, room.minY, room.maxX - room.minX, room.maxY - room.minY);

    // Draw Room Walls / Outlines
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(room.minX, room.minY, room.maxX - room.minX, room.maxY - room.minY);

    // Hazard Stripes inside Stairs Landing Zones
    if (room.id.startsWith("Stair")) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(room.minX, room.minY, room.maxX - room.minX, room.maxY - room.minY);
      ctx.clip();

      ctx.strokeStyle = "rgba(245, 158, 11, 0.18)"; // Faint hazard yellow stripes
      ctx.lineWidth = 8;
      for (let offset = -100; offset < 300; offset += 20) {
        ctx.beginPath();
        ctx.moveTo(room.minX + offset, room.minY);
        ctx.lineTo(room.minX + offset + 80, room.maxY);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Draw Room text label (faint monospace style)
    ctx.fillStyle = "rgba(248, 250, 252, 0.35)";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const labelX = (room.minX + room.maxX) / 2;
    const labelY = (room.minY + room.maxY) / 2;

    let cleanName = room.name.toUpperCase();
    if (room.id.startsWith("StairA")) {
      cleanName = "▲ STAIRS UP (ASCENT)";
    } else if (room.id.startsWith("StairB")) {
      cleanName = "▼ ESCAPE STAIRS (DESCENT)";
    }
    ctx.fillText(cleanName, labelX, labelY);
  });

  // 4. Draw Doorways (carve wall openings and draw swing arcs)
  floorMap.doorways.forEach((door) => {
    // Determine overlapping room's floor color to blend door opening seamlessly
    let doorFloorColor = "#0f172a"; // Default corridor floor
    const centerDX = (door.minX + door.maxX) / 2;
    const centerDY = (door.minY + door.maxY) / 2;

    // Check if door is vertical (connecting left/right) or horizontal (connecting top/bottom)
    const isVertical = (door.maxX - door.minX) <= 25;

    ctx.fillStyle = doorFloorColor;
    ctx.fillRect(door.minX, door.minY, door.maxX - door.minX, door.maxY - door.minY);

    // Draw thin elegant door swing lines
    ctx.strokeStyle = "rgba(56, 189, 248, 0.7)"; // Technical cyan door line
    ctx.lineWidth = 1.2;
    ctx.beginPath();

    if (isVertical) {
      // Draw door leaf swung open at 45 degrees
      ctx.moveTo(door.minX, door.minY);
      ctx.lineTo(door.minX + (door.maxX - door.minX), door.minY - (door.maxY - door.minY) * 0.4);
      ctx.stroke();

      // Faint arc showing path of swing
      ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
      ctx.beginPath();
      ctx.arc(door.minX, door.minY, door.maxY - door.minY, 0, -Math.PI / 4, true);
      ctx.stroke();
    } else {
      // Horizontal doors
      ctx.moveTo(door.minX, door.minY);
      ctx.lineTo(door.minX - (door.maxX - door.minX) * 0.4, door.minY + (door.maxY - door.minY));
      ctx.stroke();

      ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
      ctx.beginPath();
      ctx.arc(door.minX, door.minY, door.maxX - door.minX, Math.PI / 2, Math.PI * 0.75);
      ctx.stroke();
    }
  });

  // 5. Draw Technical Scale and Blueprint title
  ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
  ctx.font = "bold 10px monospace";
  ctx.textAlign = "left";
  ctx.fillText(`CAMPAIGN MAP - FLOOR ${floorNum}`, 30, 25);
  ctx.font = "8px monospace";
  ctx.fillText("SCALE: 1 UNIT = 1PX | 5X HORIZONTAL WING EXTENSION", 30, 38);
}

