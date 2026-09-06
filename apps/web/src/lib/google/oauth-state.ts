import "server-only";

import {
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import {
  decodeBase64UrlKey32,
  decryptSecret,
  encryptSecret,
} from "@hirewatch/crypto";


const STATE_AAD =
  "hirewatch:google-oauth-state:v1";


export const GOOGLE_OAUTH_COOKIE =
  "hirewatch_google_oauth";


type OAuthStatePayload = {
  v: 1;

  state: string;

  workspaceId: string;

  expiresAt: number;
};


function getStateKey():
  Uint8Array {

  const encoded =
    process.env
      .OAUTH_STATE_KEY_V1;


  if (!encoded) {
    throw new Error(
      "Missing OAUTH_STATE_KEY_V1",
    );
  }


  return decodeBase64UrlKey32(
    encoded,
  );
}


export function createOAuthState(
  workspaceId: string,
) {
  const state =
    randomBytes(32)
      .toString(
        "base64url",
      );


  const payload:
    OAuthStatePayload = {

    v: 1,

    state,

    workspaceId,

    expiresAt:
      Date.now() +
      10 * 60 * 1000,
  };


  const cookieValue =
    encryptSecret({
      plaintext:
        JSON.stringify(
          payload,
        ),

      key:
        getStateKey(),

      aad:
        STATE_AAD,
    });


  return {
    state,
    cookieValue,
  };
}


export function readOAuthState(
  encrypted:
    string,
): OAuthStatePayload {

  const plaintext =
    decryptSecret({
      encrypted,

      key:
        getStateKey(),

      aad:
        STATE_AAD,
    });


  const value =
    JSON.parse(
      plaintext,
    ) as Partial<
      OAuthStatePayload
    >;


  if (
    value.v !== 1 ||
    typeof value.state !==
      "string" ||
    typeof value.workspaceId !==
      "string" ||
    typeof value.expiresAt !==
      "number"
  ) {
    throw new Error(
      "Invalid OAuth state",
    );
  }


  if (
    Date.now() >
    value.expiresAt
  ) {
    throw new Error(
      "OAuth state expired",
    );
  }


  return value as
    OAuthStatePayload;
}


export function statesEqual(
  left: string,
  right: string,
): boolean {

  const leftBytes =
    Buffer.from(left);

  const rightBytes =
    Buffer.from(right);


  if (
    leftBytes.length !==
    rightBytes.length
  ) {
    return false;
  }


  return timingSafeEqual(
    leftBytes,
    rightBytes,
  );
}