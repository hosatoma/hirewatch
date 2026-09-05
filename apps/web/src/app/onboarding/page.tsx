import {
  requireUserId,
} from "@/lib/auth/require-user";

import {
  createWorkspace,
} from "./actions";


export default async function OnboardingPage() {
  await requireUserId();


  return (
    <main className="mx-auto max-w-lg p-6">

      <h1 className="text-2xl font-semibold">
        Workspaceを作成
      </h1>

      <p className="mt-2 text-sm text-zinc-600">
        会社名や採用チーム名を入力してください。
      </p>

      <form
        action={createWorkspace}
        className="mt-8 space-y-4"
      >

        <input
          name="name"
          required
          maxLength={100}
          placeholder="株式会社HireWatch"
          className="w-full rounded-md border px-3 py-2"
        />

        <button
          type="submit"
          className="rounded-md border px-4 py-2"
        >
          Workspaceを作成
        </button>

      </form>

    </main>
  );
}