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
} from "../client.js";

import {
  SupabaseCandidateStateRepository,
} from "./candidate-state-repository.js";


/**
 * pnpm --filter @hirewatch/db ...
 *
 * で実行した場合、
 * process.cwd() は packages/db。
 */
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


describe(
  "SupabaseCandidateStateRepository integration",
  () => {

    it(
      "first_seen -> unchanged -> changed を記録する",
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


        /*
         * テストごとに固有IDを使う。
         *
         * db resetを前提にしないため、
         * 複数回テストしても衝突しない。
         */
        const testId =
          randomUUID();

        const workspaceId =
          randomUUID();

        const sheetSourceId =
          randomUUID();


        let userId:
          string | undefined;


        try {

          // =============================================
          // 1. Test Auth User作成
          // =============================================

          const {
            data: userData,
            error: userError,
          } =
            await db.auth.admin.createUser({
              email:
                `candidate-state-${testId}@example.com`,

              email_confirm: true,
            });


          if (userError) {
            throw new Error(
              `Failed to create test user: ${userError.message}`,
            );
          }


          userId =
            userData.user.id;


          // =============================================
          // 2. Workspace作成
          // =============================================

          const {
            error: workspaceError,
          } =
            await db
              .from("workspaces")
              .insert({
                id:
                  workspaceId,

                name:
                  `Candidate State Test ${testId}`,

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


          // =============================================
          // 3. Workspace owner trigger確認
          // =============================================

          const {
            data: member,
            error: memberError,
          } =
            await db
              .from(
                "workspace_members",
              )
              .select(
                "role",
              )
              .eq(
                "workspace_id",
                workspaceId,
              )
              .eq(
                "user_id",
                userId,
              )
              .single();


          if (memberError) {
            throw new Error(
              `Failed to load workspace member: ${memberError.message}`,
            );
          }


          expect(
            member.role,
          ).toBe(
            "owner",
          );


          // =============================================
          // 4. Sheet Source作成
          // =============================================

          const {
            error: sheetError,
          } =
            await db
              .from(
                "sheet_sources",
              )
              .insert({
                id:
                  sheetSourceId,

                workspace_id:
                  workspaceId,

                spreadsheet_id:
                  `test-spreadsheet-${testId}`,

                spreadsheet_title:
                  "Integration Test Spreadsheet",

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


          // =============================================
          // Test fixtures
          //
          // Crypto自体は@hirewatch/cryptoで別途テスト済み。
          // Repository統合テストでは有効なSHA-256形式を
          // 固定fixtureとして使用する。
          // =============================================

          const candidateHmac =
            "a".repeat(64);

          const fingerprintV1 =
            "b".repeat(64);

          const fingerprintV2 =
            "c".repeat(64);


          const observedAt1 =
            "2026-09-05T00:00:00.000Z";

          const observedAt2 =
            "2026-09-06T00:00:00.000Z";

          const observedAt3 =
            "2026-09-07T00:00:00.000Z";


          // =============================================
          // 5. First observation
          // =============================================

          const first =
            await repository.observe({
              sheetSourceId,

              candidateHmac,

              fingerprint:
                fingerprintV1,

              observedAt:
                observedAt1,
            });


          expect(
            first.status,
          ).toBe(
            "first_seen",
          );


          expect(
            toIso(
              first.firstSeenAt,
            ),
          ).toBe(
            observedAt1,
          );


          expect(
            toIso(
              first.lastSeenAt,
            ),
          ).toBe(
            observedAt1,
          );


          expect(
            toIso(
              first.lastChangedAt,
            ),
          ).toBe(
            observedAt1,
          );


          // =============================================
          // DB確認: first_seen
          // =============================================

          {
            const {
              data: state,
              error: stateError,
            } =
              await db
                .from(
                  "candidate_states",
                )
                .select(
                  `
                    fingerprint,
                    first_seen_at,
                    last_seen_at,
                    last_changed_at
                  `,
                )
                .eq(
                  "sheet_source_id",
                  sheetSourceId,
                )
                .eq(
                  "candidate_hmac",
                  candidateHmac,
                )
                .single();


            if (stateError) {
              throw new Error(
                `Failed to load candidate state: ${stateError.message}`,
              );
            }


            expect(
              state.fingerprint.trim(),
            ).toBe(
              fingerprintV1,
            );


            expect(
              toIso(
                state.first_seen_at,
              ),
            ).toBe(
              observedAt1,
            );


            expect(
              toIso(
                state.last_seen_at,
              ),
            ).toBe(
              observedAt1,
            );


            expect(
              toIso(
                state.last_changed_at,
              ),
            ).toBe(
              observedAt1,
            );
          }


          // =============================================
          // 6. Same fingerprint
          //
          // unchangedになる。
          //
          // first_seen_at     維持
          // last_seen_at      更新
          // last_changed_at   維持
          // =============================================

          const unchanged =
            await repository.observe({
              sheetSourceId,

              candidateHmac,

              fingerprint:
                fingerprintV1,

              observedAt:
                observedAt2,
            });


          expect(
            unchanged.status,
          ).toBe(
            "unchanged",
          );


          expect(
            toIso(
              unchanged.firstSeenAt,
            ),
          ).toBe(
            observedAt1,
          );


          expect(
            toIso(
              unchanged.lastSeenAt,
            ),
          ).toBe(
            observedAt2,
          );


          expect(
            toIso(
              unchanged.lastChangedAt,
            ),
          ).toBe(
            observedAt1,
          );


          // =============================================
          // DB確認: unchanged
          // =============================================

          {
            const {
              data: state,
              error: stateError,
            } =
              await db
                .from(
                  "candidate_states",
                )
                .select(
                  `
                    fingerprint,
                    first_seen_at,
                    last_seen_at,
                    last_changed_at
                  `,
                )
                .eq(
                  "sheet_source_id",
                  sheetSourceId,
                )
                .eq(
                  "candidate_hmac",
                  candidateHmac,
                )
                .single();


            if (stateError) {
              throw new Error(
                `Failed to load candidate state: ${stateError.message}`,
              );
            }


            expect(
              state.fingerprint.trim(),
            ).toBe(
              fingerprintV1,
            );


            expect(
              toIso(
                state.first_seen_at,
              ),
            ).toBe(
              observedAt1,
            );


            expect(
              toIso(
                state.last_seen_at,
              ),
            ).toBe(
              observedAt2,
            );


            expect(
              toIso(
                state.last_changed_at,
              ),
            ).toBe(
              observedAt1,
            );
          }


          // =============================================
          // 7. Different fingerprint
          //
          // changedになる。
          //
          // first_seen_at     維持
          // last_seen_at      更新
          // last_changed_at   更新
          // =============================================

          const changed =
            await repository.observe({
              sheetSourceId,

              candidateHmac,

              fingerprint:
                fingerprintV2,

              observedAt:
                observedAt3,
            });


          expect(
            changed.status,
          ).toBe(
            "changed",
          );


          expect(
            toIso(
              changed.firstSeenAt,
            ),
          ).toBe(
            observedAt1,
          );


          expect(
            toIso(
              changed.lastSeenAt,
            ),
          ).toBe(
            observedAt3,
          );


          expect(
            toIso(
              changed.lastChangedAt,
            ),
          ).toBe(
            observedAt3,
          );


          // =============================================
          // DB最終確認
          // =============================================

          const {
            data: finalState,
            error: finalStateError,
          } =
            await db
              .from(
                "candidate_states",
              )
              .select(
                `
                  fingerprint,
                  first_seen_at,
                  last_seen_at,
                  last_changed_at
                `,
              )
              .eq(
                "sheet_source_id",
                sheetSourceId,
              )
              .eq(
                "candidate_hmac",
                candidateHmac,
              )
              .single();


          if (finalStateError) {
            throw new Error(
              `Failed to load final candidate state: ${finalStateError.message}`,
            );
          }


          expect(
            finalState.fingerprint.trim(),
          ).toBe(
            fingerprintV2,
          );


          expect(
            toIso(
              finalState.first_seen_at,
            ),
          ).toBe(
            observedAt1,
          );


          expect(
            toIso(
              finalState.last_seen_at,
            ),
          ).toBe(
            observedAt3,
          );


          expect(
            toIso(
              finalState.last_changed_at,
            ),
          ).toBe(
            observedAt3,
          );


        } finally {

          // =============================================
          // Cleanup
          //
          // auth.usersはworkspaces.created_byから
          // 参照されているので、
          //
          // Workspace
          // ↓
          // Auth User
          //
          // の順番で削除する。
          // =============================================

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