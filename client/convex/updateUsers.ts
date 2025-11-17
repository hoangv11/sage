import { mutation } from './_generated/server';

// Function to update existing users with accountId and default budgets
export const updateExistingUsers = mutation({
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect();
    let updatedCount = 0;

    for (const user of users) {
      // Skip users that already have an accountId and budget values
      if (user.accountId && user.weeklyBudget && user.biweeklyBudget && user.monthlyBudget) continue;

      // Update user with accountId and default budgets
      await ctx.db.patch(user._id, {
        accountId: user.accountId || user.userId, // Use userId as accountId if not set
        weeklyBudget: user.weeklyBudget || 500,
        biweeklyBudget: user.biweeklyBudget || 1000,
        monthlyBudget: user.monthlyBudget || 2000,
      });

      updatedCount++;
    }

    return {
      success: true,
      updatedCount,
      message: `Updated ${updatedCount} users with accountId and default budgets`,
    };
  },
});
