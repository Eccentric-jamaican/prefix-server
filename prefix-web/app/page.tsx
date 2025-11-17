"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Id } from "convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";
import {
  POLAR_PLAN_DEFINITIONS,
  type PaidPlanKey,
} from "@/lib/polarPlans";

type AuthSignupPayload = Parameters<typeof authClient.signUp.email>[0];

type PolarSignupData = {
  planKey: PaidPlanKey;
  polarPlanId: string;
  polarProductId: string;
  polarBenefitId: string;
  polarCreditsPerCycle: number;
};

function buildPolarSignupData(planKey: PaidPlanKey): PolarSignupData {
  const plan = POLAR_PLAN_DEFINITIONS[planKey];
  return {
    planKey,
    polarPlanId: plan.planId,
    polarProductId: plan.productId,
    polarBenefitId: plan.benefitId,
    polarCreditsPerCycle: plan.creditsPerCycle,
  };
}

type CheckoutSessionResponse = {
  checkoutId: string;
  url: string;
};

function isAccountId(value: unknown): value is Id<"accounts"> {
  return typeof value === "string" && value.length > 0;
}

function hasAccountIdField(value: unknown): value is { accountId: Id<"accounts"> } {
  return (
    typeof value === "object" &&
    value !== null &&
    "accountId" in value &&
    isAccountId((value as { accountId?: unknown }).accountId)
  );
}

function isCheckoutSessionPayload(value: unknown): value is CheckoutSessionResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { url?: unknown }).url === "string" &&
    typeof (value as { checkoutId?: unknown }).checkoutId === "string"
  );
}

type AuthMode = "signIn" | "signUp";

type PlanOption = {
  key: PaidPlanKey;
  name: string;
  description: string;
  priceLabel: string;
  creditsPerCycle: number;
};

const PLAN_OPTIONS: PlanOption[] = [
  {
    key: "starter",
    name: "Starter",
    description: "For teams starting to ship secure email flows.",
    priceLabel: "${49}/mo",
    creditsPerCycle: POLAR_PLAN_DEFINITIONS.starter.creditsPerCycle,
  },
  {
    key: "growth",
    name: "Growth",
    description: "Scaling email and workflow throughput with confidence.",
    priceLabel: "${199}/mo",
    creditsPerCycle: POLAR_PLAN_DEFINITIONS.growth.creditsPerCycle,
  },
  {
    key: "scale",
    name: "Scale",
    description: "Serious volume plus dedicated support and SLAs.",
    priceLabel: "${499}/mo",
    creditsPerCycle: POLAR_PLAN_DEFINITIONS.scale.creditsPerCycle,
  },
];

const POLAR_CHECKOUT_HOSTS: Record<"production" | "sandbox", readonly string[]> = {
  production: ["polar.sh", "checkout.polar.sh"],
  sandbox: ["sandbox.polar.sh", "checkout.sandbox.polar.sh", "polar.host"],
};

type PolarCheckoutEnvironment = keyof typeof POLAR_CHECKOUT_HOSTS;

const polarCheckoutEnvironment: PolarCheckoutEnvironment =
  process.env.NEXT_PUBLIC_POLAR_ENVIRONMENT === "production" ? "production" : "sandbox";

