import Link from "next/link";

export const metadata = {
  title: "Checkout canceled | Prefix",
};

export default function CheckoutCancelPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <section className="w-full max-w-xl rounded-2xl bg-white p-10 text-center shadow-xl dark:bg-zinc-900">
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
          Checkout canceled
        </h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
          No worries—your card wasn&apos;t charged. You can retry checkout at any time or
          pick a different plan that fits better.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Back to plans
          </Link>
          <Link
            href="mailto:support@prefix"
            className="inline-flex items-center justify-center rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Contact support
          </Link>
        </div>
      </section>
    </main>
  );
}
