import {
  notFound,
} from "next/navigation";

import {
  requireUserId,
} from "@/lib/auth/require-user";

import {
  createClient,
} from "@/lib/supabase/server";


type Props = {
  params:
    Promise<{
      workspaceId: string;
    }>;
};


export default async function WorkspacePage({
  params,
}: Props) {

  await requireUserId();


  const {
    workspaceId,
  } =
    await params;


  const supabase =
    await createClient();


  const {
    data: workspace,
    error,
  } =
    await supabase
      .from(
        "workspaces",
      )
      .select(
        "id, name, timezone",
      )
      .eq(
        "id",
        workspaceId,
      )
      .maybeSingle();


  if (
    error ||
    !workspace
  ) {
    notFound();
  }


  return (
    <main className="mx-auto max-w-5xl p-6">

      <h1 className="text-2xl font-semibold">
        {workspace.name}
      </h1>

      <p className="mt-2 text-sm text-zinc-600">
        HireWatch Dashboard
      </p>

      <form
        action="/auth/signout"
        method="post"
        className="mt-8"
      >
        <button
          type="submit"
          className="rounded-md border px-4 py-2"
        >
          ログアウト
        </button>
      </form>

    </main>
  );
}