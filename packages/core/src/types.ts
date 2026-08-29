export const WAITING_ON_VALUES = [
  "candidate",
  "recruiter",
  "interviewer",
  "hiring_manager",
  "agency",
  "other",
] as const;

export type WaitingOn = (typeof WAITING_ON_VALUES)[number];

/**
 * YYYY-MM-DD
 *
 * Coreではタイムゾーン変換を行わない。
 * Worker / Web側でWorkspace timezoneを考慮したうえで
 * LocalDateへ変換して渡す。
 */
export type LocalDate = `${number}-${number}-${number}`;

export type CandidateSnapshot = {
  /**
   * Sheet上で候補者を一意に識別する値。
   *
   * 例:
   * - 応募者ID
   * - Candidate ID
   * - Email
   *
   * DBにはこの値をそのまま保存しない。
   */
  candidateKey: string;

  /**
   * UI表示用。
   * 永続保存しない。
   */
  candidateName?: string;

  stage: string;

  position?: string;

  recruiter?: string;

  /**
   * Sheetに明示的なWaiting On列がある場合に使用。
   * StageRuleよりこちらを優先する。
   */
  waitingOn?: WaitingOn;

  /**
   * 明示的な対応期限。
   */
  dueDate?: LocalDate;

  /**
   * Sheet側に最終更新日時が存在する場合の値。
   *
   * MVPのRule Engineでは直接使用しない。
   */
  updatedAt?: string;

  /**
   * 元Spreadsheetの行番号。
   *
   * CandidateEvaluationとSnapshotを
   * 一時的に対応付けるために利用する。
   */
  sourceRow: number;
};

export type StageRule = {
  /**
   * Sheetに実際に入っているStage値。
   *
   * 例:
   * "一次面接済"
   */
  stage: string;

  waitingOn: WaitingOn;

  /**
   * このStageで許容する営業日数。
   *
   * 例:
   * 1なら、1営業日経過までは正常。
   * 2営業日目にSTALEとなる。
   */
  slaBusinessDays: number;

  enabled: boolean;
};

export type CandidateEvaluationStatus =
  | "ok"
  | "due_today"
  | "stale"
  | "overdue";

export type AlertReason =
  | "due_date_overdue"
  | "due_today"
  | "sla_exceeded";

export type AlertSeverity =
  | "info"
  | "warning"
  | "critical";

export type CandidateEvaluation = {
  /**
   * Candidate Keyや候補者名をEvaluationには保持しない。
   */
  sourceRow: number;

  status: CandidateEvaluationStatus;

  waitingOn?: WaitingOn;

  elapsedBusinessDays: number;

  severity?: AlertSeverity;

  reason?: AlertReason;
};

export type EvaluateCandidateInput = {
  candidate: CandidateSnapshot;

  /**
   * CandidateのStageに対応するRule。
   * Ruleが存在しない場合はundefined。
   */
  rule?: StageRule;

  /**
   * fingerprintが最後に変化したWorkspaceローカル日付。
   */
  lastChangedDate: LocalDate;

  /**
   * Workspace timezoneを考慮した今日の日付。
   */
  today: LocalDate;
};