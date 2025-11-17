import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getUser = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            return ("Not authenticated");
        }
        return identity
    }
})

export const getUserByToken = query({
    args: { tokenIdentifier: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", args.tokenIdentifier)
            )
            .unique();
    },
});

// Add a new query to get user by userId
export const getUserById = query({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        // Get the user from the database
        const user = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("userId"), args.userId))
            .first();
        
        return user;
    },
});

export const store = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Called storeUser without authentication present");
        }

        // Check if we've already stored this identity before
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.subject)
            )
            .unique();

        if (user !== null) {
            // If we've seen this identity before but the name has changed, patch the value
            if (user.name !== identity.name) {
                await ctx.db.patch(user._id, { name: identity.name, email: identity.email });
            }
            return user._id;
        }

        // If it's a new identity, create a new User
        return await ctx.db.insert("users", {
            name: identity.name!,
            email: identity.email!,
            userId: identity.subject,
            accountId: undefined, // Make accountId optional - will be set when user connects to Plaid
            tokenIdentifier: identity.subject,
            createdAt: new Date().toISOString(),
            weeklyBudget: 500, // Default budget values
            biweeklyBudget: 1000,
            monthlyBudget: 2000,
        });
    },
});

export const updateBudgets = mutation({
    args: {
        weeklyBudget: v.optional(v.number()),
        biweeklyBudget: v.optional(v.number()),
        monthlyBudget: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.subject)
            )
            .unique();

        if (!user) {
            throw new Error("User not found");
        }

        const updates: any = {};
        if (args.weeklyBudget !== undefined) updates.weeklyBudget = args.weeklyBudget;
        if (args.biweeklyBudget !== undefined) updates.biweeklyBudget = args.biweeklyBudget;
        if (args.monthlyBudget !== undefined) updates.monthlyBudget = args.monthlyBudget;

        await ctx.db.patch(user._id, updates);
        return user._id;
    },
});
