import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  CandidateSnapshot,
  StageRule,
} from "@hirewatch/core";

import type {
  CandidateStateRepositoryPort,
  ObserveCandidateStatePortInput,
} from "./candidate-state-port.js";

import {
  CandidateObservationService,
} from "./observe-and-evaluate-candidate.js";


const TEST_HMAC_KEY =
  new Uint8Array(32)
    .fill(0x55);


describe(
  "CandidateObservationService",
  () => {

    it(
      "RepositoryのlastChangedAtをWorkspace timezoneへ変換してSLA判定する",
      async () => {

        const observedInputs:
          ObserveCandidateStatePortInput[] =
            [];


        const repository:
          CandidateStateRepositoryPort = {

          async observe(input) {

            observedInputs.push(
              input,
            );

            return {
              status:
                "unchanged",

              firstSeenAt:
                "2026-09-02T15:30:00.000Z",

              lastSeenAt:
                input.observedAt,

              /*
               * JST:
               *
               * 2026-09-02 15:30 UTC
               * =
               * 2026-09-03 00:30 JST
               *
               * Thursday
               */
              lastChangedAt:
                "2026-09-02T15:30:00.000Z",
            };
          },
        };


        const service =
          new CandidateObservationService({
            repository,

            candidateHmacKey:
              TEST_HMAC_KEY,
          });


        const candidate:
          CandidateSnapshot = {

          candidateKey:
            "candidate-001",

          candidateName:
            "Test Candidate",

          stage:
            "一次面接済",

          sourceRow:
            2,
        };


        const rules:
          readonly StageRule[] = [
            {
              stage:
                "一次面接済",

              waitingOn:
                "interviewer",

              slaBusinessDays:
                1,

              enabled:
                true,
            },
          ];


        const result =
          await service.observeAndEvaluate({
            workspaceId:
              "workspace-001",

            workspaceTimeZone:
              "Asia/Tokyo",

            sheetSourceId:
              "sheet-source-001",

            candidate,

            rules,

            /*
             * UTC:
             * 2026-09-06 15:30
             *
             * JST:
             * 2026-09-07 00:30
             *
             * Monday
             */
            observedAt:
              "2026-09-06T15:30:00.000Z",
          });


        /*
         * Thursday -> Monday
         *
         * Friday = 1
         * Monday = 2
         *
         * SLA=1なのでSTALE。
         */
        expect(
          result.evaluation
            .elapsedBusinessDays,
        ).toBe(
          2,
        );


        expect(
          result.evaluation.status,
        ).toBe(
          "stale",
        );


        expect(
          result.evaluation.waitingOn,
        ).toBe(
          "interviewer",
        );


        expect(
          result.evaluation.reason,
        ).toBe(
          "sla_exceeded",
        );


        expect(
          observedInputs,
        ).toHaveLength(
          1,
        );


        const repositoryInput =
          observedInputs[0];


        expect(
          repositoryInput,
        ).toBeDefined();


        if (!repositoryInput) {
          throw new Error(
            "Repository was not called",
          );
        }


        expect(
          repositoryInput.observedAt,
        ).toBe(
          "2026-09-06T15:30:00.000Z",
        );


        expect(
          repositoryInput
            .candidateHmac,
        ).toMatch(
          /^[0-9a-f]{64}$/,
        );


        expect(
          repositoryInput
            .fingerprint,
        ).toMatch(
          /^[0-9a-f]{64}$/,
        );
      },
    );


    it(
      "初回観測ならelapsedBusinessDaysは0",
      async () => {

        const observedAt =
          "2026-09-06T15:30:00.000Z";


        const repository:
          CandidateStateRepositoryPort = {

          async observe() {
            return {
              status:
                "first_seen",

              firstSeenAt:
                observedAt,

              lastSeenAt:
                observedAt,

              lastChangedAt:
                observedAt,
            };
          },
        };


        const service =
          new CandidateObservationService({
            repository,

            candidateHmacKey:
              TEST_HMAC_KEY,
          });


        const result =
          await service.observeAndEvaluate({

            workspaceId:
              "workspace-001",

            workspaceTimeZone:
              "Asia/Tokyo",

            sheetSourceId:
              "sheet-source-001",

            candidate: {
              candidateKey:
                "candidate-001",

              stage:
                "一次面接済",

              sourceRow:
                2,
            },

            rules: [
              {
                stage:
                  "一次面接済",

                waitingOn:
                  "interviewer",

                slaBusinessDays:
                  1,

                enabled:
                  true,
              },
            ],

            observedAt,
          });


        expect(
          result.observation.status,
        ).toBe(
          "first_seen",
        );


        expect(
          result.evaluation
            .elapsedBusinessDays,
        ).toBe(
          0,
        );


        expect(
          result.evaluation.status,
        ).toBe(
          "ok",
        );
      },
    );
  },
);