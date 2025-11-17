/**
 * Import CSV transactions into Convex
 *
 * Usage:
 * 1. Make sure you're signed in to the app
 * 2. Run: npx tsx scripts/import-csv.ts
 */

import { ConvexHttpClient } from "convex/browser";
import * as fs from "fs";
import * as path from "path";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
  console.error("Error: NEXT_PUBLIC_CONVEX_URL not found in environment");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function importCSV() {
  // Read CSV file
  const csvPath = path.join(process.cwd(), "transactions.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const lines = csvContent.split("\n");
  const headers = lines[0].split(",");

  console.log(`Found ${lines.length - 1} transactions in CSV`);
  console.log("Headers:", headers);

  // Parse transactions
  const transactions = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(",");
    const tx = {
      account_id: values[0],
      transaction_id: parseInt(values[1]),
      date: values[2],
      time: values[3],
      activity: values[4],
      amount: parseFloat(values[5]),
      category: values[6],
      type: values[7],
      vendor_name: values[8],
    };

    // Update date to 2025
    const oldDate = new Date(tx.date);
    const newDate = new Date(2025, oldDate.getMonth(), oldDate.getDate());
    tx.date = newDate.toISOString().split("T")[0];

    transactions.push(tx);
  }

  console.log(`Importing ${transactions.length} transactions...`);

  // Import in batches
  let imported = 0;
  for (const tx of transactions) {
    try {
      await client.mutation("transactions:storeTransaction" as any, tx);
      imported++;
      if (imported % 100 === 0) {
        console.log(`Imported ${imported}/${transactions.length}...`);
      }
    } catch (error: any) {
      if (!error.message.includes("already exists")) {
        console.error(`Error importing transaction ${tx.transaction_id}:`, error.message);
      }
    }
  }

  console.log(`✅ Successfully imported ${imported} transactions!`);
}

importCSV().catch(console.error);
