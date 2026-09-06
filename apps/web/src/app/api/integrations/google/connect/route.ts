import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireWorkspaceAdmin,
} from "@/lib/auth/require-workspace-admin";

import {
  createGoogleAuthorizationUrl,
} from "@/lib/google/oauth";

import {
  createOAuthState,
  GOOGLE_OAUTH_COOKIE,
} from "@/lib/google/oauth-state";


export const runtime =
  "nodejs";


export async function GET(
  request: NextRequest,
) {

  const workspaceId =
    request.nextUrl
      .searchParams
      .get(
        "workspaceId",
      );


  if (!workspaceId) {
    return NextResponse.json(
      {
        error:
          "workspaceId is required",
      },
      {
        status: 400,
      },
    );
  }


  try {
    await requireWorkspaceAdmin(
      workspaceId,
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Forbidden",
      },
      {
        status: 403,
      },
    );
  }


  const {
    state,
    cookieValue,
  } =
    createOAuthState(
      workspaceId,
    );


  const authorizationUrl =
    createGoogleAuthorizationUrl(
      state,
    );


  const response =
    NextResponse.redirect(
      authorizationUrl,
    );


  response.cookies.set(
    GOOGLE_OAUTH_COOKIE,
    cookieValue,
    {
      httpOnly: true,

      sameSite:
        "lax",

      secure:
        process.env.NODE_ENV ===
        "production",

      maxAge:
        10 * 60,

      path:
        "/api/integrations/google",
    },
  );


  return response;
}