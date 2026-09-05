// Rule Engine

import {
  compareLocalDate,
  countBusinessDaysAfter,
} from "./dates.js";

import type {
  CandidateEvaluation,
  EvaluateCandidateInput,
  StageRule,
} from "./types.js";

function validateRule(rule: StageRule): void {
  if (
    !Number.isInteger(rule.slaBusinessDays) ||
    rule.slaBusinessDays < 0
  ) {
    throw new RangeError(
      `slaBusinessDays must be a non-negative integer: ${rule.slaBusinessDays}`,
    );
  }
}

/**
 * CandidateのStageに一致する有効なRuleを探す。
 *
 * MVPでは完全一致。
 */
export function findStageRule(
  stage: string,
  rules: readonly StageRule[],
): StageRule | undefined {
  const normalizedStage = stage.trim();

  return rules.find(
    (rule) =>
      rule.enabled &&
      rule.stage.trim() === normalizedStage,
  );
}

export function evaluateCandidate(
  input: EvaluateCandidateInput,
): CandidateEvaluation {
  const {
    candidate,
    rule,
    lastChangedDate,
    today,
  } = input;

  if (rule) {
    validateRule(rule);
  }

  const activeRule =
    rule?.enabled === true
      ? rule
      : undefined;

  /**
   * Sheet側に明示的なWaiting Onがある場合、
   * StageRuleより優先する。
   */
  const waitingOn =
    candidate.waitingOn ??
    activeRule?.waitingOn;

  const elapsedBusinessDays =
    countBusinessDaysAfter(
      lastChangedDate,
      today,
    );

  /*
   * 明示的なDue Dateを最優先する。
   */
  if (candidate.dueDate) {
    const dueComparison =
      compareLocalDate(
        candidate.dueDate,
        today,
      );

    if (dueComparison < 0) {
      return {
        sourceRow: candidate.sourceRow,
        status: "overdue",
        waitingOn,
        elapsedBusinessDays,
        severity: "critical",
        reason: "due_date_overdue",
      };
    }

    if (dueComparison === 0) {
      return {
        sourceRow: candidate.sourceRow,
        status: "due_today",
        waitingOn,
        elapsedBusinessDays,
        severity: "info",
        reason: "due_today",
      };
    }
  }

  /*
   * Ruleが存在しなければSLA判定は行わない。
   */
  if (!activeRule) {
    return {
      sourceRow: candidate.sourceRow,
      status: "ok",
      waitingOn,
      elapsedBusinessDays,
    };
  }

  /*
   * SLA = 1の場合:
   *
   * elapsed = 0 → OK
   * elapsed = 1 → OK
   * elapsed = 2 → STALE
   */
  if (
    elapsedBusinessDays >
    activeRule.slaBusinessDays
  ) {
    return {
      sourceRow: candidate.sourceRow,
      status: "stale",
      waitingOn,
      elapsedBusinessDays,
      severity: "warning",
      reason: "sla_exceeded",
    };
  }

  return {
    sourceRow: candidate.sourceRow,
    status: "ok",
    waitingOn,
    elapsedBusinessDays,
  };
}