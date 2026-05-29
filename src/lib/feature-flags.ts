export const ICARAI_UNIT_ID = '74b3608e-16f4-4ef8-bc5c-33c1495b2e9a';

export interface UnitFeatureFlags {
  counting: boolean;
  countHistory: boolean;
  profile: boolean;
  losses: boolean;
  mural: boolean;
  tasks: boolean;
  checklists: boolean;
  houseView: boolean;
  cmv: boolean;
  copilot: boolean;
  gamification: boolean;
  operationHero: boolean;
  isContagemOnly: boolean; // helper extra flag
}

const DEFAULT_FLAGS: UnitFeatureFlags = {
  counting: true,
  countHistory: true,
  profile: true,
  losses: true,
  mural: true,
  tasks: true,
  checklists: true,
  houseView: true,
  cmv: true,
  copilot: true,
  gamification: true,
  operationHero: true,
  isContagemOnly: false
};

const ICARAI_FLAGS: UnitFeatureFlags = {
  counting: true,
  countHistory: true,
  profile: true,
  losses: false,
  mural: false,
  tasks: false,
  checklists: false,
  houseView: false,
  cmv: false,
  copilot: false,
  gamification: false,
  operationHero: false,
  isContagemOnly: true
};

const LOADING_SAFE_FLAGS: UnitFeatureFlags = {
  counting: false,
  countHistory: false,
  profile: false,
  losses: false,
  mural: false,
  tasks: false,
  checklists: false,
  houseView: false,
  cmv: false,
  copilot: false,
  gamification: false,
  operationHero: false,
  isContagemOnly: true
};

export function getUnitFeatureFlags(unitId?: string | null, isLoading: boolean = false): UnitFeatureFlags {
  if (isLoading) {
    return LOADING_SAFE_FLAGS;
  }
  if (unitId === ICARAI_UNIT_ID) {
    return ICARAI_FLAGS;
  }
  return DEFAULT_FLAGS;
}
