import {
  redirect,
} from "next/navigation";

import {
  requireUserId,
} from "@/lib/auth/require-user"

import {
  createClient,
} from "@/lib/supabase/server";


export default async function AppPage() {
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
        "workspace_id",
      )
      .limit(1)
      .maybeSingle();


  if (error) {
    throw new Error(
      "Failed to load workspace membership",
    );
  }


  if (!data) {
    redirect(
      "/onboarding",
    );
  }


  redirect(
    `/w/${data.workspace_id}`,
  );
}