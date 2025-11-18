"use client";

import { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api.js";
import type { Id } from "../../../../convex/_generated/dataModel.js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

type ApiKeyEntry = {
  apiKeyId: string;
  idPrefix: string;
  label?: string;
  createdAt: number;
  lastUsedAt?: number;
  revokedAt?: number;
};

interface DashboardApiKeysTableProps {
  apiKeys: ApiKeyEntry[];
}

export function DashboardApiKeysTable({ apiKeys }: DashboardApiKeysTableProps) {
  const issueApiKey = useMutation(api.apiKeys.issueForCurrentUser);
  const revokeApiKey = useMutation(api.apiKeys.revokeForCurrentUser);
  
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [labelInput, setLabelInput] = useState("");
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null);
  const [newKeyPrefix, setNewKeyPrefix] = useState<string | null>(null);
  const [revokeInFlight, setRevokeInFlight] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const handleIssueKey = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isCreatingKey) return;

    const trimmedLabel = labelInput.trim();

    try {
      setIsCreatingKey(true);
      const result = await issueApiKey({
        label: trimmedLabel.length > 0 ? trimmedLabel : undefined,
      });

      setNewKeySecret(result.secret);
      setNewKeyPrefix(result.prefix);
      setLabelInput("");
      toast.success("API key generated successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate API key.";
      toast.error(message);
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (revokeInFlight) return;

    try {
      setRevokeInFlight(keyId);
      await revokeApiKey({ apiKeyId: keyId as Id<"apiKeys"> });
      toast.success("API key revoked successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to revoke API key.";
      toast.error(message);
    } finally {
      setRevokeInFlight(null);
    }
  };

  const handleCopySecret = async (secret: string) => {
    try {
      await navigator.clipboard.writeText(secret);
      toast.success("Secret copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy secret");
    }
  };

  const formatTimestamp = (value?: number) => {
    if (!value) return "—";
    return new Date(value).toLocaleString();
  };

  const sortedKeys = useMemo(() => {
    return [...apiKeys].sort((a, b) => b.createdAt - a.createdAt);
  }, [apiKeys]);

  return (
    <div className="px-4 lg:px-6 space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">API Keys</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate keys to authenticate with the Prefix API. Store secrets securely; they cannot be retrieved after creation.
            </p>
          </div>
        </div>

        <form onSubmit={handleIssueKey} className="space-y-4 mb-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label htmlFor="label">Label (optional)</Label>
              <Input
                id="label"
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                placeholder="Production server"
                className="bg-background"
              />
            </div>
            <Button type="submit" disabled={isCreatingKey}>
              {isCreatingKey ? "Generating…" : "Generate API Key"}
            </Button>
          </div>
        </form>

        {newKeySecret && (
          <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium text-foreground">New API Key</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Copy this secret now. For security reasons it will not be shown again. The key prefix is{" "}
                  <span className="font-mono font-semibold">{newKeyPrefix}</span>.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNewKeySecret(null);
                  setNewKeyPrefix(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                Dismiss
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <code className="break-all rounded bg-background px-3 py-2 font-mono text-sm text-foreground shadow-sm ring-1 ring-border/60">
                {newKeySecret}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopySecret(newKeySecret)}
              >
                Copy
              </Button>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedKeys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No API keys yet. Generate one above to get started.
                  </TableCell>
                </TableRow>
              ) : (
                sortedKeys.map((key) => {
                  const status = key.revokedAt ? "Revoked" : "Active";
                  const keyId = key.apiKeyId as Id<"apiKeys">;

                  return (
                    <TableRow key={key.apiKeyId}>
                      <TableCell>{key.label ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-sm text-foreground/90">
                            {key.idPrefix}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(key.idPrefix);
                                setCopiedKeyId(key.apiKeyId);
                                toast.success("Prefix copied to clipboard");
                                setTimeout(() => setCopiedKeyId(null), 2000);
                              } catch (error) {
                                toast.error("Failed to copy prefix");
                              }
                            }}
                          >
                            {copiedKeyId === key.apiKeyId ? "Copied" : "Copy"}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{formatTimestamp(key.createdAt)}</TableCell>
                      <TableCell>{formatTimestamp(key.lastUsedAt)}</TableCell>
                      <TableCell>
                        <Badge variant={status === "Active" ? "default" : "secondary"}>
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRevokeKey(keyId)}
                          disabled={status !== "Active" || revokeInFlight === key.apiKeyId}
                        >
                          {revokeInFlight === key.apiKeyId ? "Revoking…" : "Revoke"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