export default function Home() {
  const router = useRouter();
  const session = authClient.useSession();
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PaidPlanKey>("starter");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPlanDefinition = useMemo(
    () => POLAR_PLAN_DEFINITIONS[selectedPlan],
    [selectedPlan],
  );

  const resetStatus = () => setStatus(null);

  const runAuthAction = useCallback(
    async (
      action: () => Promise<unknown>,
      successMessage: string,
      onSuccess?: () => void | Promise<void>,
    ) => {
      setStatus("Working…");
      try {
        await action();
        setStatus(successMessage);
        if (onSuccess) {
          await onSuccess();
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unexpected error";
        setStatus(`Error: ${message}`);
      }
    },
    [],
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

        if (isSubmitting) {
          return;
        }

        try {
          setIsSubmitting(true);
          setStatus("Signing up and preparing checkout…");

          const signUpCredentials: AuthSignupPayload = {
            email,
            password,
            name: name.trim(),
          };

          const { data, error } = await authClient.signUp.email(signUpCredentials, {
            onRequest: () => setStatus("Creating your Prefix account…"),
          });

          if (error) {
            setStatus(`Signup failed: ${error.message ?? "Unknown error"}`);
            return;
          }

          if (!data || !hasAccountIdField(data)) {
            setStatus("Signup completed, but we could not determine your account.");
            return;
          }

          const accountId = data.accountId;

          // Polar billing metadata is stored separately; Better Auth only accepts credentials.
          const polarSignupData = buildPolarSignupData(selectedPlan);

          setStatus("Generating checkout session…");

          const response = await fetch("/api/checkout/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accountId,
              planKey: polarSignupData.planKey,
              polarPlanId: polarSignupData.polarPlanId,
              polarProductId: polarSignupData.polarProductId,
              polarBenefitId: polarSignupData.polarBenefitId,
              polarCreditsPerCycle: polarSignupData.polarCreditsPerCycle,
            }),
          });

          if (!response.ok) {
            const payload = await response.json().catch(() => null);
                
            const errorMessage =
              (payload && typeof payload.error === "string"
                ? payload.error
                : "Failed to start checkout. Please contact support.");

            setStatus(errorMessage);
            return;
          }

          const payload = (await response.json()) as unknown;
          if (!isCheckoutSessionPayload(payload)) {
            setStatus("Checkout session response was missing a URL.");
            return;
          }

          try {
            const checkoutUrl = new URL(payload.url);

            if (checkoutUrl.protocol !== "https:") {
              throw new Error("Checkout URL must use HTTPS.");
            }

            const allowedHosts = POLAR_CHECKOUT_HOSTS[polarCheckoutEnvironment];
            const hostnameAllowed = allowedHosts.some((host) => host === checkoutUrl.hostname);
            if (!hostnameAllowed) {
              throw new Error("Checkout URL domain is not trusted.");
            }

            setStatus("Redirecting you to Polar checkout…");
            router.push(checkoutUrl.toString());
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Invalid checkout URL received. Please contact support.";
            setStatus(message);
            return;
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unexpected signup error";
          setStatus(`Signup failed: ${message}`);
        } finally {
          setIsSubmitting(false);
        }
      } else {
        await runAuthAction(
          () =>
            authClient.signIn.email({
              email,
              password,
            }),
          "Signed in successfully. Redirecting…",
          () => router.push("/dashboard"),
        );
      }
    },
    [
      isSubmitting,
      email,
      mode,
      name,
      password,
      runAuthAction,
      selectedPlan,
      selectedPlanDefinition,
      router,
    ],
  );

  const handleSignOut = useCallback(async () => {
    await runAuthAction(
      () => authClient.signOut(),
      "Signed out.",
      () => router.push("/"),
    );
  }, [runAuthAction, router]);

  const currentUser = session.data?.user;
  const isLoading = session.isPending;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="flex w-full max-w-4xl flex-col gap-8 rounded-2xl bg-white p-10 shadow-xl dark:bg-zinc-900">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
            Choose your Prefix plan
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Pick the plan that fits your volume. We’ll provision your Polar
            subscription and Convex credits automatically.
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                {PLAN_OPTIONS.map((plan) => (
                  <button
                    key={plan.key}
                    type="button"
                    onClick={() => setSelectedPlan(plan.key)}
                    className={`flex flex-col gap-2 rounded-xl border p-4 text-left transition hover:border-zinc-900 dark:hover:border-zinc-100 ${
                      selectedPlan === plan.key
                        ? "border-zinc-900 bg-zinc-900 text-white shadow-md dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold">{plan.name}</span>
                      <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        {plan.priceLabel}
                      </span>
                    </div>
                    <p className="text-sm leading-snug text-zinc-600 dark:text-zinc-300">
                      {plan.description}
                    </p>
                    <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      {plan.creditsPerCycle.toLocaleString()} credits / month
                    </span>
                  </button>
                ))}
              </div>
              <p className="rounded-md border border-zinc-200 bg-zinc-100 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                <strong>{selectedPlanDefinition.planId}</strong> provisions Polar product
                <code className="mx-1 rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-700">
                  {selectedPlanDefinition.productId}
                </code>
                and benefit
                <code className="mx-1 rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-700">
                  {selectedPlanDefinition.benefitId}
                </code>
                with {selectedPlanDefinition.creditsPerCycle.toLocaleString()} Convex credits.
              </p>

              <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-200">
                Company or workspace name
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-100 dark:focus:ring-zinc-700"
                  placeholder="Prefix Labs"
                  autoComplete="organization"
                  required
                />
              </label>
            </>
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
            disabled={session.isPending || isSubmitting}
            className="mt-2 w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {mode === "signUp" ? "Create account & provision plan" : "Sign in"}
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
