import {
    describe,
    expect,
    it,
} from "vitest"

import {
    evaluateCandidate,
    findStageRule,
} from "./rule-engine.js"

import type {
    CandidateSnapshot,
    StageRule
} from "./types.js"

const baseCandidate: CandidateSnapshot = {
    candidateKey: "candidate-001",
    candidateName: "Test Candidate",
    stage: "一次面接済",
    sourceRow: 2,
}

const interviewerRule: StageRule = {
    stage: "一次面接済",
    waitingOn: "interviewer",
    slaBusinessDays: 1,
    enabled: true,
}

describe("findStageRule", () => {
    it("stageに一致する有効なruleを返す", () => {
        const result = findStageRule(
            "一次面接済",
            [interviewerRule],
        );

        expect(result).toEqual(interviewerRule);
    });

    it("前後の空白を無視する", () => {
        const result = findStageRule(
            " 一次面接済 ",
            [interviewerRule],
        );

        expect(result).toEqual(interviewerRule);
    });

    it("disabled rule は返さない", () => {
        const result = findStageRule(
            "一次面接済",
            [
                {
                    ...interviewerRule,
                    enabled: false,
                },
            ],
        );
        
        expect(result).toBeUndefined();
    });
});

describe("evaluateCandidate", () => {
  it("明示的な期限を過ぎていればoverdue", () => {
    const result = evaluateCandidate({
      candidate: {
        ...baseCandidate,
        dueDate: "2026-08-28",
      },
      rule: interviewerRule,
      lastChangedDate: "2026-08-27",
      today: "2026-08-29",
    });

    expect(result.status).toBe("overdue");
    expect(result.reason).toBe(
      "due_date_overdue",
    );
    expect(result.severity).toBe(
      "critical",
    );
  });

  it("期限当日ならdue_today", () => {
    const result = evaluateCandidate({
      candidate: {
        ...baseCandidate,
        dueDate: "2026-08-29",
      },
      rule: interviewerRule,
      lastChangedDate: "2026-08-28",
      today: "2026-08-29",
    });

    expect(result.status).toBe(
      "due_today",
    );

    expect(result.reason).toBe(
      "due_today",
    );
  });

  it("SLAを超過するとstale", () => {
    const result = evaluateCandidate({
      candidate: baseCandidate,
      rule: interviewerRule,

      // Monday
      lastChangedDate: "2026-08-24",

      // Wednesday
      today: "2026-08-26",
    });

    expect(
      result.elapsedBusinessDays,
    ).toBe(2);

    expect(result.status).toBe("stale");

    expect(result.reason).toBe(
      "sla_exceeded",
    );

    expect(result.waitingOn).toBe(
      "interviewer",
    );
  });

  it("FridayからMondayは1営業日なのでSLA=1なら正常", () => {
    const result = evaluateCandidate({
      candidate: baseCandidate,
      rule: interviewerRule,

      // Friday
      lastChangedDate: "2026-08-28",

      // Monday
      today: "2026-08-31",
    });

    expect(
      result.elapsedBusinessDays,
    ).toBe(1);

    expect(result.status).toBe("ok");
  });

  it("Candidateに明示されたwaitingOnをRuleより優先する", () => {
    const result = evaluateCandidate({
      candidate: {
        ...baseCandidate,
        waitingOn: "candidate",
      },
      rule: interviewerRule,
      lastChangedDate: "2026-08-24",
      today: "2026-08-26",
    });

    expect(result.waitingOn).toBe(
      "candidate",
    );
  });

  it("RuleがなければSLA判定しない", () => {
    const result = evaluateCandidate({
      candidate: baseCandidate,
      lastChangedDate: "2026-08-01",
      today: "2026-08-29",
    });

    expect(result.status).toBe("ok");
  });
});