import { defineSchema, defineTable } from "convex/server"
import { Infer, v } from "convex/values"

export const INTERVALS = {
    MONTH: "month",
    YEAR: "year",
} as const;

export const intervalValidator = v.union(
    v.literal(INTERVALS.MONTH),
    v.literal(INTERVALS.YEAR),
);

export type Interval = Infer<typeof intervalValidator>;

// Define a price object structure that matches your data
const priceValidator = v.object({
    amount: v.number(),
    polarId: v.string(),
});

// Define a prices object structure for a specific interval
const intervalPricesValidator = v.object({
    usd: priceValidator,
});


export default defineSchema({
    users: defineTable({
        name: v.optional(v.string()),
        image: v.optional(v.string()),
        userId: v.string(),
        accountId: v.optional(v.string()),
        subscription: v.optional(v.string()),
        credits: v.optional(v.string()),
        tokenIdentifier: v.string(),
        createdAt: v.string(),
        weeklyBudget: v.optional(v.number()),
        biweeklyBudget: v.optional(v.number()),
        monthlyBudget: v.optional(v.number()),
        email: v.string(),
    }).index("by_token", ["tokenIdentifier"]),
    
    transactions: defineTable({
        account_id: v.string(),
        transaction_id: v.number(),
        date: v.string(),
        time: v.optional(v.string()),
        activity: v.optional(v.string()),
        amount: v.number(),
        category: v.string(),
        type: v.optional(v.string()),
        vendor_name: v.optional(v.string()),
        userId: v.optional(v.string()),
    })
    .index("by_account", ["account_id"])
    .index("by_date", ["date"])
    .index("by_user", ["userId"]),
})