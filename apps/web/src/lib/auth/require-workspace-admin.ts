import {
  createClient,
} from "@/lib/supabase/server";

import {
  requireUserId,
} from "./require-user";


export async function requireWorkspaceAdmin(
  workspaceId: string,
) {
  const userId =
    await requireUserId();


  const supabase =
    await createClient();


  const {
    data,
    error,
  } =
    await supabase
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
      .maybeSingle();


  if (error) {
    throw new Error(
      "Failed to verify workspace membership",
    );
  }


  if (
    !data ||
    (
      data.role !== "owner" &&
      data.role !== "admin"
    )
  ) {
    throw new Error(
      "Workspace admin access required",
    );
  }


  return {
    userId,
    role:
      data.role,
  };
}