import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * Import transaction without strict auth requirements
 * For testing/development only
 */
export const importTestTransaction = mutation({
  args: {
    userId: v.string(),
    accountId: v.string(),
    transaction_id: v.number(),
    date: v.string(),
    time: v.optional(v.string()),
    activity: v.optional(v.string()),
    amount: v.number(),
    category: v.string(),
    type: v.optional(v.string()),
    vendor_name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if transaction already exists
    const existing = await ctx.db
      .query("transactions")
      .filter((q) => q.eq(q.field("transaction_id"), args.transaction_id))
      .first();

    if (existing) {
      return { success: false, error: "Transaction already exists" };
    }

    // Insert the transaction
    const id = await ctx.db.insert("transactions", {
      transaction_id: args.transaction_id,
      account_id: args.accountId,
      date: args.date,
      time: args.time,
      activity: args.activity,
      amount: args.amount,
      category: args.category,
      type: args.type,
      vendor_name: args.vendor_name,
      userId: args.userId,
    });

    return { success: true, id };
  },
});

/**
 * Update user's accountId (create user if doesn't exist)
 */
export const setUserAccountId = mutation({
  args: {
    userId: v.string(),
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    let user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!user) {
      // Create the user if they don't exist
      const newUserId = await ctx.db.insert("users", {
        userId: args.userId,
        accountId: args.accountId,
        tokenIdentifier: `test_token_${args.userId}`,
        createdAt: new Date().toISOString(),
        email: `user_${args.userId}@test.com`,
      });

      return { success: true, accountId: args.accountId, created: true };
    }

    // Update existing user
    await ctx.db.patch(user._id, { accountId: args.accountId });

    return { success: true, accountId: args.accountId, created: false };
  },
});
