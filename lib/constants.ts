// Game constants for Trust Gambit

export const DOMAINS = [
  'Algorithms',
  'Finance',
  'Economics',
  'Statistics',
  'Probability',
  'Machine Learning',
  'Crypto',
  'Biology',
  'Indian History',
  'Game Theory',
] as const;

export type Domain = typeof DOMAINS[number];

export const STAGE_1_CONFIG = {
  totalPools: 8,
  playersPerPool: 15,
  totalPlayers: 120,
  roundsPerPool: 20,
  qualifiersPerPool: 2,
};

export const STAGE_2_CONFIG = {
  totalPlayers: 16,
  roundsTotal: 8,
  domains: ['Algorithms', 'Probability', 'Economics', 'Machine Learning'] as const,
};

export const SCORING_PARAMS = {
  lambda: 0.5,  // Chain propagation
  beta: 0.1,    // Trust bonus per delegator
  gamma: 0.2,   // Cycle penalty
};

export const GAME_STATES = {
  NOT_STARTED: 'NOT_STARTED',
  REGISTRATION_OPEN: 'REGISTRATION_OPEN',
  LOBBIES_FORMING: 'LOBBIES_FORMING',
  STAGE_1_ACTIVE: 'STAGE_1_ACTIVE',
  STAGE_1_COMPLETE: 'STAGE_1_COMPLETE',
  STAGE_2_ACTIVE: 'STAGE_2_ACTIVE',
  STAGE_2_COMPLETE: 'STAGE_2_COMPLETE',
  ENDED: 'ENDED',
} as const;

export const USER_STATES = {
  FORM_INCOMPLETE: 'FORM_INCOMPLETE',
  FORM_COMPLETE: 'FORM_COMPLETE',
  LOBBY_REQUESTED: 'LOBBY_REQUESTED',
  LOBBY_ASSIGNED: 'LOBBY_ASSIGNED',
} as const;
