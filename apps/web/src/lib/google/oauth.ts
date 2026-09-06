import "server-only";


export const GOOGLE_DRIVE_FILE_SCOPE =
  "https://www.googleapis.com/auth/drive.file";


function requireEnv(
  name: string,
): string {
  const value =
    process.env[name];

  if (!value) {
    throw new Error(
      `Missing server environment variable: ${name}`,
    );
  }

  return value;
}


export function getGoogleOAuthConfig() {
  return {
    clientId:
      requireEnv(
        "GOOGLE_SHEETS_OAUTH_CLIENT_ID",
      ),

    clientSecret:
      requireEnv(
        "GOOGLE_SHEETS_OAUTH_CLIENT_SECRET",
      ),

    redirectUri:
      requireEnv(
        "GOOGLE_SHEETS_OAUTH_REDIRECT_URI",
      ),
  };
}


export function createGoogleAuthorizationUrl(
  state: string,
): URL {
  const config =
    getGoogleOAuthConfig();


  const url =
    new URL(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );


  url.search =
    new URLSearchParams({
      client_id:
        config.clientId,

      redirect_uri:
        config.redirectUri,

      response_type:
        "code",

      scope:
        GOOGLE_DRIVE_FILE_SCOPE,

      access_type:
        "offline",

      include_granted_scopes:
        "true",

      prompt:
        "consent",

      state,
    }).toString();


  return url;
}


export type GoogleTokenResult = {
  refreshToken?:
    string;

  grantedScopes:
    string[];
};


export async function exchangeGoogleAuthorizationCode(
  code: string,
): Promise<GoogleTokenResult> {

  const config =
    getGoogleOAuthConfig();


  const response =
    await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method:
          "POST",

        headers: {
          "content-type":
            "application/x-www-form-urlencoded",
        },

        body:
          new URLSearchParams({
            code,

            client_id:
              config.clientId,

            client_secret:
              config.clientSecret,

            redirect_uri:
              config.redirectUri,

            grant_type:
              "authorization_code",
          }),

        cache:
          "no-store",
      },
    );


  if (!response.ok) {
    /*
     * bodyにはOAuth詳細が含まれる可能性があるので
     * そのままログへ出さない。
     */
    throw new Error(
      `Google token exchange failed: ${response.status}`,
    );
  }


  const body =
    await response.json() as {
      refresh_token?: unknown;
      scope?: unknown;
    };


  const refreshToken =
    typeof body.refresh_token ===
      "string"
      ? body.refresh_token
      : undefined;


  const grantedScopes =
    typeof body.scope === "string"
      ? body.scope
          .split(/\s+/)
          .filter(Boolean)
      : [];


  return {
    refreshToken,
    grantedScopes,
  };
}