import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  decodeBase64UrlKey32,
  encryptSecret,
} from "@hirewatch/crypto";

import {
  requireWorkspaceAdmin,
} from "@/lib/auth/require-workspace-admin";

import {
  exchangeGoogleAuthorizationCode,
} from "@/lib/google/oauth";

import {
  GOOGLE_OAUTH_COOKIE,
  readOAuthState,
  statesEqual,
} from "@/lib/google/oauth-state";

import {
  createServiceRoleClient,
} from "@/lib/supabase/service-role";


export const runtime =
  "nodejs";


function getTokenEncryptionKey():
  Uint8Array {

  const encoded =
    process.env
      .TOKEN_ENCRYPTION_KEY_V1;


  if (!encoded) {
    throw new Error(
      "Missing TOKEN_ENCRYPTION_KEY_V1",
    );
  }


  return decodeBase64UrlKey32(
    encoded,
  );
}


function redirectToWorkspace(
  request: NextRequest,

  workspaceId: string,

  status: string,
): NextResponse {

  const url =
    new URL(
      `/w/${workspaceId}`,
      request.url,
    );


  url.searchParams.set(
    "google",
    status,
  );


  const response =
    NextResponse.redirect(
      url,
    );


  /*
   * Cookie作成時と同じpathで削除する。
   */
  response.cookies.set(
    GOOGLE_OAUTH_COOKIE,
    "",
    {
      httpOnly: true,

      sameSite:
        "lax",

      secure:
        process.env.NODE_ENV ===
        "production",

      maxAge: 0,

      path:
        "/api/integrations/google",
    },
  );


  return response;
}


export async function GET(
  request: NextRequest,
) {

  const state =
    request.nextUrl
      .searchParams
      .get(
        "state",
      );


  const encryptedState =
    request.cookies
      .get(
        GOOGLE_OAUTH_COOKIE,
      )
      ?.value;


  if (
    !state ||
    !encryptedState
  ) {
    return NextResponse.redirect(
      new URL(
        "/app?google=state_error",
        request.url,
      ),
    );
  }


  let savedState;

  try {
    savedState =
      readOAuthState(
        encryptedState,
      );
  } catch {
    return NextResponse.redirect(
      new URL(
        "/app?google=state_error",
        request.url,
      ),
    );
  }


  if (
    !statesEqual(
      state,
      savedState.state,
    )
  ) {
    return redirectToWorkspace(
      request,
      savedState.workspaceId,
      "state_error",
    );
  }


  const workspaceId =
    savedState.workspaceId;


  /*
   * Callbackでも再度権限確認。
   */
  try {
    await requireWorkspaceAdmin(
      workspaceId,
    );
  } catch {
    return redirectToWorkspace(
      request,
      workspaceId,
      "forbidden",
    );
  }


  /*
   * ユーザーがGoogle同意画面で
   * キャンセルした場合。
   */
  const oauthError =
    request.nextUrl
      .searchParams
      .get(
        "error",
      );


  if (oauthError) {
    return redirectToWorkspace(
      request,
      workspaceId,
      "cancelled",
    );
  }


  const code =
    request.nextUrl
      .searchParams
      .get(
        "code",
      );


  if (!code) {
    return redirectToWorkspace(
      request,
      workspaceId,
      "callback_error",
    );
  }


  let tokens;

  try {
    tokens =
      await exchangeGoogleAuthorizationCode(
        code,
      );
  } catch {
    return redirectToWorkspace(
      request,
      workspaceId,
      "token_error",
    );
  }


  const db =
    createServiceRoleClient();


  /*
   * Googleがrefresh_tokenを返さない場合に、
   * 既存tokenを消さないため事前取得する。
   */
  const {
    data: existing,
    error: existingError,
  } =
    await db
      .from(
        "google_connections",
      )
      .select(
        `
          refresh_token_encrypted,
          granted_scopes
        `,
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .maybeSingle();


  if (existingError) {
    return redirectToWorkspace(
      request,
      workspaceId,
      "database_error",
    );
  }


  let refreshTokenEncrypted =
    existing
      ?.refresh_token_encrypted;


  if (
    tokens.refreshToken
  ) {
    refreshTokenEncrypted =
      encryptSecret({
        plaintext:
          tokens.refreshToken,

        key:
          getTokenEncryptionKey(),

        aad:
          `hirewatch:${workspaceId}:google-refresh-token:v1`,
      });
  }


  /*
   * 初回接続なのにrefresh_tokenが取得できなかった。
   */
  if (
    !refreshTokenEncrypted
  ) {
    return redirectToWorkspace(
      request,
      workspaceId,
      "missing_refresh_token",
    );
  }


  const grantedScopes =
    tokens.grantedScopes.length > 0
      ? tokens.grantedScopes
      : (
          existing
            ?.granted_scopes ??
          []
        );


  const now =
    new Date()
      .toISOString();


  const {
    error: upsertError,
  } =
    await db
      .from(
        "google_connections",
      )
      .upsert(
        {
          workspace_id:
            workspaceId,

          refresh_token_encrypted:
            refreshTokenEncrypted,

          granted_scopes:
            grantedScopes,

          status:
            "connected",

          connected_at:
            now,

          last_error_code:
            null,
        },
        {
          onConflict:
            "workspace_id",
        },
      );


  if (upsertError) {
    return redirectToWorkspace(
      request,
      workspaceId,
      "database_error",
    );
  }


  return redirectToWorkspace(
    request,
    workspaceId,
    "connected",
  );
}