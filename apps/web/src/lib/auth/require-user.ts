import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";


export async function requireUserId():
  Promise<string> {

  const supabase =
    await createClient();


  const {
    data,
    error,
  } =
    await supabase.auth.getClaims();


  const userId =
    data?.claims?.sub;


  if (
    error ||
    typeof userId !== "string" ||
    userId.length === 0
  ) {
    redirect(
      "/login",
    );
  }


  return userId;
}