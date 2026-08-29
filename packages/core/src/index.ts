// Public API

export {
  compareLocalDate,
  countBusinessDaysAfter,
} from "./dates.js";

export {
  evaluateCandidate,
  findStageRule,
} from "./rule-engine.js";

export {
  WAITING_ON_VALUES,
} from "./types.js";

export type {
  AlertReason,
  AlertSeverity,
  CandidateEvaluation,
  CandidateEvaluationStatus,
  CandidateSnapshot,
  EvaluateCandidateInput,
  LocalDate,
  StageRule,
  WaitingOn,
} from "./types.js";