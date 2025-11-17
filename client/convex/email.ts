"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export const sendBudgetAlertEmail = action({
  args: {
    to: v.string(),
    budgetType: v.union(v.literal("weekly"), v.literal("biweekly"), v.literal("monthly")),
    currentSpending: v.number(),
    budgetAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const { to, budgetType, currentSpending, budgetAmount } = args;
    
    const subject = `Budget Alert: ${budgetType.charAt(0).toUpperCase() + budgetType.slice(1)} Budget Exceeded`;
    const html = `
      <h2>Budget Alert</h2>
      <p>Your ${budgetType} spending has exceeded your budget:</p>
      <ul>
        <li>Current Spending: $${currentSpending.toFixed(2)}</li>
        <li>Budget Limit: $${budgetAmount.toFixed(2)}</li>
        <li>Over Budget: $${(currentSpending - budgetAmount).toFixed(2)}</li>
      </ul>
    `;

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM_ADDRESS,
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error("Failed to send budget alert email:", error);
      throw new Error("Failed to send budget alert email");
    }
  },
});

export const sendAnomalyAlertEmail = action({
  args: {
    to: v.string(),
    anomalies: v.array(
      v.object({
        amount: v.number(),
        date: v.string(),
        normal_range: v.array(v.number()),
        percent_deviation: v.number(),
        transaction_id: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { to, anomalies } = args;
    
    const subject = `Unusual Spending Activity Detected`;
    const html = `
      <h2>Spending Anomaly Alert</h2>
      <p>We've detected unusual spending activity in your account:</p>
      ${anomalies.map(anomaly => `
        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
          <h3>Transaction Details</h3>
          <ul>
            <li>Amount: $${anomaly.amount.toFixed(2)}</li>
            <li>Date: ${new Date(anomaly.date).toLocaleDateString()}</li>
            <li>Deviation: ${anomaly.percent_deviation.toFixed(2)}% from normal range</li>
            <li>Normal spending range: $${anomaly.normal_range[0].toFixed(2)} - $${anomaly.normal_range[1].toFixed(2)}</li>
          </ul>
        </div>
      `).join('')}
      <p>Please review these transactions and contact us if you don't recognize any of them.</p>
    `;

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM_ADDRESS,
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error("Failed to send anomaly alert email:", error);
      throw new Error("Failed to send anomaly alert email");
    }
  },
});
