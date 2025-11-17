"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleMessage,
} from "@/components/ui/chat-bubble";
import { useChat } from "ai/react";
import { Message } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  Bot,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Sparkles,
  BarChart,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/lib/auth-client";
import Image from "next/image";
import { Chart, registerables } from "chart.js";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Register Chart.js components
Chart.register(...registerables);

interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export default function Sage() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [expandedReasoning, setExpandedReasoning] = useState<number[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { data: session } = useSession();
  const user = session?.user;
  const userId = user?.id || "";

  // Get user and transaction data
  const userData = useQuery(api.users.getUserById, { userId });
  const transactions = useQuery(api.transactions.getTransactionsByUser, {
    userId,
  });

  // Graph related states
  const [graphData, setGraphData] = useState<any>(null);
  const [showGraph, setShowGraph] = useState(false);
  const [graphType, setGraphType] = useState<"bar" | "pie" | "line">("bar");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  // Generate system prompt with transaction data
  useEffect(() => {
    if (!transactions || transactions.length === 0) {
      setSystemPrompt(
        `You are Sage, a financial AI assistant. You help users understand their finances and make better financial decisions.
        Currently, the user has no transaction data available. Encourage them to connect their bank account to get personalized insights.

        If the user asks for a graph or visualization, tell them you can generate a simple graph for them. When they ask for a specific graph (spending by category, spending over time, etc.), respond with a message that includes the text "[GENERATE_GRAPH:type]" where type is one of: bar, pie, or line. This will trigger the UI to display the appropriate graph.

        IMPORTANT: When users ask how their finances "look like" or request to "see" their spending, automatically generate an appropriate visualization:
        - For general questions about overall finances or spending patterns, include "[GENERATE_GRAPH:pie]" in your response
        - For questions about spending trends or changes over time, include "[GENERATE_GRAPH:line]" in your response
        - For questions about spending categories or budget comparisons, include "[GENERATE_GRAPH:bar]" in your response

        Always explain what the graph shows and how it relates to their financial situation.

        Use this information to provide personalized financial insights, budget recommendations, and answer questions about the user's spending patterns. If the user asks about a specific category or time period not mentioned above, you can tell them you don't have that information.

        Always be helpful, supportive, and non-judgmental about the user's spending habits. Focus on providing actionable advice to help them improve their financial well-being.`
      );
      return;
    }

    // Calculate total spending
    const totalSpending = transactions.reduce((sum, tx) => sum + tx.amount, 0);

    // Calculate spending by category
    const spendingByCategory = transactions.reduce(
      (categories, tx) => {
        const category = tx.category.split(" > ")[0]; // Get top-level category
        if (!categories[category]) {
          categories[category] = 0;
        }
        categories[category] += tx.amount;
        return categories;
      },
      {} as Record<string, number>
    );

    // Sort categories by amount spent
    const sortedCategories = Object.entries(spendingByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Top 5 categories

    // Get recent transactions
    const recentTransactions = [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10); // Last 10 transactions

    // Format transaction data for the system prompt
    const transactionData = {
      totalSpending,
      topCategories: sortedCategories,
      recentTransactions: recentTransactions.map((tx) => ({
        date: tx.date,
        amount: tx.amount,
        category: tx.category,
        merchant: tx.vendor_name || "Unknown",
      })),
      budgets: {
        weekly: userData?.weeklyBudget || 500,
        biweekly: userData?.biweeklyBudget || 1000,
        monthly: userData?.monthlyBudget || 2000,
      },
    };

    // Create system prompt with transaction data
    const prompt = `You are Sage, a financial AI assistant. You help users understand their finances and make better financial decisions.

    Here is the user's financial data:

    Total Spending: $${totalSpending.toFixed(2)}

    Top Spending Categories:
    ${sortedCategories.map(([category, amount]) => `- ${category}: $${amount.toFixed(2)}`).join("\n")}

    Recent Transactions:
    ${recentTransactions.map((tx) => `- ${new Date(tx.date).toLocaleDateString()}: $${tx.amount.toFixed(2)} at ${tx.vendor_name || "Unknown"} (${tx.category})`).join("\n")}

    User's Budget Settings:
    - Weekly Budget: $${transactionData.budgets.weekly}
    - Bi-weekly Budget: $${transactionData.budgets.biweekly}
    - Monthly Budget: $${transactionData.budgets.monthly}

    Use this information to provide personalized financial insights, budget recommendations, and answer questions about the user's spending patterns. If the user asks about a specific category or time period not mentioned above, you can tell them you don't have that information.

    Always be helpful, supportive, and non-judgmental about the user's spending habits. Focus on providing actionable advice to help them improve their financial well-being.

    If the user asks for a graph or visualization, tell them you can generate a simple graph for them. When they ask for a specific graph (spending by category, spending over time, etc.), respond with a message that includes the text "[GENERATE_GRAPH:type]" where type is one of: bar, pie, or line. This will trigger the UI to display the appropriate graph.

    IMPORTANT: When users ask how their finances "look like" or request to "see" their spending, automatically generate an appropriate visualization:
    - For general questions about overall finances or spending patterns, include "[GENERATE_GRAPH:pie]" in your response
    - For questions about spending trends or changes over time, include "[GENERATE_GRAPH:line]" in your response
    - For questions about spending categories or budget comparisons, include "[GENERATE_GRAPH:bar]" in your response

    Always explain what the graph shows and how it relates to their financial situation.`;

    setSystemPrompt(prompt);
  }, [transactions, userData]);

  // Function to generate graph data based on transaction data
  const generateGraphData = (type: "bar" | "pie" | "line") => {
    if (!transactions || transactions.length === 0) {
      return null;
    }

    // Calculate spending by category for bar/pie chart
    if (type === "bar" || type === "pie") {
      const spendingByCategory = transactions.reduce(
        (categories, tx) => {
          const category = tx.category.split(" > ")[0]; // Get top-level category
          if (!categories[category]) {
            categories[category] = 0;
          }
          categories[category] += tx.amount;
          return categories;
        },
        {} as Record<string, number>
      );

      // Sort categories by amount spent and get top 5
      const sortedCategories = Object.entries(spendingByCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5); // Top 5 categories

      return {
        labels: sortedCategories.map(([category]) => category),
        datasets: [
          {
            label: "Spending by Category",
            data: sortedCategories.map(([_, amount]) => amount),
            backgroundColor: [
              "rgba(255, 99, 132, 0.6)",
              "rgba(54, 162, 235, 0.6)",
              "rgba(255, 206, 86, 0.6)",
              "rgba(75, 192, 192, 0.6)",
              "rgba(153, 102, 255, 0.6)",
            ],
            borderColor: [
              "rgba(255, 99, 132, 1)",
              "rgba(54, 162, 235, 1)",
              "rgba(255, 206, 86, 1)",
              "rgba(75, 192, 192, 1)",
              "rgba(153, 102, 255, 1)",
            ],
            borderWidth: 1,
          },
        ],
      };
    }

    // Calculate spending over time for line chart
    if (type === "line") {
      // Group transactions by date
      const spendingByDate = transactions.reduce(
        (dates, tx) => {
          const date = new Date(tx.date).toLocaleDateString();
          if (!dates[date]) {
            dates[date] = 0;
          }
          dates[date] += tx.amount;
          return dates;
        },
        {} as Record<string, number>
      );

      // Sort dates chronologically
      const sortedDates = Object.entries(spendingByDate)
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .slice(-10); // Last 10 days with transactions

      return {
        labels: sortedDates.map(([date]) => date),
        datasets: [
          {
            label: "Spending Over Time",
            data: sortedDates.map(([_, amount]) => amount),
            fill: false,
            backgroundColor: "rgba(75, 192, 192, 0.6)",
            borderColor: "rgba(75, 192, 192, 1)",
            tension: 0.1,
          },
        ],
      };
    }

    return null;
  };

  // Function to render chart
  const renderChart = () => {
    if (!canvasRef.current || !graphData) return;

    // Destroy previous chart instance if it exists
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    // Create new chart
    chartInstanceRef.current = new Chart(canvasRef.current, {
      type: graphType,
      data: graphData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: {
              color: document.documentElement.classList.contains("dark")
                ? "white"
                : "black",
            },
          },
          title: {
            display: true,
            text:
              graphType === "line"
                ? "Spending Over Time"
                : "Spending by Category",
            color: document.documentElement.classList.contains("dark")
              ? "white"
              : "black",
          },
        },
        scales:
          graphType !== "pie"
            ? {
                y: {
                  beginAtZero: true,
                  ticks: {
                    callback: (value) => `$${value}`,
                    color: document.documentElement.classList.contains("dark")
                      ? "white"
                      : "black",
                  },
                  grid: {
                    color: document.documentElement.classList.contains("dark")
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.1)",
                  },
                },
                x: {
                  ticks: {
                    color: document.documentElement.classList.contains("dark")
                      ? "white"
                      : "black",
                  },
                  grid: {
                    color: document.documentElement.classList.contains("dark")
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.1)",
                  },
                },
              }
            : undefined,
      },
    });
  };

  // Effect to render chart when graphData or graphType changes
  useEffect(() => {
    if (showGraph && graphData) {
      renderChart();
    }
  }, [showGraph, graphData, graphType]);

  // Create initial welcome message
  const initialMessages: Message[] = [
    {
      id: "welcome-message",
      role: "assistant",
      content:
        "Hi there! I'm Sage, your personal financial AI assistant. I can help you understand your spending patterns, provide budget recommendations, and answer questions about your finances. How can I help you today?",
      createdAt: new Date(),
    },
  ];

  const { messages, isLoading, input, handleInputChange, handleSubmit } =
    useChat({
      body: {
        model: "gemini:gemini-2.0-flash",
        temperature: 0.7,
        maxTokens: 4000,
        topP: 0.9,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        systemPrompt,
      },
      initialMessages,
    });

  // Chat scroll ref
  const scrollRef = useRef<HTMLDivElement>(null);

  // Autoscroll effect - only scroll when there's more than the initial message
  useEffect(() => {
    if (scrollRef.current && messages.length > 1) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Check for graph generation requests in messages
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant") {
        const content = lastMessage.content || "";
        const graphMatch = content.match(/\[GENERATE_GRAPH:(bar|pie|line)\]/i);

        if (graphMatch) {
          const requestedType = graphMatch[1] as "bar" | "pie" | "line";
          setGraphType(requestedType);
          const data = generateGraphData(requestedType);
          setGraphData(data);
          setShowGraph(true);
        }
      }
    }
  }, [messages]);

  const toggleReasoning = (index: number) => {
    setExpandedReasoning((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const components = {
    code({ node, inline, className, children, ...props }: CodeProps) {
      const match = /language-(\w+)/.exec(className || "");
      const language = match ? match[1] : "text";
      const code = String(children).replace(/\n$/, "");

      return !inline ? (
        <div className="relative rounded-lg overflow-hidden my-2">
          <div className="flex items-center justify-between px-4 py-2 bg-[#282C34] text-gray-200">
            <span className="text-xs font-medium">{language}</span>
            <button
              onClick={() => handleCopyCode(code)}
              className="hover:text-white transition-colors"
            >
              {copiedCode === code ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
          <SyntaxHighlighter
            style={oneDark}
            language={language}
            PreTag="div"
            className="!bg-[#1E1E1E] !m-0 !p-4 !rounded-b-lg"
          >
            {code}
          </SyntaxHighlighter>
        </div>
      ) : (
        <code
          className="bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5"
          {...props}
        >
          {children}
        </code>
      );
    },
  };

  return (
    <div className="flex flex-col h-screen dark:bg-black bg-white dark:text-white text-black">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-screen">
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-3xl mx-auto space-y-6">
            <AnimatePresence>
              {messages.map((message, index) => {
                const variant = message.role === "user" ? "sent" : "received";
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full flex"
                    style={{
                      justifyContent: message.role === "user" ? "flex-end" : "flex-start"
                    }}
                  >
                    <div className="max-w-[75%]">
                      <ChatBubble variant={variant}>
                        <ChatBubbleAvatar
                          src={
                            message.role === "user"
                              ? user?.image || undefined
                              : "/sage-logo.png"
                          }
                          fallback={
                            message.role === "user"
                              ? user?.name
                                  ?.split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase() || "U"
                              : "AI"
                          }
                        />
                        <div className="flex-1">
                          {message.reasoning && (
                            <div className="mb-2">
                              <button
                                onClick={() => toggleReasoning(index)}
                                className="w-full flex items-center justify-between px-3 py-2 bg-muted rounded-lg"
                              >
                                <span className="text-xs font-medium">
                                  Reasoning
                                </span>
                                {expandedReasoning.includes(index) ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </button>
                              {expandedReasoning.includes(index) && (
                                <div className="px-3 py-2 text-xs bg-muted rounded-lg mt-1">
                                  <ReactMarkdown components={components}>
                                    {message.reasoning}
                                  </ReactMarkdown>
                                </div>
                              )}
                            </div>
                          )}
                          {message.content && (
                            <ChatBubbleMessage variant={variant}>
                              <ReactMarkdown components={components}>
                                {message.content.replace(
                                  /\[GENERATE_GRAPH:(bar|pie|line)\]/i,
                                  ""
                                )}
                              </ReactMarkdown>
                            </ChatBubbleMessage>
                          )}
                        </div>
                      </ChatBubble>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Graph Section */}
            {showGraph && graphData && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.3 }}
                className="mb-4"
              >
                <Collapsible
                  open={showGraph}
                  onOpenChange={setShowGraph}
                  className="w-full dark:bg-zinc-900/50 bg-white rounded-lg border dark:border-zinc-800 border-zinc-200 overflow-hidden"
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4">
                    <div className="flex items-center gap-2">
                      <BarChart className="w-5 h-5" />
                      <span className="font-medium">
                        {graphType === "line"
                          ? "Spending Over Time"
                          : "Spending by Category"}
                      </span>
                    </div>
                    <ChevronUp className="w-4 h-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-4 h-[300px]">
                      <canvas ref={canvasRef} />
                    </div>
                    <div className="flex justify-between p-4 border-t dark:border-zinc-800 border-zinc-200">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setGraphType("bar");
                          const data = generateGraphData("bar");
                          setGraphData(data);
                        }}
                        className={
                          graphType === "bar"
                            ? "bg-primary text-primary-foreground"
                            : ""
                        }
                      >
                        Bar Chart
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setGraphType("pie");
                          const data = generateGraphData("pie");
                          setGraphData(data);
                        }}
                        className={
                          graphType === "pie"
                            ? "bg-primary text-primary-foreground"
                            : ""
                        }
                      >
                        Pie Chart
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setGraphType("line");
                          const data = generateGraphData("line");
                          setGraphData(data);
                        }}
                        className={
                          graphType === "line"
                            ? "bg-primary text-primary-foreground"
                            : ""
                        }
                      >
                        Line Chart
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </motion.div>
            )}

            {/* Loading indicator */}
            {isLoading &&
              messages[messages.length - 1]?.role !== "assistant" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full flex"
                  style={{ justifyContent: "flex-start" }}
                >
                  <div className="max-w-[75%]">
                    <ChatBubble variant="received">
                      <ChatBubbleAvatar src="/sage-logo.png" fallback="AI" />
                      <ChatBubbleMessage isLoading />
                    </ChatBubble>
                  </div>
                </motion.div>
              )}

            {/* Scroll anchor */}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="sticky bottom-0 p-4 border-t dark:border-zinc-800 border-zinc-200 bg-background">
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <Textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Ask Sage about your finances..."
                className="min-h-[60px] lg:min-h-[80px] bg-transparent dark:bg-zinc-900/50 bg-white border dark:border-zinc-800 border-zinc-200 focus:border-zinc-400 dark:focus:border-zinc-600"
              />
              <div className="absolute bottom-3 right-3">
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isLoading || !input.trim()}
                  className="h-8 bg-white dark:bg-transparent hover:bg-zinc-200 dark:hover:bg-zinc-800 text-black dark:text-white"
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
