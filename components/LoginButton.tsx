"use client";

import { authClient } from "@/lib/auth-client";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export function LoginButton() {
  const { data: session, isPending } = authClient.useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await authClient.signIn.email({
      email,
      password,
    }, {
      onError: (ctx) => {
        alert(ctx.error.message || "Login failed");
      }
    });
    setIsOpen(false);
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await authClient.signUp.email({
      email,
      password,
      name: "User",
    }, {
      onError: (ctx) => {
        alert(ctx.error.message || "Sign up failed");
      }
    });
    setIsOpen(false);
    setLoading(false);
  };

  if (isPending) return <Loader2 className="animate-spin h-5 w-5" />;

  if (session) {
    return (
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <span className="hidden max-w-40 truncate text-sm text-zinc-600 dark:text-zinc-400 sm:inline">
          {session.user.email}
        </span>
        <button
          onClick={() => authClient.signOut()}
          className="shrink-0 rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900 sm:px-4"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900 sm:px-4"
      >
        Sign in
      </button>

      {isOpen && (
        <form
          className="absolute right-0 top-full z-50 mt-2 flex w-72 flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-800 dark:bg-zinc-950 sm:w-80"
          onSubmit={handleLogin}
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-w-0 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-w-0 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            required
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-zinc-900 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Login
            </button>
            <button
              type="button"
              onClick={handleSignUp}
              disabled={loading}
              className="flex-1 rounded-lg border border-zinc-200 py-2 text-sm disabled:opacity-50 dark:border-zinc-800"
            >
              Sign Up
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
