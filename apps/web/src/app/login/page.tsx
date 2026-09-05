import {
  GoogleLoginButton,
} from "./google-login-button";


export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="text-2xl font-semibold">
        HireWatch
      </h1>

      <p className="mt-2 text-sm text-zinc-600">
        採用候補者の停滞と次のアクションを見逃さない
      </p>

      <div className="mt-8">
        <GoogleLoginButton />
      </div>
    </main>
  );
}