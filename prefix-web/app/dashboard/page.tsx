"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api.js";
import type { Id } from "../../../convex/_generated/dataModel.js";
import { authClient } from "@/lib/auth-client";

export default function DashboardPage() {
  const router = useRouter();
  const session = authClient.useSession();
  const apiKeys = useQuery(api.apiKeys.listForCurrentUser, {});
  const issueApiKey = useMutation(api.apiKeys.issueForCurrentUser);
  const revokeApiKey = useMutation(api.apiKeys.revokeForCurrentUser);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [revokeInFlight, setRevokeInFlight] = useState<Id<"apiKeys"> | null>(null);
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null);
  const [newKeyPrefix, setNewKeyPrefix] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [labelInput, setLabelInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const isLoading = session.isPending || apiKeys === undefined;
  const currentUser = session.data?.user ?? null;

  const sortedKeys = useMemo(() => {
    if (!apiKeys) {
      return [];
    }
    return [...apiKeys].sort((a, b) => b.createdAt - a.createdAt);
  }, [apiKeys]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-full max-w-2xl space-y-6 px-6">
          <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
          <div className="space-y-3 rounded-lg border border-gray-200 p-6">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="h-10 w-32 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Not Authenticated</h1>
          <p className="text-gray-600 mb-4">Please sign in to access the dashboard.</p>
          <a href="/" className="text-blue-600 hover:underline">
            Go to home
          </a>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await authClient.signOut();
      router.push("/");
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleIssueKey = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isCreatingKey) {
      return;
    }

    const trimmedLabel = labelInput.trim();

    try {
      setIsCreatingKey(true);
      setFormError(null);
      const result = await issueApiKey({
        label: trimmedLabel.length > 0 ? trimmedLabel : undefined,
      });

      setNewKeySecret(result.secret);
      setNewKeyPrefix(result.prefix);
      setSecretCopied(false);
      setLabelInput("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to generate API key.";
      setFormError(message);
    } finally {
      setIsCreatingKey(false);
    }
  };

  const formatTimestamp = (value?: number) => {
    if (!value) {
      return "—";
    }
    return new Date(value).toLocaleString();
  };

  const handleRevokeKey = async (keyId: Id<"apiKeys">) => {
    if (revokeInFlight) {
      return;
    }

    try {
      setRevokeInFlight(keyId);
      setRevokeError(null);
      await revokeApiKey({ apiKeyId: keyId });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to revoke API key.";
      setRevokeError(message);
    } finally {
      setRevokeInFlight(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

            <div className="space-y-6">
              {/* User Info */}
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Account Information</h2>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{currentUser.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">{currentUser.email}</dd>
                  </div>
                </dl>
              </div>
              {/* Success Message - only show for new users */}
              {sortedKeys.length === 0 && (
                <div className="rounded-md bg-green-50 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">
                        Welcome to Prefix!
                      </h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p>
                          Your account has been created successfully. You can now start using the Prefix API.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="px-4 pb-6 sm:px-6">
            <div className="flex gap-4">
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSigningOut ? "Signing out…" : "Sign Out"}
              </button>
            </div>

            <section className="mt-6 space-y-6">
              <div className="rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">API keys</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Generate keys to authenticate with the Prefix API. Store secrets securely; they cannot be retrieved after creation.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleIssueKey} className="mt-6 space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <label className="flex-1 text-sm text-gray-700">
                      <span className="mb-1 block font-medium">Label (optional)</span>
                      <input
                        type="text"
                        value={labelInput}
                        onChange={(event) => setLabelInput(event.target.value)}
                        placeholder="Production server"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm transition focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={isCreatingKey}
                      className="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isCreatingKey ? "Generating…" : "Generate API key"}
                    </button>
                  </div>
                  {formError && (
                    <p className="text-sm text-red-600">{formError}</p>
                  )}
                </form>

                {newKeySecret && (
                  <div
                    className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-4"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-emerald-900">New API key</h3>
                        <p className="mt-2 text-sm text-emerald-800">
                          Copy this secret now. For security reasons it will not be shown again. The key prefix is {" "}
                          <span className="font-mono font-semibold">{newKeyPrefix}</span>.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setNewKeySecret(null);
                          setNewKeyPrefix(null);
                          setSecretCopied(false);
                        }}
                        className="rounded-md border border-transparent px-2 py-1 text-sm font-medium text-emerald-900 hover:bg-emerald-100"
                        aria-label="Dismiss new API key"
                      >
                        Dismiss
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <code className="break-all rounded bg-white px-3 py-2 font-mono text-sm text-gray-900 shadow-sm">
                        {newKeySecret}
                      </code>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(newKeySecret);
                            setSecretCopied(true);
                            setTimeout(() => setSecretCopied(false), 2500);
                          } catch (error) {
                            console.error("Failed to copy API key", error);
                          }
                        }}
                        className="rounded-md border border-emerald-300 px-3 py-1.5 text-sm font-medium text-emerald-900 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={secretCopied}
                        aria-live="polite"
                      >
                        {secretCopied ? "Copied!" : "Copy"}
                      </button>
                      {secretCopied && (
                        <span className="text-sm text-emerald-900" aria-live="polite">
                          Secret copied to clipboard.
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {revokeError && (
                  <p className="mt-4 text-sm text-red-600">{revokeError}</p>
                )}

                <div className="mt-6 overflow-hidden rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-2 text-left font-semibold text-gray-700">
                          Label
                        </th>
                        <th scope="col" className="px-4 py-2 text-left font-semibold text-gray-700">
                          Prefix
                        </th>
                        <th scope="col" className="px-4 py-2 text-left font-semibold text-gray-700">
                          Created
                        </th>
                        <th scope="col" className="px-4 py-2 text-left font-semibold text-gray-700">
                          Last used
                        </th>
                        <th scope="col" className="px-4 py-2 text-left font-semibold text-gray-700">
                          Status
                        </th>
                        <th scope="col" className="px-4 py-2 text-right font-semibold text-gray-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sortedKeys.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                            No API keys yet. Generate one above to get started.
                          </td>
                        </tr>
                      ) : (
                        sortedKeys.map((key) => {
                          const status = key.revokedAt ? "Revoked" : "Active";
                          const apiKeyId = key.apiKeyId as Id<"apiKeys">;

                          return (
                            <tr key={key.apiKeyId} className="bg-white">
                              <td className="px-4 py-3 text-gray-900">
                                {key.label ?? "—" }
                              </td>
                              <td className="px-4 py-3 font-mono text-gray-900">
                                {key.idPrefix}
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                {formatTimestamp(key.createdAt)}
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                {formatTimestamp(key.lastUsedAt)}
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                <span
                                  className={
                                    status === "Active"
                                      ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800"
                                      : "inline-flex rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-700"
                                  }
                                >
                                  {status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-sm">
                                <button
                                  type="button"
                                  onClick={() => handleRevokeKey(apiKeyId)}
                                  disabled={status !== "Active" || revokeInFlight === apiKeyId}
                                  className="rounded-md border border-red-200 px-3 py-1.5 font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {revokeInFlight === apiKeyId ? "Revoking…" : "Revoke"}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
