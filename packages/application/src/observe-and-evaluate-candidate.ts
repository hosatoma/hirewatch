import {
  evaluateCandidate,
  findStageRule,

  type CandidateEvaluation,
  type CandidateSnapshot,
  type StageRule,
} from "@hirewatch/core";

import {
  assertKey32,
  createCandidateHmac,
  createCandidateStateFingerprint,
} from "@hirewatch/crypto";

import type {
  CandidateStateObservation,
  CandidateStateRepositoryPort,
} from "./candidate-state-port.js";

import {
  normalizeInstant,
  toLocalDate,
} from "./timezone.js";


export type CandidateObservationServiceDependencies = {
  repository:
    CandidateStateRepositoryPort;

  candidateHmacKey:
    Uint8Array;
};


export type ObserveAndEvaluateCandidateInput = {
  workspaceId: string;

  workspaceTimeZone: string;

  sheetSourceId: string;

  candidate:
    CandidateSnapshot;

  rules:
    readonly StageRule[];

  /**
   * このScanの基準時刻。
   *
   * Date.now()をService内部で呼ばず、
   * 呼び出し側から渡す。
   */
  observedAt: string;
};


export type ObserveAndEvaluateCandidateResult = {
  observation:
    CandidateStateObservation;

  evaluation:
    CandidateEvaluation;
};


export class CandidateObservationService {
  private readonly repository:
    CandidateStateRepositoryPort;

  private readonly candidateHmacKey:
    Uint8Array;


  constructor(
    dependencies:
      CandidateObservationServiceDependencies,
  ) {
    assertKey32(
      dependencies.candidateHmacKey,
    );

    this.repository =
      dependencies.repository;

    /*
     * 呼び出し側が後からUint8Arrayを書き換えても
     * Service内部のkeyが変わらないようコピー。
     */
    this.candidateHmacKey =
      new Uint8Array(
        dependencies.candidateHmacKey,
      );
  }


  async observeAndEvaluate(
    input:
      ObserveAndEvaluateCandidateInput,
  ): Promise<
    ObserveAndEvaluateCandidateResult
  > {

    const workspaceId =
      input.workspaceId.trim();

    const sheetSourceId =
      input.sheetSourceId.trim();


    if (
      workspaceId.length === 0
    ) {
      throw new Error(
        "workspaceId must not be empty",
      );
    }


    if (
      sheetSourceId.length === 0
    ) {
      throw new Error(
        "sheetSourceId must not be empty",
      );
    }


    /*
     * 一度UTC ISOへ正規化して、
     * Repositoryとtimezone計算で同じ基準時刻を使う。
     */
    const observedAt =
      normalizeInstant(
        input.observedAt,
      );


    // ============================================
    // Candidate identifier
    // ============================================

    const candidateHmac =
      createCandidateHmac({
        workspaceId,

        candidateKey:
          input.candidate
            .candidateKey,

        secretKey:
          this.candidateHmacKey,
      });


    // ============================================
    // Candidate state fingerprint
    //
    // Stage Ruleから推論したwaitingOnは
    // fingerprintへ入れない。
    //
    // Rule設定変更をCandidate activityとして
    // 誤認しないため。
    // ============================================

    const fingerprint =
      createCandidateStateFingerprint({
        stage:
          input.candidate.stage,

        waitingOn:
          input.candidate
            .waitingOn,

        dueDate:
          input.candidate
            .dueDate,

        recruiter:
          input.candidate
            .recruiter,
      });


    // ============================================
    // Persist / observe state
    // ============================================

    const observation =
      await this.repository.observe({
        sheetSourceId,

        candidateHmac,

        fingerprint,

        observedAt,
      });


    // ============================================
    // Convert timestamps to Workspace local dates
    // ============================================

    const today =
      toLocalDate(
        observedAt,
        input.workspaceTimeZone,
      );


    const lastChangedDate =
      toLocalDate(
        observation.lastChangedAt,
        input.workspaceTimeZone,
      );


    // ============================================
    // Resolve Stage Rule
    // ============================================

    const rule =
      findStageRule(
        input.candidate.stage,
        input.rules,
      );


    // ============================================
    // Domain evaluation
    // ============================================

    const evaluation =
      evaluateCandidate({
        candidate:
          input.candidate,

        rule,

        lastChangedDate,

        today,
      });


    return {
      observation,
      evaluation,
    };
  }
}