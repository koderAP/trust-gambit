import { setup, assign } from 'xstate';

export type GameStatus =
  | 'NOT_STARTED'
  | 'STAGE_1_ACTIVE'
  | 'STAGE_2_ACTIVE'
  | 'COMPLETED';

export type RoundStatus =
  | 'WAITING_FOR_START'
  | 'QUESTION_DISPLAYED'
  | 'ACCEPTING_SUBMISSIONS'
  | 'PROCESSING'
  | 'RESULTS_DISPLAYED'
  | 'COMPLETED';

export interface GameContext {
  gameId: string;
  lobbyId: string;
  currentStage: number;
  currentRound: number;
  totalRounds: number;
  stage1Rounds: number;
  stage2Rounds: number;
}

export const gameMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as
      | { type: 'START_GAME' }
      | { type: 'START_STAGE_1' }
      | { type: 'START_STAGE_2' }
      | { type: 'COMPLETE_STAGE_1' }
      | { type: 'COMPLETE_STAGE_2' }
      | { type: 'END_GAME' },
  },
}).createMachine({
  id: 'game',
  initial: 'notStarted',
  context: ({ input }: { input: Partial<GameContext> }) => ({
    gameId: input.gameId || '',
    lobbyId: input.lobbyId || '',
    currentStage: 0,
    currentRound: 0,
    totalRounds: input.totalRounds || 28,
    stage1Rounds: input.stage1Rounds || 20,
    stage2Rounds: input.stage2Rounds || 8,
  }),
  states: {
    notStarted: {
      on: {
        START_GAME: {
          target: 'stage1',
          actions: assign({
            currentStage: 1,
            currentRound: 1,
          }),
        },
      },
    },
    stage1: {
      on: {
        COMPLETE_STAGE_1: {
          target: 'stage2',
          actions: assign({
            currentStage: 2,
            currentRound: ({ context }) => context.stage1Rounds + 1,
          }),
        },
      },
    },
    stage2: {
      on: {
        COMPLETE_STAGE_2: {
          target: 'completed',
        },
      },
    },
    completed: {
      type: 'final',
    },
  },
});

export interface RoundContext {
  roundId: string;
  gameId: string;
  roundNumber: number;
  question: string;
  correctAnswer: string;
  durationSeconds: number;
  remainingSeconds: number;
  submissions: number;
  totalUsers: number;
}

export const roundMachine = setup({
  types: {
    context: {} as RoundContext,
    events: {} as
      | { type: 'START_ROUND' }
      | { type: 'DISPLAY_QUESTION' }
      | { type: 'OPEN_SUBMISSIONS' }
      | { type: 'USER_SUBMITTED' }
      | { type: 'CLOSE_SUBMISSIONS' }
      | { type: 'PROCESS_RESULTS' }
      | { type: 'DISPLAY_RESULTS' }
      | { type: 'COMPLETE_ROUND' }
      | { type: 'TICK'; seconds: number },
  },
}).createMachine({
  id: 'round',
  initial: 'waiting',
  context: ({ input }: { input: Partial<RoundContext> }) => ({
    roundId: input.roundId || '',
    gameId: input.gameId || '',
    roundNumber: input.roundNumber || 0,
    question: input.question || '',
    correctAnswer: input.correctAnswer || '',
    durationSeconds: input.durationSeconds || 300,
    remainingSeconds: input.durationSeconds || 300,
    submissions: 0,
    totalUsers: input.totalUsers || 0,
  }),
  states: {
    waiting: {
      on: {
        START_ROUND: 'displayingQuestion',
      },
    },
    displayingQuestion: {
      on: {
        OPEN_SUBMISSIONS: 'acceptingSubmissions',
      },
    },
    acceptingSubmissions: {
      on: {
        USER_SUBMITTED: {
          actions: assign({
            submissions: ({ context }) => context.submissions + 1,
          }),
        },
        TICK: {
          actions: assign({
            remainingSeconds: ({ event }) => event.seconds,
          }),
        },
        CLOSE_SUBMISSIONS: 'processing',
      },
    },
    processing: {
      on: {
        DISPLAY_RESULTS: 'displayingResults',
      },
    },
    displayingResults: {
      on: {
        COMPLETE_ROUND: 'completed',
      },
    },
    completed: {
      type: 'final',
    },
  },
});
