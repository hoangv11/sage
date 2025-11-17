import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { internal } from "./_generated/api";

interface User {
  email: string;
  weeklyBudget?: number;
  biweeklyBudget?: number;
  monthlyBudget?: number;
}

/**
 * Get all transactions for a specific user
 */
export const getTransactionsByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Get user to find their accountId
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();
    
    // If user doesn't have an accountId, return empty array
    if (!user || !user.accountId) {
      return [];
    }

    // Use accountId to fetch transactions
    return await ctx.db
      .query("transactions")
      .filter((q) => q.eq(q.field("account_id"), user.accountId))
      .collect();
  },
});

/**
 * Get transactions by account ID
 */
export const getTransactionsByAccountId = query({
  args: { accountId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transactions")
      .filter((q) => q.eq(q.field("account_id"), args.accountId))
      .collect();
  },
});

/**
 * Get transaction by ID
 */
export const getTransactionById = query({
  args: { transactionId: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transactions")
      .filter((q) => q.eq(q.field("transaction_id"), args.transactionId))
      .first();
  },
});

/**
 * Get transactions for the currently authenticated user
 */
export const getMyTransactions = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the user from the database
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Get all transactions for this user
    return await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", user.userId || ""))
      .collect();
  },
});

/**
 * Store a new transaction in the database
 */
export const storeTransaction = mutation({
  args: {
    transaction_id: v.number(),
    account_id: v.string(),
    date: v.string(),
    time: v.optional(v.string()),
    activity: v.optional(v.string()),
    amount: v.number(),
    category: v.string(),
    type: v.optional(v.string()),
    vendor_name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the user from the database
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if this transaction already exists
    const existingTransaction = await ctx.db
      .query("transactions")
      .filter((q) => q.eq(q.field("transaction_id"), args.transaction_id))
      .first();

    if (existingTransaction) {
      throw new Error("Transaction already exists");
    }

    // Insert the new transaction
    return await ctx.db.insert("transactions", {
      transaction_id: args.transaction_id,
      account_id: args.account_id,
      date: args.date,
      time: args.time ? args.time.trim() : undefined,
      activity: args.activity ? args.activity.trim() : undefined,
      amount: args.amount,
      category: args.category.trim(),
      type: args.type ? args.type.trim() : undefined,
      vendor_name: args.vendor_name ? args.vendor_name.trim() : undefined,
      userId: user.userId,
    });
  },
});

/**
 * Update all transaction dates to spread across the past 3 months
 */
export const updateTransactionDatesToCurrentYear = mutation({
  handler: async (ctx) => {
    // Get all transactions
    const transactions = await ctx.db.query("transactions").collect();

    // Spread transactions across the past 3 months
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(now.getMonth() - 3);

    // Update each transaction with a random date
    for (const transaction of transactions) {
      // Generate a random date within past 3 months
      const randomTimestamp = threeMonthsAgo.getTime() +
        Math.random() * (now.getTime() - threeMonthsAgo.getTime());
      const newDate = new Date(randomTimestamp);

      // Format the date as YYYY-MM-DD
      const formattedDate = newDate.toISOString().split('T')[0];

      // Update the transaction with the new date
      await ctx.db.patch(transaction._id, { date: formattedDate });
    }

    return { success: true, updatedCount: transactions.length };
  },
});

export const getTransactions = query({
  args: {
    userId: v.string(), // Actually using this as account_id
    startDate: v.string(),
    endDate: v.string()
  },
  handler: async (ctx, args) => {
    // Directly query transactions by account_id
    return await ctx.db
      .query("transactions")
      .filter((q) =>
        q.and(
          q.eq(q.field("account_id"), args.userId), // Use userId param as account_id
          q.gte(q.field("date"), args.startDate),
          q.lte(q.field("date"), args.endDate)
        )
      )
      .collect();
  },
});

export const addTransaction = mutation({
  args: {
    accountId: v.string(),
    amount: v.number(),
    category: v.string(),
    date: v.string(),
    vendorName: v.string(),
    transactionId: v.number(),
  },
  handler: async (ctx, args) => {
    // First, find the user with this account ID
    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("accountId"), args.accountId))
      .collect();

    if (users.length === 0) {
      throw new Error("No user found with this account ID");
    }

    const user = users[0];

    // Insert the transaction
    await ctx.db.insert("transactions", {
      userId: user._id,
      account_id: args.accountId,
      amount: args.amount,
      category: args.category,
      date: args.date,
      vendor_name: args.vendorName,
      transaction_id: args.transactionId,
      time: new Date().toISOString(),
    });

    // Check budgets and send alerts if needed
    if (user.email) {
      const now = new Date();

      // Check weekly budget
      if (user.weeklyBudget) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        const weekTransactions = await ctx.db
          .query("transactions")
          .filter((q) => q.eq(q.field("account_id"), args.accountId))
          .filter((q) => q.gte(q.field("date"), weekStart.toISOString().split("T")[0]))
          .collect();

        const weeklyTotal = weekTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        if (weeklyTotal > user.weeklyBudget) {
          await ctx.scheduler.runAfter(0, api.email.sendBudgetAlertEmail, {
            to: user.email,
            budgetType: "weekly",
            currentSpending: weeklyTotal,
            budgetAmount: user.weeklyBudget,
          });
        }
      }

      // Check bi-weekly budget
      if (user.biweeklyBudget) {
        const biweekStart = new Date(now);
        biweekStart.setDate(now.getDate() - 14);
        const biweekTransactions = await ctx.db
          .query("transactions")
          .filter((q) => q.eq(q.field("account_id"), args.accountId))
          .filter((q) => q.gte(q.field("date"), biweekStart.toISOString().split("T")[0]))
          .collect();

        const biweeklyTotal = biweekTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        if (biweeklyTotal > user.biweeklyBudget) {
          await ctx.scheduler.runAfter(0, api.email.sendBudgetAlertEmail, {
            to: user.email,
            budgetType: "biweekly",
            currentSpending: biweeklyTotal,
            budgetAmount: user.biweeklyBudget,
          });
        }
      }
    }

    return { success: true };
  },
});

export const deleteAllTransactions = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!user || !user.accountId) {
      return { success: false, message: "User or account not found" };
    }

    const transactions = await ctx.db
      .query("transactions")
      .filter((q) => q.eq(q.field("account_id"), user.accountId))
      .collect();

    for (const transaction of transactions) {
      await ctx.db.delete(transaction._id);
    }

    return { success: true, deletedCount: transactions.length };
  },
});
