
export enum AppStatus {
  SETUP = 'SETUP',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED'
}

export interface WorkoutState {
  totalRounds: number;
  currentRound: number;
  status: AppStatus;
  audioUrl: string | null;
}
