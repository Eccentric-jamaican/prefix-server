"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api.js";
import { authClient } from "@/lib/auth-client";
import { DashboardSectionCards } from "./components/DashboardSectionCards";
import { DashboardChart } from "./components/DashboardChart";
import { DashboardApiKeysTable } from "./components/DashboardApiKeysTable";

export default function Page() {
  const session = authClient.useSession();
  const account = useQuery(api.accounts.getAccountForCurrentUser, {});
  const apiKeys = useQuery(api.apiKeys.listForCurrentUser, {});
  const creditHistory = useQuery(api.credits.getHistoryForCurrentUser, { limit: 30 });

  const isLoading = session.isPending || account === undefined || apiKeys === undefined;
  const currentUser = session.data?.user ?? null;

  if (isLoading) {
    return (
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <div className="px-4 lg:px-6">
                  <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!currentUser || !account) {
    return (
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Not Authenticated</h1>
              <p className="text-gray-600 mb-4">Please sign in to access the dashboard.</p>
              <a href="/" className="text-blue-600 hover:underline">
                Go to home
              </a>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <DashboardSectionCards 
                account={account}
                apiKeysCount={apiKeys?.length ?? 0}
              />
              <div className="px-4 lg:px-6">
                <DashboardChart
                  creditHistory={creditHistory ?? []}
                  currentBalance={account.creditBalance}
                />
              </div>
              <DashboardApiKeysTable apiKeys={apiKeys ?? []} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
