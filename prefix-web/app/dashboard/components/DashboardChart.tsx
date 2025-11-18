"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

type CreditHistoryEntry = {
  _id: string;
  createdAt: number;
  delta: number;
  source: "plan_grant" | "top_up" | "usage" | "refund";
};

interface DashboardChartProps {
  creditHistory: CreditHistoryEntry[];
  currentBalance: number;
}

const chartConfig = {
  balance: {
    label: "Credit Balance",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function DashboardChart({ creditHistory, currentBalance }: DashboardChartProps) {
  const chartData = React.useMemo(() => {
    const fallbackBalance = currentBalance ?? 0;

    if (!creditHistory || creditHistory.length === 0) {
      const now = Date.now();
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

      return [weekAgo, now].map((timestamp) => ({
        date: new Date(timestamp).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        balance: fallbackBalance,
        createdAt: timestamp,
      }));
    }

    const sortedDesc = [...creditHistory].sort((a, b) => b.createdAt - a.createdAt);
    let runningBalance = fallbackBalance;

    const pointsDesc = sortedDesc.map((entry) => {
      const point = {
        date: new Date(entry.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        balance: runningBalance,
        createdAt: entry.createdAt,
      };
      runningBalance -= entry.delta;
      return point;
    });

    const chronological = pointsDesc.reverse();

    if (chronological.length === 1) {
      const single = chronological[0];
      const dayBefore = new Date(single.createdAt - 24 * 60 * 60 * 1000);
      chronological.unshift({
        date: dayBefore.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        balance: single.balance,
        createdAt: dayBefore.getTime(),
      });
    }

    return chronological;
  }, [creditHistory, currentBalance]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credit Balance History</CardTitle>
        <CardDescription>
          Your credit balance over the last 30 transactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            No credit history available yet
          </div>
        ) : (
          <ChartContainer config={chartConfig}>
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Area
                dataKey="balance"
                type="natural"
                fill="var(--color-balance)"
                fillOpacity={0.4}
                stroke="var(--color-balance)"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
