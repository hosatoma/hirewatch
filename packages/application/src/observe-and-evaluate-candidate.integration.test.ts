import {
  randomUUID,
} from "node:crypto";

import {
  resolve,
} from "node:path";

import {
  config as loadEnv,
} from "dotenv";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createServiceRoleDatabaseClient,
  SupabaseCandidateStateRepository,
} from "@hirewatch/db";

import type {
  CandidateSnapshot,
  StageRule,
} from "@hirewatch/core";

import {
  CandidateObservationService,
} from "./observe-and-evaluate-candidate.js";


loadEnv({
  path: resolve(
    process.cwd(),
    "../../.env.test.local",
  ),
  quiet: true,
});


function requireEnv(
  name: string,
): string {
  const value =
    process.env[name];

  if (!value) {
    throw new Error(
      `Missing environment variable: ${name}`,
    );
  }

  return value;
}


function toIso(
  value: string,
): string {
  return new Date(
    value,
  ).toISOString();
}


const TEST_HMAC_KEY =
  new Uint8Array(32)
    .fill(0x55);


describe(
  "CandidateObservationService integration",
  () => {

    it(
      "first_seen/ok -> unchanged/stale -> changed/ok",
      async () => {

        const db =
          createServiceRoleDatabaseClient({
            url:
              requireEnv(
                "SUPABASE_URL",
              ),

            serviceRoleKey:
              requireEnv(
                "SUPABASE_SERVICE_ROLE_KEY",
              ),
          });


        const repository =
          new SupabaseCandidateStateRepository(
            db,
          );


        const service =
          new CandidateObservationService({
            repository,

            candidateHmacKey:
              TEST_HMAC_KEY,
          });


        const testId =
          randomUUID();

        const workspaceId =
          randomUUID();

        const sheetSourceId =
          randomUUID();

        let userId:
          string | undefined;


        try {

          // =========================================
          // Test User
          // =========================================

          const {
            data: userData,
            error: userError,
          } =
            await db.auth.admin.createUser({
              email:
                `application-${testId}@example.com`,

              email_confirm: true,
            });


          if (userError) {
            throw new Error(
              `Failed to create test user: ${userError.message}`,
            );
          }


          userId =
            userData.user.id;


          // =========================================
          // Workspace
          // =========================================

          const {
            error: workspaceError,
          } =
            await db
              .from("workspaces")
              .insert({
                id:
                  workspaceId,

                name:
                  `Application Test ${testId}`,

                created_by:
                  userId,

                timezone:
                  "Asia/Tokyo",

                notification_enabled:
                  false,
              });


          if (workspaceError) {
            throw new Error(
              `Failed to create workspace: ${workspaceError.message}`,
            );
          }


          // =========================================
          // Sheet Source
          // =========================================

          const {
            error: sheetError,
          } =
            await db
              .from("sheet_sources")
              .insert({
                id:
                  sheetSourceId,

                workspace_id:
                  workspaceId,

                spreadsheet_id:
                  `test-sheet-${testId}`,

                spreadsheet_title:
                  "Application Test",

                sheet_id:
                  1,

                sheet_title:
                  "Candidates",

                header_row:
                  1,

                column_mapping:
                  {},

                spreadsheet_timezone:
                  "Asia/Tokyo",

                status:
                  "active",
              });


          if (sheetError) {
            throw new Error(
              `Failed to create sheet source: ${sheetError.message}`,
            );
          }


          // =========================================
          // Rules
          // =========================================

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

              {
                stage:
                  "二次面接",

                waitingOn:
                  "candidate",

                slaBusinessDays:
                  2,

                enabled:
                  true,
              },
            ];


          const firstCandidate:
            CandidateSnapshot = {

            candidateKey:
              `candidate-${testId}`,

            candidateName:
              "Test Candidate",

            stage:
              "一次面接済",

            sourceRow:
              2,
          };


          // =========================================
          // 1st
          //
          // JST:
          // 2026-09-07 09:00 Monday
          //
          // 初回なのでlastChangedDate = today
          // elapsed = 0
          //
          // first_seen + ok
          // =========================================

          const first =
            await service.observeAndEvaluate({

              workspaceId,

              workspaceTimeZone:
                "Asia/Tokyo",

              sheetSourceId,

              candidate:
                firstCandidate,

              rules,

              observedAt:
                "2026-09-07T00:00:00.000Z",
            });


          expect(
            first.observation.status,
          ).toBe(
            "first_seen",
          );


          expect(
            first.evaluation.status,
          ).toBe(
            "ok",
          );


          expect(
            first.evaluation
              .elapsedBusinessDays,
          ).toBe(
            0,
          );


          expect(
            first.evaluation.waitingOn,
          ).toBe(
            "interviewer",
          );


          // =========================================
          // 2nd
          //
          // JST:
          // 2026-09-09 09:00 Wednesday
          //
          // Candidate状態は同じ。
          //
          // Monday -> Wednesday
          //
          // Tuesday   = 1
          // Wednesday = 2
          //
          // SLA = 1
          //
          // unchanged + stale
          // =========================================

          const second =
            await service.observeAndEvaluate({

              workspaceId,

              workspaceTimeZone:
                "Asia/Tokyo",

              sheetSourceId,

              candidate:
                firstCandidate,

              rules,

              observedAt:
                "2026-09-09T00:00:00.000Z",
            });


          expect(
            second.observation.status,
          ).toBe(
            "unchanged",
          );


          expect(
            second.evaluation.status,
          ).toBe(
            "stale",
          );


          expect(
            second.evaluation
              .elapsedBusinessDays,
          ).toBe(
            2,
          );


          expect(
            second.evaluation.reason,
          ).toBe(
            "sla_exceeded",
          );


          /*
           * unchangedなので、
           * lastChangedAtは初回観測のまま。
           */
          expect(
            toIso(
              second.observation
                .lastChangedAt,
            ),
          ).toBe(
            "2026-09-07T00:00:00.000Z",
          );


          // =========================================
          // 3rd
          //
          // Stage変更
          //
          // 一次面接済
          // ↓
          // 二次面接
          //
          // fingerprint変更
          // ↓
          // lastChangedAt reset
          //
          // changed + ok
          // =========================================

          const changedCandidate:
            CandidateSnapshot = {

            ...firstCandidate,

            stage:
              "二次面接",
          };


          const third =
            await service.observeAndEvaluate({

              workspaceId,

              workspaceTimeZone:
                "Asia/Tokyo",

              sheetSourceId,

              candidate:
                changedCandidate,

              rules,

              /*
               * JST:
               * 2026-09-09 10:00
               */
              observedAt:
                "2026-09-09T01:00:00.000Z",
            });


          expect(
            third.observation.status,
          ).toBe(
            "changed",
          );


          expect(
            third.evaluation.status,
          ).toBe(
            "ok",
          );


          expect(
            third.evaluation
              .elapsedBusinessDays,
          ).toBe(
            0,
          );


          expect(
            third.evaluation.waitingOn,
          ).toBe(
            "candidate",
          );


          expect(
            toIso(
              third.observation
                .lastChangedAt,
            ),
          ).toBe(
            "2026-09-09T01:00:00.000Z",
          );


          // =========================================
          // DB最終確認
          // =========================================

          const {
            data: states,
            error: stateError,
          } =
            await db
              .from(
                "candidate_states",
              )
              .select(
                `
                  candidate_hmac,
                  fingerprint,
                  first_seen_at,
                  last_seen_at,
                  last_changed_at
                `,
              )
              .eq(
                "sheet_source_id",
                sheetSourceId,
              );


          if (stateError) {
            throw new Error(
              `Failed to load candidate states: ${stateError.message}`,
            );
          }


          /*
           * Candidate Keyは同一なので、
           * Stageが変わってもDB Rowは1行のまま。
           */
          expect(
            states,
          ).toHaveLength(
            1,
          );


          const state =
            states[0];


          if (!state) {
            throw new Error(
              "Candidate state not found",
            );
          }


          expect(
            toIso(
              state.first_seen_at,
            ),
          ).toBe(
            "2026-09-07T00:00:00.000Z",
          );


          expect(
            toIso(
              state.last_seen_at,
            ),
          ).toBe(
            "2026-09-09T01:00:00.000Z",
          );


          expect(
            toIso(
              state.last_changed_at,
            ),
          ).toBe(
            "2026-09-09T01:00:00.000Z",
          );

        } finally {

          // =========================================
          // Cleanup
          // =========================================

          await db
            .from(
              "workspaces",
            )
            .delete()
            .eq(
              "id",
              workspaceId,
            );


          if (userId) {
            await db.auth.admin.deleteUser(
              userId,
            );
          }
        }
      },

      20_000,
    );
  },
);