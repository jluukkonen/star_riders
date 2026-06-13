export enum GameMode {
  TITLE_SCREEN,
  MODE_SELECT,
  FREE_RIDE,        // Globe mode
  CITY_TRIAL,       // Stadium-style
  TIME_TRIAL,       // Track mode
  RESULTS,
}

// KAR's gmSetFreezeGameFlag pattern
export enum SystemFlag {
  NONE = 0,
  PLAYER_INPUT = 1 << 0,
  PHYSICS      = 1 << 1,
  UI           = 1 << 2,
  TRACK_PROXIMITY = 1 << 3,
  ALL          = ~0
}

export class GameFlowManager {
  currentMode: GameMode = GameMode.FREE_RIDE;
  nextMode: GameMode | null = null;
  freezeFlags: number = SystemFlag.NONE;

  transition(to: GameMode) {
    this.nextMode = to;
    // We can handle exit/entry logic here later if needed
  }

  processTransitions() {
    if (this.nextMode !== null) {
      this.currentMode = this.nextMode;
      this.nextMode = null;
      return true; // Mode changed this frame
    }
    return false;
  }

  freezeSystem(flag: SystemFlag) {
    this.freezeFlags |= flag;
  }

  unfreezeSystem(flag: SystemFlag) {
    this.freezeFlags &= ~flag;
  }

  isSystemFrozen(flag: SystemFlag) {
    return (this.freezeFlags & flag) !== 0;
  }
}
