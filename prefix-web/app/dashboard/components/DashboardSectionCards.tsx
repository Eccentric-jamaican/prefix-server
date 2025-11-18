"use client";

import { IconTrendingUp, IconKey, IconClock } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AccountData = {
  accountId: string;
  accountName: string;
  planId: string;
  status: string;
  creditBalance: number;
};

interface DashboardSectionCardsProps {
  account: AccountData;
  apiKeysCount: number;
}

export function DashboardSectionCards({ account, apiKeysCount }: DashboardSectionCardsProps) {
  // Trial status is determined by the status field
  const isTrialActive = account.status === "trial";

  return (
    <div className="*:data-[slot=card]:from-primary/10 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Current Plan</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl capitalize">
            {account.planId}
          </CardTitle>
          <CardAction>
            <Badge
              variant="secondary"
              className="capitalize bg-primary/10 text-primary"
            >
              {account.status}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Account: {account.accountName}
          </div>
          <div className="text-muted-foreground">
            {account.status === "trial" ? "Trial period active" : "Subscription active"}
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Credits Remaining</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {account.creditBalance.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge
              variant="secondary"
              className="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300"
            >
              <IconTrendingUp className="size-4" />
              Available
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Ready to use
          </div>
          <div className="text-muted-foreground">
            Credits for API requests
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>API Keys</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {apiKeysCount}
          </CardTitle>
          <CardAction>
            <Badge
              variant="secondary"
              className="bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300"
            >
              <IconKey className="size-4" />
              Active
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Total keys generated
          </div>
          <div className="text-muted-foreground">
            Manage keys below
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Account Status</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl capitalize">
            {account.status}
          </CardTitle>
          <CardAction>
            <Badge
              variant="secondary"
              className={cn(
                "bg-amber-500/10 text-amber-600",
                "dark:bg-amber-400/10 dark:text-amber-300",
              )}
            >
              <IconClock className="size-4" />
              {isTrialActive ? "Trial" : "Active"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {isTrialActive ? "Free trial active" : "Subscription active"}
          </div>
          <div className="text-muted-foreground">
            {isTrialActive ? "Explore all features" : "Full access enabled"}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
