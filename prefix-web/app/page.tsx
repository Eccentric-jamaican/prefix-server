"use client";

import { useCallback, useState } from "react";
import { authClient } from "@/lib/auth-client";

type AuthMode = "signIn" | "signUp";

export default function Home() {
  const session = authClient.useSession();
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const resetStatus = () => setStatus(null);

  const runAuthAction = useCallback(
    async (action: () => Promise<unknown>, successMessage: string) => {
      setStatus("Working…");
      try {
        await action();
        setStatus(successMessage);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unexpected error";
        setStatus(`Error: ${message}`);
      }
    },
    []
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!email || !password) {
        setStatus("Email and password are required.");
        return;
      }

      if (mode === "signUp") {
        if (!name.trim()) {
          setStatus("Name is required to create an account.");
          return;
        }

        await runAuthAction(
          () =>
            authClient.signUp.email({
              email,
              password,
              name: name.trim(),
            }),
          "Signed up successfully. Check your session above."
        );
      } else {
        await runAuthAction(
          () => authClient.signIn.email({ email, password }),
          "Signed in successfully."
        );
      }
    },
    [email, mode, name, password, runAuthAction]
  );

  const handleSignOut = useCallback(async () => {
    await runAuthAction(() => authClient.signOut(), "Signed out.");
  }, [runAuthAction]);

  const currentUser = session.data?.user;
  const isLoading = session.isPending;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="flex w-full max-w-xl flex-col gap-8 rounded-2xl bg-white p-8 shadow-xl dark:bg-zinc-900">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            BetterAuth + Convex playground
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Sign up or sign in with email and password to verify that BetterAuth
            is wired into Convex. Once authenticated, your Convex client will
            automatically receive a session token.
          </p>
        </header>

        <section className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-800/50">
          {isLoading ? (
            <p className="text-zinc-600 dark:text-zinc-300">Loading session…</p>
          ) : currentUser ? (
            <div className="flex flex-col gap-2 text-zinc-700 dark:text-zinc-300">
              <p>
                <span className="font-medium">Signed in as:</span> {" "}
                {currentUser.email ?? currentUser.id}
              </p>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-fit rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Sign out
              </button>
            </div>
          ) : (
            <p className="text-zinc-600 dark:text-zinc-300">
              Not signed in.
            </p>
          )}
        </section>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("signIn");
                resetStatus();
              }}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition ${
                mode === "signIn"
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signUp");
                resetStatus();
              }}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition ${
                mode === "signUp"
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              Sign up
            </button>
          </div>

          {mode === "signUp" && (
            <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-200">
              Name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-100 dark:focus:ring-zinc-700"
                placeholder="Your name"
                autoComplete="name"
                required
              />
            </label>
          )}

          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-200">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-100 dark:focus:ring-zinc-700"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-200">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-100 dark:focus:ring-zinc-700"
              placeholder="••••••••"
              autoComplete={mode === "signUp" ? "new-password" : "current-password"}
              required
            />
          </label>

          <button
            type="submit"
            disabled={session.isPending}
            className="mt-2 w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {mode === "signUp" ? "Create account" : "Sign in"}
          </button>
        </form>

        {status && (
          <div className="rounded-md border border-zinc-200 bg-zinc-100 px-4 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
