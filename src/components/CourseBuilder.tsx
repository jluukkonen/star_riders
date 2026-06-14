import React, { useState } from "react";
import { Trash2, Play, ArrowLeft, RotateCcw } from "lucide-react";

interface CourseBuilderProps {
  setAppMode: (mode: any) => void;
}

export const CourseBuilder: React.FC<CourseBuilderProps> = ({ setAppMode }) => {
  const [grid, setGrid] = useState<string[][]>(() => {
    const saved = localStorage.getItem("star_riders_custom_grid");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 16 && parsed.every(row => Array.isArray(row) && row.length === 16)) {
          return parsed;
        }
      } catch (e) {
        console.error("Error parsing saved custom grid:", e);
      }
    }
    if ((window as any)._customGrid) {
      return (window as any)._customGrid;
    }
    const defaultGrid = Array(16).fill(null).map(() => Array(16).fill("."));
    
    // Left boundary
    defaultGrid[2][1] = "TL";
    defaultGrid[3][1] = "|"; defaultGrid[4][1] = "|"; defaultGrid[5][1] = "|"; defaultGrid[6][1] = "|";
    defaultGrid[7][1] = "|"; defaultGrid[8][1] = "|"; defaultGrid[9][1] = "|"; defaultGrid[10][1] = "|";
    defaultGrid[11][1] = "|"; defaultGrid[12][1] = "|"; defaultGrid[13][1] = "|";
    defaultGrid[14][1] = "BL";

    // Top staircase
    defaultGrid[2][2] = "-"; defaultGrid[2][3] = "-"; defaultGrid[2][4] = "-";
    defaultGrid[3][5] = "-"; defaultGrid[3][6] = "-"; defaultGrid[3][7] = "-";
    defaultGrid[4][8] = "-"; defaultGrid[4][9] = "-"; defaultGrid[4][10] = "-";
    defaultGrid[5][11] = "-"; defaultGrid[5][12] = "-"; defaultGrid[5][13] = "TR";

    // Right boundary with Start/Finish and Boost Pads
    defaultGrid[6][13] = "|"; defaultGrid[7][13] = "|";
    defaultGrid[8][13] = "BP";
    defaultGrid[9][13] = "|";
    defaultGrid[10][13] = "SF";
    defaultGrid[11][13] = "|";
    defaultGrid[12][13] = "BP";
    defaultGrid[13][13] = "|"; defaultGrid[14][13] = "|";
    defaultGrid[15][13] = "BR";

    // Bottom-right U-turn
    defaultGrid[15][12] = "-";
    defaultGrid[15][11] = "BL";

    // Inner peak right diagonal
    defaultGrid[14][11] = "|"; defaultGrid[13][11] = "|"; defaultGrid[12][11] = "|"; defaultGrid[11][11] = "|";
    defaultGrid[10][10] = "|";
    defaultGrid[9][9] = "|";
    defaultGrid[8][9] = "TR";

    // Inner peak left diagonal
    defaultGrid[8][8] = "-";
    defaultGrid[9][7] = "-";
    defaultGrid[10][6] = "-";
    defaultGrid[11][5] = "-";
    defaultGrid[12][4] = "-";
    defaultGrid[13][3] = "-";
    defaultGrid[14][2] = "-";

    return defaultGrid;
  });

  const [selectedTile, setSelectedTile] = useState<string>("|");

  const tilesPalette = [
    { type: "|", label: "Vertical Straight ║", shortLabel: "Straight (V)", img: "roadStraight", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" },
    { type: "-", label: "Horizontal Straight ═", shortLabel: "Straight (H)", img: "roadStraight", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" },
    { type: "TL", label: "Turn Top-Left ╔", shortLabel: "Corner (TL)", img: "roadCornerSmall", color: "bg-pink-500/20 text-pink-400 border-pink-500/50" },
    { type: "TR", label: "Turn Top-Right ╗", shortLabel: "Corner (TR)", img: "roadCornerSmall", color: "bg-pink-500/20 text-pink-400 border-pink-500/50" },
    { type: "BL", label: "Turn Bottom-Left ╚", shortLabel: "Corner (BL)", img: "roadCornerSmall", color: "bg-pink-500/20 text-pink-400 border-pink-500/50" },
    { type: "BR", label: "Turn Bottom-Right ╝", shortLabel: "Corner (BR)", img: "roadCornerSmall", color: "bg-pink-500/20 text-pink-400 border-pink-500/50" },
    { type: "SF", label: "Start / Finish 🏁", shortLabel: "Start Line", img: "roadStart", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50" },
    { type: "BP", label: "Boost Pad ⚡", shortLabel: "Boost Pad", img: "roadStraightArrow", color: "bg-green-500/20 text-green-400 border-green-500/50" },
    { type: "ROAD_BRIDGE", label: "Bridge Straight 🌉", shortLabel: "Bridge", img: "roadStraightBridge", color: "bg-cyan-500/20 text-[#b0c4de] border-[#708090]/50" },
    { type: "ROAD_BUMP", label: "Road Bump 📈", shortLabel: "Speed Bump", img: "roadBump", color: "bg-cyan-500/20 text-teal-400 border-teal-500/50" },
    
    // 2x2 Large Corners
    { type: "L2_TL", label: "Large Corner TL ╔", shortLabel: "Lrg Corner (TL)", img: "roadCornerLarge", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" },
    { type: "L2_TR", label: "Large Corner TR ╗", shortLabel: "Lrg Corner (TR)", img: "roadCornerLarge", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" },
    { type: "L2_BL", label: "Large Corner BL ╚", shortLabel: "Lrg Corner (BL)", img: "roadCornerLarge", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" },
    { type: "L2_BR", label: "Large Corner BR ╝", shortLabel: "Lrg Corner (BR)", img: "roadCornerLarge", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" },
    
    // 3x3 Larger Corners
    { type: "L3_TL", label: "Larger Corner TL ╔", shortLabel: "Lrgr Corner (TL)", img: "roadCornerLarger", color: "bg-pink-500/20 text-pink-400 border-pink-500/50" },
    { type: "L3_TR", label: "Larger Corner TR ╗", shortLabel: "Lrgr Corner (TR)", img: "roadCornerLarger", color: "bg-pink-500/20 text-pink-400 border-pink-500/50" },
    { type: "L3_BL", label: "Larger Corner BL ╚", shortLabel: "Lrgr Corner (BL)", img: "roadCornerLarger", color: "bg-pink-500/20 text-pink-400 border-pink-500/50" },
    { type: "L3_BR", label: "Larger Corner BR ╝", shortLabel: "Lrgr Corner (BR)", img: "roadCornerLarger", color: "bg-pink-500/20 text-pink-400 border-pink-500/50" },

    // Decors and Tools
    { type: "DECOR_TREE", label: "Tree 🌳", shortLabel: "Tree", img: "treeLarge", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" },
    { type: "DECOR_BILLBOARD", label: "Billboard 📺", shortLabel: "Billboard", img: "billboard", color: "bg-violet-500/20 text-violet-400 border-violet-500/50" },
    { type: "DECOR_GRANDSTAND", label: "Grandstand 🏟️", shortLabel: "Grandstand", img: "grandStand", color: "bg-orange-500/20 text-orange-400 border-orange-500/50" },
    { type: "DECOR_LIGHT", label: "Light Post 💡", shortLabel: "Light Post", img: "lightPostModern", color: "bg-amber-500/20 text-amber-400 border-amber-500/50" },
    { type: "OBSTACLE_PYLON", label: "Pylon ⚠️", shortLabel: "Pylon", img: "pylon", color: "bg-red-500/20 text-red-400 border-red-500/50" },
    { type: ".", label: "Eraser ❌", shortLabel: "Eraser", img: "eraser", color: "bg-white/5 text-white/50 border-white/10" },
  ];

  const getMultiTileInfo = (cellVal: string) => {
    if (!cellVal) return null;
    const parts = cellVal.split("_");
    if (parts.length >= 5 && (parts[0] === "L2" || parts[0] === "L3")) {
      const size = parts[0] === "L2" ? 2 : 3;
      const rOffset = parseInt(parts[2], 10);
      const cOffset = parseInt(parts[3], 10);
      return {
        prefix: parts[0] + "_" + parts[1],
        size,
        rOffset,
        cOffset
      };
    }
    return null;
  };

  const clearGridCell = (currentGrid: string[][], r: number, c: number): string[][] => {
    const cellVal = currentGrid[r][c];
    const info = getMultiTileInfo(cellVal);
    if (info) {
      const anchorR = r - info.rOffset;
      const anchorC = c - info.cOffset;
      return currentGrid.map((rowArr, ri) =>
        rowArr.map((val, ci) => {
          if (ri >= anchorR && ri < anchorR + info.size && ci >= anchorC && ci < anchorC + info.size) {
            return ".";
          }
          return val;
        })
      );
    } else {
      return currentGrid.map((rowArr, ri) =>
        rowArr.map((val, ci) => (ri === r && ci === c ? "." : val))
      );
    }
  };

  const placeTileOnGrid = (currentGrid: string[][], r: number, c: number, tileType: string): string[][] => {
    if (tileType === ".") {
      return clearGridCell(currentGrid, r, c);
    }

    const isL2 = tileType.startsWith("L2_");
    const isL3 = tileType.startsWith("L3_");

    if (!isL2 && !isL3) {
      const tempGrid = clearGridCell(currentGrid, r, c);
      return tempGrid.map((rowArr, ri) =>
        rowArr.map((val, ci) => (ri === r && ci === c ? tileType : val))
      );
    }

    const size = isL2 ? 2 : 3;
    if (r + size > 16 || c + size > 16) {
      return currentGrid;
    }

    let tempGrid = currentGrid;
    for (let ri = r; ri < r + size; ri++) {
      for (let ci = c; ci < c + size; ci++) {
        tempGrid = clearGridCell(tempGrid, ri, ci);
      }
    }

    const layout: string[][] = Array(size).fill(null).map(() => Array(size).fill(""));
    for (let dr = 0; dr < size; dr++) {
      for (let dc = 0; dc < size; dc++) {
        let isPath = false;
        if (isL2) {
          if (tileType === "L2_TL") isPath = (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
          else if (tileType === "L2_TR") isPath = (dr === 0 && dc === 0) || (dr === 1 && dc === 1);
          else if (tileType === "L2_BL") isPath = (dr === 0 && dc === 0) || (dr === 1 && dc === 1);
          else if (tileType === "L2_BR") isPath = (dr === 0 && dc === 1) || (dr === 1 && dc === 0);
        } else {
          if (tileType === "L3_TL") isPath = (dr === 2 && dc === 0) || (dr === 1 && dc === 1) || (dr === 0 && dc === 2);
          else if (tileType === "L3_TR") isPath = (dr === 2 && dc === 2) || (dr === 1 && dc === 1) || (dr === 0 && dc === 0);
          else if (tileType === "L3_BL") isPath = (dr === 0 && dc === 0) || (dr === 1 && dc === 1) || (dr === 2 && dc === 2);
          else if (tileType === "L3_BR") isPath = (dr === 0 && dc === 2) || (dr === 1 && dc === 1) || (dr === 2 && dc === 0);
        }
        layout[dr][dc] = `${tileType}_${dr}_${dc}_${isPath ? "P" : "O"}`;
      }
    }

    return tempGrid.map((rowArr, ri) =>
      rowArr.map((val, ci) => {
        if (ri >= r && ri < r + size && ci >= c && ci < c + size) {
          return layout[ri - r][ci - c];
        }
        return val;
      })
    );
  };

  const handleCellClick = (r: number, c: number) => {
    const newGrid = placeTileOnGrid(grid, r, c, selectedTile);
    setGrid(newGrid);
    localStorage.setItem("star_riders_custom_grid", JSON.stringify(newGrid));
    (window as any)._customGrid = newGrid;
  };

  const clearGrid = () => {
    const newGrid = Array(16)
      .fill(null)
      .map(() => Array(16).fill("."));
    setGrid(newGrid);
    localStorage.setItem("star_riders_custom_grid", JSON.stringify(newGrid));
    (window as any)._customGrid = newGrid;
  };

  const loadMarioTemplate = () => {
    const newGrid = Array(16)
      .fill(null)
      .map(() => Array(16).fill("."));

    // Left boundary
    newGrid[2][1] = "TL";
    newGrid[3][1] = "|"; newGrid[4][1] = "|"; newGrid[5][1] = "|"; newGrid[6][1] = "|";
    newGrid[7][1] = "|"; newGrid[8][1] = "|"; newGrid[9][1] = "|"; newGrid[10][1] = "|";
    newGrid[11][1] = "|"; newGrid[12][1] = "|"; newGrid[13][1] = "|";
    newGrid[14][1] = "BL";

    // Top staircase
    newGrid[2][2] = "-"; newGrid[2][3] = "-"; newGrid[2][4] = "-";
    newGrid[3][5] = "-"; newGrid[3][6] = "-"; newGrid[3][7] = "-";
    newGrid[4][8] = "-"; newGrid[4][9] = "-"; newGrid[4][10] = "-";
    newGrid[5][11] = "-"; newGrid[5][12] = "-"; newGrid[5][13] = "TR";

    // Right boundary with Start/Finish and Boost Pads
    newGrid[6][13] = "|"; newGrid[7][13] = "|";
    newGrid[8][13] = "BP"; // Boost Pad
    newGrid[9][13] = "|";
    newGrid[10][13] = "SF"; // Start/Finish
    newGrid[11][13] = "|";
    newGrid[12][13] = "BP"; // Boost Pad
    newGrid[13][13] = "|"; newGrid[14][13] = "|";
    newGrid[15][13] = "BR";

    // Bottom-right U-turn
    newGrid[15][12] = "-";
    newGrid[15][11] = "BL";

    // Inner peak right diagonal
    newGrid[14][11] = "|"; newGrid[13][11] = "|"; newGrid[12][11] = "|"; newGrid[11][11] = "|";
    newGrid[10][10] = "|";
    newGrid[9][9] = "|";
    newGrid[8][9] = "TR";

    // Inner peak left diagonal
    newGrid[8][8] = "-";
    newGrid[9][7] = "-";
    newGrid[10][6] = "-";
    newGrid[11][5] = "-";
    newGrid[12][4] = "-";
    newGrid[13][3] = "-";
    newGrid[14][2] = "-";

    setGrid(newGrid);
    localStorage.setItem("star_riders_custom_grid", JSON.stringify(newGrid));
    (window as any)._customGrid = newGrid;
  };

  const playCourse = () => {
    (window as any)._customGrid = grid;
    setAppMode("track_custom");
    (window as any)._appMode = "track_custom";
    (window as any)._modeSwitch = "track";
  };

  const renderTileVisual = (val: string, r: number = 0, c: number = 0) => {
    const isRoadCell = (ri: number, ci: number) => {
      if (ri < 0 || ri >= 16 || ci < 0 || ci >= 16) return false;
      const t = grid[ri][ci];
      return t === "|" || t === "-" || t === "TL" || t === "TR" || 
             t === "BL" || t === "BR" || t === "SF" || t === "BP" || 
             t === "ROAD_BRIDGE" || t === "ROAD_BUMP" || t.endsWith("_P");
    };

    if (val.startsWith("L2_") || val.startsWith("L3_")) {
      const isL3 = val.startsWith("L3_");
      const isMaster = val.includes("_0_0_");

      if (isMaster) {
        const imgFile = isL3 ? "roadCornerLarger" : "roadCornerLarge";
        let angle = 0;
        if (val.includes("_TR_")) angle = 90;
        else if (val.includes("_BR_")) angle = 180;
        else if (val.includes("_BL_")) angle = 270;

        const multiplier = isL3 ? 300 : 200;

        return (
          <div 
            className="absolute top-0 left-0 z-20 pointer-events-none flex items-center justify-center bg-cyan-500/10 border border-cyan-500/30 rounded-lg"
            style={{
              width: `${multiplier}%`,
              height: `${multiplier}%`,
            }}
          >
            <img 
              src={`/isometric/${imgFile}.png`} 
              alt="Corner Large" 
              className="w-full h-full object-contain p-1"
              style={{
                transform: `rotate(${angle}deg)`,
                transition: "transform 0.2s ease-in-out",
              }}
            />
          </div>
        );
      } else {
        return (
          <div className="absolute inset-0 bg-white/5 border border-dashed border-white/5 pointer-events-none" />
        );
      }
    }

    switch (val) {
      case "|":
        return (
          <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
            {/* Road body */}
            <div className="w-[60%] h-full bg-zinc-700 relative flex justify-center">
              {/* Dashed centerline */}
              <div className="w-[2px] h-full border-l border-dashed border-zinc-400/60 absolute left-1/2 -translate-x-1/2" />
            </div>
          </div>
        );
      case "-":
        return (
          <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
            {/* Road body */}
            <div className="w-full h-[60%] bg-zinc-700 relative flex items-center">
              {/* Dashed centerline */}
              <div className="w-full h-[2px] border-t border-dashed border-zinc-400/60 absolute top-1/2 -translate-y-1/2" />
            </div>
          </div>
        );
      case "TL": // Connects South (bottom) and East (right)
        return (
          <div className="absolute inset-0 pointer-events-none">
            {/* Vertical part (center to bottom) */}
            <div className="absolute left-[20%] right-[20%] bottom-0 top-[20%] bg-zinc-700" />
            {/* Horizontal part (center to right) */}
            <div className="absolute left-[20%] right-0 top-[20%] bottom-[20%] bg-zinc-700" />
            {/* Center curve rounding */}
            <div className="absolute left-[20%] top-[20%] w-[60%] h-[60%] bg-zinc-700 rounded-tl-md" />
            <div className="absolute left-[45%] top-[45%] w-1.5 h-1.5 rounded-full bg-pink-500 shadow-[0_0_6px_#ff007f]" />
          </div>
        );
      case "TR": // Connects South (bottom) and West (left)
        return (
          <div className="absolute inset-0 pointer-events-none">
            {/* Vertical part (center to bottom) */}
            <div className="absolute left-[20%] right-[20%] bottom-0 top-[20%] bg-zinc-700" />
            {/* Horizontal part (center to left) */}
            <div className="absolute left-0 right-[20%] top-[20%] bottom-[20%] bg-zinc-700" />
            {/* Center curve rounding */}
            <div className="absolute left-[20%] top-[20%] w-[60%] h-[60%] bg-zinc-700 rounded-tr-md" />
            <div className="absolute left-[45%] top-[45%] w-1.5 h-1.5 rounded-full bg-pink-500 shadow-[0_0_6px_#ff007f]" />
          </div>
        );
      case "BL": // Connects North (top) and East (right)
        return (
          <div className="absolute inset-0 pointer-events-none">
            {/* Vertical part (center to top) */}
            <div className="absolute left-[20%] right-[20%] top-0 bottom-[20%] bg-zinc-700" />
            {/* Horizontal part (center to right) */}
            <div className="absolute left-[20%] right-0 top-[20%] bottom-[20%] bg-zinc-700" />
            {/* Center curve rounding */}
            <div className="absolute left-[20%] top-[20%] w-[60%] h-[60%] bg-zinc-700 rounded-bl-md" />
            <div className="absolute left-[45%] top-[45%] w-1.5 h-1.5 rounded-full bg-pink-500 shadow-[0_0_6px_#ff007f]" />
          </div>
        );
      case "BR": // Connects North (top) and West (left)
        return (
          <div className="absolute inset-0 pointer-events-none">
            {/* Vertical part (center to top) */}
            <div className="absolute left-[20%] right-[20%] top-0 bottom-[20%] bg-zinc-700" />
            {/* Horizontal part (center to left) */}
            <div className="absolute left-0 right-[20%] top-[20%] bottom-[20%] bg-zinc-700" />
            {/* Center curve rounding */}
            <div className="absolute left-[20%] top-[20%] w-[60%] h-[60%] bg-zinc-700 rounded-br-md" />
            <div className="absolute left-[45%] top-[45%] w-1.5 h-1.5 rounded-full bg-pink-500 shadow-[0_0_6px_#ff007f]" />
          </div>
        );
      case "SF":
        return (
          <div className="absolute inset-0 flex justify-center items-center bg-zinc-800 border border-yellow-500/40 rounded overflow-hidden pointer-events-none">
            {/* Checkered flag strip */}
            <div className="w-full h-[70%] flex flex-col justify-between items-center bg-zinc-700 relative">
              <div className="w-full h-1 bg-zinc-900 flex overflow-hidden">
                <span className="w-1/4 h-full bg-white" />
                <span className="w-1/4 h-full bg-black" />
                <span className="w-1/4 h-full bg-white" />
                <span className="w-1/4 h-full bg-black" />
              </div>
              <span className="text-[8px] sm:text-[9px] leading-none text-yellow-400 font-black tracking-tighter">START</span>
              <div className="w-full h-1 bg-zinc-900 flex overflow-hidden">
                <span className="w-1/4 h-full bg-black" />
                <span className="w-1/4 h-full bg-white" />
                <span className="w-1/4 h-full bg-black" />
                <span className="w-1/4 h-full bg-white" />
              </div>
            </div>
          </div>
        );
      case "BP":
        return (
          <div className="absolute inset-0 flex justify-center items-center bg-zinc-800 border border-green-500/40 rounded overflow-hidden pointer-events-none">
            {/* Boost chevron icon */}
            <div className="w-[70%] h-[70%] bg-green-500/20 rounded flex items-center justify-center border border-green-400/50 shadow-[0_0_8px_rgba(34,197,94,0.4)] animate-pulse">
              <span className="text-[10px] font-black text-green-400">⚡</span>
            </div>
          </div>
        );
      case "ROAD_BRIDGE": {
        const isVertBridge = isRoadCell(r - 1, c) || isRoadCell(r + 1, c);
        if (isVertBridge) {
          return (
            <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
              <div className="w-[60%] h-full bg-slate-700 relative border-l border-r border-[#b0c4de]/60 flex justify-center">
                <div className="w-full h-full bg-[linear-gradient(45deg,rgba(0,0,0,0.15)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.15)_50%,rgba(0,0,0,0.15)_75%,transparent_75%,transparent)] bg-[size:6px_6px]" />
              </div>
            </div>
          );
        } else {
          return (
            <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
              <div className="w-full h-[60%] bg-slate-700 relative border-t border-b border-[#b0c4de]/60 flex items-center">
                <div className="w-full h-full bg-[linear-gradient(45deg,rgba(0,0,0,0.15)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.15)_50%,rgba(0,0,0,0.15)_75%,transparent_75%,transparent)] bg-[size:6px_6px]" />
              </div>
            </div>
          );
        }
      }
      case "ROAD_BUMP": {
        const isVertBump = isRoadCell(r - 1, c) || isRoadCell(r + 1, c);
        if (isVertBump) {
          return (
            <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
              <div className="w-[60%] h-full bg-zinc-700 relative flex flex-col justify-center items-center">
                <div className="w-[2px] h-full border-l border-dashed border-zinc-400/60 absolute left-1/2 -translate-x-1/2" />
                <div className="w-full h-1.5 bg-yellow-500/80 border-t border-b border-black absolute top-[40%] flex justify-around" />
              </div>
            </div>
          );
        } else {
          return (
            <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
              <div className="w-full h-[60%] bg-zinc-700 relative flex items-center justify-center">
                <div className="w-full h-[2px] border-t border-dashed border-zinc-400/60 absolute top-1/2 -translate-y-1/2" />
                <div className="h-full w-1.5 bg-yellow-500/80 border-l border-r border-black absolute left-[40%]" />
              </div>
            </div>
          );
        }
      }
      case "DECOR_TREE":
        return (
          <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
            <div className="w-[65%] h-[65%] rounded-full bg-emerald-600 border border-emerald-500 flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.3)]">
              <span className="text-[10px]">🌳</span>
            </div>
          </div>
        );
      case "DECOR_BILLBOARD":
        return (
          <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
            <div className="w-[85%] h-[55%] bg-violet-950 border border-violet-500 rounded flex items-center justify-center shadow-[0_0_8px_rgba(139,92,246,0.3)]">
              <span className="text-[8px] font-black text-violet-300 tracking-tighter">LIVE</span>
            </div>
          </div>
        );
      case "DECOR_GRANDSTAND":
        return (
          <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
            <div className="w-[80%] h-[70%] bg-orange-950 border border-orange-500 rounded flex flex-col justify-around p-0.5 shadow-[0_0_8px_rgba(249,115,22,0.3)]">
              <div className="w-full h-[3px] bg-orange-800 rounded-sm" />
              <div className="w-full h-[3px] bg-orange-700 rounded-sm" />
              <div className="w-full h-[3px] bg-orange-600 rounded-sm" />
            </div>
          </div>
        );
      case "DECOR_LIGHT":
        return (
          <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
            <div className="w-[50%] h-[80%] flex flex-col items-center justify-between">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_10px_#f59e0b] animate-pulse" />
              <div className="w-0.5 h-full bg-zinc-600" />
            </div>
          </div>
        );
      case "OBSTACLE_PYLON":
        return (
          <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
            <div className="w-[60%] h-[75%] flex flex-col justify-end items-center relative">
              <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[14px] border-b-red-500 relative flex justify-center">
                <div className="w-1.5 h-0.5 bg-white absolute top-1" />
              </div>
              <div className="w-[70%] h-[2px] bg-red-600 rounded" />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center z-50 pointer-events-auto p-6 font-mono text-white select-none">
      <div className="text-3xl font-black italic mb-2 tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 drop-shadow-[0_0_10px_rgba(0,255,200,0.3)]">
        TRACK BUILDER 🛠️
      </div>
      <div className="text-[10px] text-white/50 mb-6 uppercase tracking-wider">
        Paint modular tiles on the grid to construct your custom track
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start justify-center max-w-5xl w-full">
        {/* Palette Panel */}
        <div className="flex flex-col gap-3 w-full md:w-72 bg-white/5 border border-white/10 p-3.5 rounded-xl backdrop-blur-sm">
          <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest border-b border-white/10 pb-1 flex items-center justify-between">
            <span>Road & Track</span>
            <span className="text-[9px] text-white/35 normal-case font-normal">18 Tiles</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {tilesPalette.slice(0, 18).map((t) => (
              <button
                key={t.type}
                onClick={() => setSelectedTile(t.type)}
                title={t.label}
                className={`flex items-center gap-1.5 p-1 rounded-lg border text-left cursor-pointer transition-all ${
                  selectedTile === t.type
                    ? `${t.color} border-white/30 scale-[1.02] shadow-[0_0_8px_rgba(255,255,255,0.08)]`
                    : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                <img 
                  src={`/isometric/${t.img}.png`} 
                  alt={t.label} 
                  className="w-8 h-8 object-contain bg-black/45 border border-white/10 rounded p-0.5 shrink-0"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-black leading-tight truncate">{t.shortLabel}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="text-[10px] font-bold text-pink-400 uppercase tracking-widest border-b border-white/10 pb-1 mt-1 flex items-center justify-between">
            <span>Decor & Tools</span>
            <span className="text-[9px] text-white/35 normal-case font-normal">6 Tiles</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {tilesPalette.slice(18).map((t) => (
              <button
                key={t.type}
                onClick={() => setSelectedTile(t.type)}
                title={t.label}
                className={`flex items-center gap-1.5 p-1 rounded-lg border text-left cursor-pointer transition-all ${
                  selectedTile === t.type
                    ? `${t.color} border-white/30 scale-[1.02] shadow-[0_0_8px_rgba(255,255,255,0.08)]`
                    : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                {t.type === "." ? (
                  <div className="w-8 h-8 rounded bg-black/45 border border-white/10 flex items-center justify-center text-[10px] shrink-0">❌</div>
                ) : (
                  <img 
                    src={`/isometric/${t.img}.png`} 
                    alt={t.label} 
                    className="w-8 h-8 object-contain bg-black/45 border border-white/10 rounded p-0.5 shrink-0"
                  />
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-black leading-tight truncate">{t.shortLabel}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Grid Area */}
        <div className="flex flex-col items-center">
          <div className="bg-black/60 border-2 border-white/10 p-2.5 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)]">
            <div className="grid gap-0.5 bg-white/5 p-0.5 rounded-lg" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}>
              {grid.map((rowArr, r) =>
                rowArr.map((cellVal, c) => {
                  return (
                    <button
                      key={`${r}-${c}`}
                      onClick={() => handleCellClick(r, c)}
                      className={`w-[26px] h-[26px] sm:w-[32px] sm:h-[32px] text-center text-xs flex items-center justify-center transition-all focus:outline-none cursor-pointer rounded relative border ${
                        cellVal === "."
                          ? "bg-black/40 hover:bg-white/5 border-white/5 hover:border-white/10"
                          : "bg-zinc-800 border-zinc-700/50"
                      }`}
                      title={`Cell row ${r}, col ${c}`}
                    >
                      {renderTileVisual(cellVal, r, c)}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-5 w-full">
            <button
              onClick={loadMarioTemplate}
              className="flex items-center gap-2 bg-[#ffcc00]/10 border border-[#ffcc00]/40 text-[#ffcc00] hover:bg-[#ffcc00]/20 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Load Mario Template
            </button>
            <button
              onClick={clearGrid}
              className="flex items-center gap-2 bg-red-500/10 border border-red-500/40 text-red-400 hover:bg-red-500/20 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Grid
            </button>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-4 mt-8 border-t border-white/10 pt-6 w-full max-w-4xl justify-center">
        <button
          onClick={() => setAppMode("menu")}
          className="flex items-center gap-2 bg-white/5 border border-white/20 text-white/70 hover:bg-white/10 hover:text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel & Menu
        </button>
        <button
          onClick={playCourse}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-[0_0_15px_rgba(0,255,200,0.2)] hover:scale-105 active:scale-95"
        >
          <Play className="w-4 h-4 fill-white" />
          Play Course 🏁
        </button>
      </div>
    </div>
  );
};
