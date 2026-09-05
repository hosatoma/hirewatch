"use server";

import {
  randomUUID,
} from "node:crypto";

import {
  redirect,
} from "next/navigation";

import {
  requireUserId,
} from "@/lib/auth/require-user";

import {
  createClient,
} from "@/lib/supabase/server";


export async function createWorkspace(
  formData: FormData,
) {
  const userId =
    await requireUserId();


  const rawName =
    formData.get(
      "name",
    );


  if (
    typeof rawName !== "string"
  ) {
    throw new Error(
      "Workspace name is required",
    );
  }


  const name =
    rawName.trim();


  if (
    name.length < 1 ||
    name.length > 100
  ) {
    throw new Error(
      "Workspace name must be between 1 and 100 characters",
    );
  }


  const workspaceId =
    randomUUID();


  const supabase =
    await createClient();


  const {
    error,
  } =
    await supabase
      .from(
        "workspaces",
      )
      .insert({
        id:
          workspaceId,

        name,

        created_by:
          userId,

        timezone:
          "Asia/Tokyo",

        notification_enabled:
          false,
      });


  if (error) {
    throw new Error(
      "Failed to create workspace",
    );
  }


  /*
   * DB trigger:
   *
   * private.add_workspace_owner()
   *
   * によりworkspace_membersへ
   * ownerが自動作成される。
   */

  redirect(
    `/w/${workspaceId}`,
  );
}