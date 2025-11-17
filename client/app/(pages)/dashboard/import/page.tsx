"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/lib/auth-client";

export default function ImportPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const userId = user?.id || "";

  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [imported, setImported] = useState(0);

  const userData = useQuery(api.users.getUserById, { userId });
  const importTransaction = useMutation(
    api.importTransactions.importTestTransaction
  );
  const setAccountId = useMutation(api.importTransactions.setUserAccountId);
  const deleteAllTransactions = useMutation(
    api.transactions.deleteAllTransactions
  );

  const handleDeleteAll = async () => {
    if (
      !confirm(
        "Are you sure you want to delete ALL transactions? This cannot be undone."
      )
    ) {
      return;
    }

    setStatus("Deleting all transactions...");
    try {
      const result = await deleteAllTransactions({ userId });
      if (result.success) {
        setStatus(
          `✅ Successfully deleted ${result.deletedCount} transactions!`
        );
        setImported(0);
      } else {
        setStatus(`❌ ${result.message}`);
      }
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  const importTransactions = async () => {
    setImporting(true);
    setStatus("Fetching CSV data...");

    try {
      // Fetch CSV
      const response = await fetch("/transactions.csv");
      const csvText = await response.text();
      const lines = csvText.split("\n");

      // Get or create account ID
      let accountId = userData?.accountId;
      if (!accountId) {
        accountId = `account_${userId}`;
        setStatus(`Creating your account with ID: ${accountId}`);
        await setAccountId({
          userId,
          accountId,
        });
      } else {
        setStatus(`Using your account ID: ${accountId}`);
      }

      setStatus(`Parsing transactions...`);

      // Parse transactions (all of them!)
      const transactions = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(",");

        // Use the date directly from CSV (no random generation)
        transactions.push({
          userId,
          accountId,
          transaction_id:
            parseInt(values[1]) + Math.floor(Math.random() * 10000),
          date: values[2], // Use date from CSV
          time: values[3],
          activity: values[4],
          amount: parseFloat(values[5]),
          category: values[6],
          type: values[7],
          vendor_name: values[8],
        });
      }

      setStatus(`Importing ${transactions.length} transactions...`);

      // Import them
      let count = 0;
      for (const tx of transactions) {
        try {
          const result = await importTransaction(tx);
          if (result.success) {
            count++;
            setImported(count);
            if (count % 10 === 0) {
              setStatus(`Imported ${count}/${transactions.length}...`);
            }
          }
        } catch (e: any) {
          console.error(`Error importing:`, e.message);
        }
      }

      setStatus(`✅ Successfully imported ${count} transactions!`);
      setImporting(false);
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
      setImporting(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Import Test Transactions</CardTitle>
          <CardDescription>
            Import sample transactions from CSV to test the app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p>
              <strong>User ID:</strong> {userId}
            </p>
            <p>
              <strong>Account ID:</strong>{" "}
              {userData?.accountId || "Not set (will be created)"}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={importTransactions}
              disabled={importing}
              className="flex-1"
            >
              {importing ? "Importing..." : "Import All Transactions from CSV"}
            </Button>
            <Button
              onClick={handleDeleteAll}
              disabled={importing}
              variant="destructive"
              className="flex-1"
            >
              Delete All Transactions
            </Button>
          </div>

          {status && (
            <div className="mt-4 p-4 bg-gray-100 rounded-md">
              <p className="font-mono text-sm">{status}</p>
              {imported > 0 && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min((imported / 1100) * 100, 100)}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {imported} transactions imported
                  </p>
                </div>
              )}
            </div>
          )}

          {imported > 0 && !importing && (
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/dashboard")}
              className="w-full"
            >
              Go to Dashboard
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
