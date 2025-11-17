"use client";
import { Brain, Computer, Network, Sparkles, Bot, TrendingUp, Shield, Zap, Link as LinkIcon, Wallet } from "lucide-react";
import { FaBusinessTime } from "react-icons/fa";
import dynamic from "next/dynamic";
import { motion } from "motion/react";
import { BrainCog, BarChart4, Bell } from 'lucide-react';

const RadialOrbitalTimeline = dynamic(() => import("@/components/homepage/radial-orbital-timeline"), {
  ssr: false,
});

const features = [
  {
    name: "AI-Powered Financial Insights",
    description:
      "Sage is a chatbot that learns your spending habits via Plaid and answers 'what-if' scenarios to help you save smarter.",
    icon: BrainCog,
  },
  {
    name: "Interactive Data Visualization",
    description:
      "See your finances through dynamic charts with predictive forecasting to identify growth opportunities.",
    icon: BarChart4,
  },
  {
    name: "Smart Spending Alerts",
    description:
      "Get notified of budget thresholds and spending anomalies with personalized recommendations.",
    icon: Bell,
  },
];

const timelineData = [
  {
    id: 1,
    title: "Connect",
    date: "Step 1",
    content: "Link your financial accounts securely through Plaid integration for real-time data sync.",
    category: "Integration",
    icon: LinkIcon,
    relatedIds: [2],
    status: "completed" as const,
    energy: 85,
  },
  {
    id: 2,
    title: "AI Assistant",
    date: "Step 2",
    content: "Chat with Sage to understand your spending patterns and get personalized financial advice.",
    category: "AI",
    icon: Bot,
    relatedIds: [1, 3, 5],
    status: "completed" as const,
    energy: 95,
  },
  {
    id: 3,
    title: "Track",
    date: "Step 3",
    content: "Monitor your expenses in real-time with intelligent categorization and insights.",
    category: "Tracking",
    icon: Wallet,
    relatedIds: [2, 4],
    status: "completed" as const,
    energy: 75,
  },
  {
    id: 4,
    title: "Predict",
    date: "Step 4",
    content: "Leverage predictive analytics to forecast future spending and plan your budget accordingly.",
    category: "Analytics",
    icon: TrendingUp,
    relatedIds: [3, 5],
    status: "completed" as const,
    energy: 80,
  },
  {
    id: 5,
    title: "Protect",
    date: "Step 5",
    content: "Advanced anomaly detection identifies unusual transactions and potential fraud attempts.",
    category: "Security",
    icon: Shield,
    relatedIds: [2, 4, 6],
    status: "completed" as const,
    energy: 90,
  },
  {
    id: 6,
    title: "Optimize",
    date: "Step 6",
    content: "Receive AI-powered recommendations to optimize your spending and maximize savings.",
    category: "Optimization",
    icon: Zap,
    relatedIds: [5],
    status: "completed" as const,
    energy: 70,
  },
];

export default function SideBySide() {
  return (
    <section id="how-it-works" className="pt-24 pb-32 md:pb-48 scroll-mt-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto w-full">
          {/* How It Works - Orbital Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mb-24 md:mb-32"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-black dark:text-white">
                How It Works
              </h2>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
                Click on any node to explore your financial journey with Sage
              </p>
            </div>
            <div className="relative w-full h-[900px]">
              <RadialOrbitalTimeline timelineData={timelineData} />
            </div>
          </motion.div>

          {/* Content Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-black dark:text-white">
              No more spreadsheets, no more headaches.
              <br />
              Just pure financial bliss.
            </h2>

            <div className="mt-24 md:mt-32 grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                    viewport={{ once: true }}
                    key={feature.name}
                    className="text-left"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-5 w-5 text-amber-600 dark:text-amber-400" strokeWidth={2} />
                      <h3 className="text-lg font-semibold text-black dark:text-white">
                        {feature.name}
                      </h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
