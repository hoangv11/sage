"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Activity, Code, Star, TrendingUp, TrendingDown, Users, Zap } from "lucide-react";
import Link from "next/link";
import TransactionGraphs from "./_components/transaction-graphs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/lib/auth-client";
import { formatCategory } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import ConnectPlaidBanner from "./_components/connect-plaid-banner";
import { CreditCard } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";

interface Anomaly {
  amount: number;
  date: string;
  normal_range: [number, number];
  percent_deviation: number;
  transaction_id: string;
}

interface AnomalyData {
  high_spending_anomalies: Anomaly[];
  low_spending_anomalies: Anomaly[];
}

type TimePeriod = "weekly" | "biweekly" | "monthly";

export default function Dashboard() {
  const { data: session } = useSession();
  const user = session?.user;
  const userId = user?.id || "";
  const [anomalies, setAnomalies] = useState<AnomalyData | null>(null);
  const [loadingAnomalies, setLoadingAnomalies] = useState(false);
  const sentEmailRef = useRef(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod | null>("biweekly");
  const lastTransactionCountRef = useRef(0);
  const [visibleTransactions, setVisibleTransactions] = useState(5);
  const [showAllCategories, setShowAllCategories] = useState(false);

  const transactions = useQuery(api.transactions.getTransactionsByUser, {
    userId,
  });
  const userData = useQuery(api.users.getUserById, { userId });

  // Calculate total income and expenses
  const totalIncome =
    transactions?.reduce((sum, tx) =>
      tx.category === "income" ? sum + tx.amount : sum, 0) || 0;

  const totalExpenses =
    transactions?.reduce((sum, tx) =>
      tx.category !== "income" ? sum + tx.amount : sum, 0) || 0;

  const netCashFlow = totalIncome - totalExpenses;

  // Calculate total spending (for backward compatibility)
  const totalSpending =
    transactions?.reduce((sum, tx) => sum + tx.amount, 0) || 0;

  // Calculate spending by category
  const spendingByCategory =
    transactions?.reduce(
      (categories, tx) => {
        let category = tx.category.split(" > ")[0]; // Get top-level category
        // Format the category
        category = formatCategory(category);
        if (!categories[category]) {
          categories[category] = 0;
        }
        categories[category] += tx.amount;
        return categories;
      },
      {} as Record<string, number>
    ) || {};

  // Find top category
  let topCategory = "None";
  let topAmount = 0;

  Object.entries(spendingByCategory).forEach(([category, amount]) => {
    if (amount > topAmount) {
      topCategory = category;
      topAmount = amount;
    }
  });

  // Get date range based on time period
  const getDateRange = (period: TimePeriod) => {
    const now = new Date();
    const endDate = now.toISOString().split("T")[0];
    let startDate: string;

    switch (period) {
      case "weekly":
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate = weekAgo.toISOString().split("T")[0];
        break;
      case "biweekly":
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        startDate = twoWeeksAgo.toISOString().split("T")[0];
        break;
      case "monthly":
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate = monthAgo.toISOString().split("T")[0];
        break;
    }

    return { startDate, endDate };
  };

  // Fetch anomalies when time period is selected
  const fetchAnomalies = async (period: TimePeriod) => {
    if (!userId || !transactions || transactions.length === 0) return;

    setLoadingAnomalies(true);
    try {
      const { startDate, endDate } = getDateRange(period);
      const response = await fetch("http://localhost:8000/api/anomalies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: transactions[0].account_id, // Backend expects account_id for querying transactions
          startDate,
          endDate,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch anomalies");
      }

      const data = await response.json();

      // Check if response contains an error
      if (data.error) {
        console.error("Anomaly detection error:", data.error);
        setAnomalies(null);
        return;
      }

      setAnomalies(data);

      // Send email if any anomalies are detected and email hasn't been sent yet
      if (
        (data.high_spending_anomalies?.length > 0 ||
          data.low_spending_anomalies?.length > 0) &&
        !sentEmailRef.current &&
        user?.email
      ) {
        try {
          const emailResponse = await fetch("/api/send-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: user.email,
              highSpendingAnomalies: data.high_spending_anomalies,
              lowSpendingAnomalies: data.low_spending_anomalies,
            }),
          });

          if (!emailResponse.ok) {
            throw new Error("Failed to send email");
          }

          sentEmailRef.current = true;
        } catch (error) {
          console.error("Failed to send anomaly alert email:", error);
        }
      }
    } catch (error) {
      console.error("Error fetching anomalies:", error);
    } finally {
      setLoadingAnomalies(false);
    }
  };

  // Listen for new transactions and check for anomalies
  useEffect(() => {
    if (!transactions) return;

    const currentTransactionCount = transactions.length;

    // Check if we have new transactions
    if (currentTransactionCount > lastTransactionCountRef.current) {
      // If we have a time period selected, automatically check for new anomalies
      if (timePeriod) {
        // Reset email sent flag so we can send a new email if anomalies are found
        sentEmailRef.current = false;
        fetchAnomalies(timePeriod);
      }
    }

    // Update the transaction count reference
    lastTransactionCountRef.current = currentTransactionCount;
  }, [transactions, timePeriod]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-500">
          Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
        </p>
      </div>

      {/* Connect Plaid Banner - only shown if user hasn't connected */}
      <ConnectPlaidBanner />

      {/* Time Period Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Time Period:</span>
        <Select
          value={timePeriod || ""}
          onValueChange={(value: TimePeriod) => {
            setTimePeriod(value);
            fetchAnomalies(value);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="biweekly">Biweekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
        {loadingAnomalies && (
          <span className="text-sm text-gray-500">Loading anomalies...</span>
        )}
      </div>

      {/* Quick Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalExpenses.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">All time expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalIncome.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">All time income</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transactions?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Total transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Net Cash Flow
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                netCashFlow >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {netCashFlow >= 0 ? "+" : ""}${Math.abs(netCashFlow).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Income minus expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Graphs */}
      <TransactionGraphs />

      {/* Anomaly Alerts */}
      {anomalies?.high_spending_anomalies.length ||
      anomalies?.low_spending_anomalies.length ? (
        <Collapsible className="rounded-lg border bg-card p-3">
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-sm text-muted-foreground">
                {(anomalies?.high_spending_anomalies.length || 0) +
                  (anomalies?.low_spending_anomalies.length || 0)}{" "}
                Spending Anomal
                {(anomalies?.high_spending_anomalies.length || 0) +
                  (anomalies?.low_spending_anomalies.length || 0) ===
                1
                  ? "y"
                  : "ies"}{" "}
                Detected
              </span>
            </div>
            <ChevronRight className="h-4 w-4 transition-transform [[data-state=open]_&]:rotate-90" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 pl-4">
            <div className="divide-y divide-border">
              {anomalies?.high_spending_anomalies.map((anomaly) => (
                <div key={anomaly.transaction_id} className="py-2 first:pt-2">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      ${anomaly.amount.toFixed(2)}
                    </span>{" "}
                    on {new Date(anomaly.date).toLocaleDateString()} •{" "}
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      {anomaly.percent_deviation.toFixed(1)}% above
                    </span>{" "}
                    normal (${anomaly.normal_range[0].toFixed(2)} - $
                    {anomaly.normal_range[1].toFixed(2)})
                  </p>
                </div>
              ))}
              {anomalies?.low_spending_anomalies.map((anomaly) => (
                <div key={anomaly.transaction_id} className="py-2 first:pt-2">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      ${anomaly.amount.toFixed(2)}
                    </span>{" "}
                    on {new Date(anomaly.date).toLocaleDateString()} •{" "}
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {anomaly.percent_deviation.toFixed(1)}% below
                    </span>{" "}
                    normal (${anomaly.normal_range[0].toFixed(2)} - $
                    {anomaly.normal_range[1].toFixed(2)})
                  </p>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      {/* Featured Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your recent financial transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactions && transactions.length > 0 ? (
              <>
                <div className="space-y-3">
                  {transactions
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                    )
                    .slice(0, visibleTransactions)
                    .map((transaction) => (
                      <div
                        key={transaction._id}
                        className="flex items-center justify-between py-2 border-b border-border last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            {transaction.category === "income" ? (
                              <CreditCard className="w-4 h-4 text-green-500" />
                            ) : (
                              <CreditCard className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              {formatCategory(
                                transaction?.vendor_name || transaction.category
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(transaction.date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`text-sm font-medium ${
                            transaction.category === "income"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          ${Math.abs(transaction.amount).toFixed(2)}
                        </div>
                      </div>
                    ))}
                </div>
                {transactions.length > visibleTransactions ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setVisibleTransactions(prev => prev + 10)}
                    className="w-full mt-6 text-sm"
                  >
                    Show More ({Math.min(10, transactions.length - visibleTransactions)} more)
                  </Button>
                ) : visibleTransactions > 5 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setVisibleTransactions(5)}
                    className="w-full mt-6 text-sm"
                  >
                    Show Less
                  </Button>
                ) : null}
              </>
            ) : (
              <p className="text-center py-4 text-sm text-muted-foreground">
                No recent transactions
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>Your spending by category</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(spendingByCategory).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(spendingByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount]) => {
                    const isIncome = category.toLowerCase() === 'income'
                    return (
                      <div
                        key={category}
                        className="flex items-center justify-between py-2 border-b border-border last:border-0"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {category}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {((Math.abs(amount) / Math.abs(totalSpending)) * 100).toFixed(1)}% of total
                          </p>
                        </div>
                        <div className={`text-sm font-medium ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                          {isIncome ? '+' : '-'}${Math.abs(amount).toFixed(2)}
                        </div>
                      </div>
                    )
                  })}
              </div>
            ) : (
              <p className="text-center py-4 text-sm text-muted-foreground">
                No category data available
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
