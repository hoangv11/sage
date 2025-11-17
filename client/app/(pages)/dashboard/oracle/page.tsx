"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useSession } from "@/lib/auth-client"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { format } from "date-fns"

// Categories that can be used in the what-if scenarios
const CATEGORIES = [
  "food_and_drink",
  "travel",
  "shopping",
  "entertainment",
  "auto",
  "business",
  "healthcare",
  "education",
  "other",
] as const

type Category = (typeof CATEGORIES)[number]

interface Scenario {
  skip_expense: {
    category: Category
    active: boolean
  }
  new_expense: {
    category: Category
    active: boolean
    amount: number
  }
  reduce_expense: {
    category: Category
    active: boolean
    amount: number
  }
}

interface WhatIfResponse {
  predicted_without_params: Array<{
    amount: number
    date: string
    category: string
  }>
  predicted_with_params: Array<{
    amount: number
    date: string
    category: string
  }>
  predictions_without_param: {
    [date: string]: number
  }
  predictions_with_param: {
    [date: string]: number
  }
}

type TimePeriod = "weekly" | "biweekly" | "monthly"

export default function Oracle() {
  const { data: session } = useSession()
  const user = session?.user
  const userId = user?.id || ""
  const transactions = useQuery(api.transactions.getTransactionsByUser, { userId })

  const [loading, setLoading] = useState(false)
  const [prediction, setPrediction] = useState<WhatIfResponse | null>(null)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("monthly")
  const [isDarkTheme, setIsDarkTheme] = useState(false)
  const [scenario, setScenario] = useState<Scenario>({
    skip_expense: {
      category: "food_and_drink",
      active: false,
    },
    new_expense: {
      category: "business",
      active: false,
      amount: 100,
    },
    reduce_expense: {
      category: "auto",
      active: false,
      amount: 100,
    },
  })

  // Calculate average monthly spending for percentage conversion
  const calculateAverageMonthlySpending = (category: string) => {
    if (!transactions) return 0
    const categoryTransactions = transactions.filter(t => t.category === category)
    if (categoryTransactions.length === 0) return 0
    
    const totalSpending = categoryTransactions.reduce((sum, t) => sum + t.amount, 0)
    return totalSpending / (categoryTransactions.length / 30) // Assuming transactions span multiple months
  }

  const fetchPrediction = async () => {
    setLoading(true)
    try {
      // Get account_id from transactions
      if (!transactions || transactions.length === 0) {
        throw new Error('No transactions found. Please import transactions first.')
      }
      const accountId = transactions[0].account_id

      // Calculate date range
      const startDate = new Date()
      const endDate = new Date()
      switch (timePeriod) {
        case "weekly":
          endDate.setDate(endDate.getDate() + 7)
          break
        case "biweekly":
          endDate.setDate(endDate.getDate() + 14)
          break
        case "monthly":
          endDate.setDate(endDate.getDate() + 30)
          break
      }

      // Convert dollar amounts to percentages based on average spending
      const newExpenseAvg = calculateAverageMonthlySpending(scenario.new_expense.category)
      const reduceExpenseAvg = calculateAverageMonthlySpending(scenario.reduce_expense.category)

      const response = await fetch('http://localhost:8000/api/oracle/predict_params', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: accountId,
          time_range: `${format(startDate, 'yyyy-MM-dd')}_to_${format(endDate, 'yyyy-MM-dd')}`,
          scenario: {
            skip_expense: {
              category: scenario.skip_expense.category,
              active: scenario.skip_expense.active
            },
            new_expense: {
              category: scenario.new_expense.category,
              active: scenario.new_expense.active,
              percent: newExpenseAvg > 0 ? scenario.new_expense.amount / newExpenseAvg : 0.2 // Default to 20% if no history
            },
            reduce_expense: {
              category: scenario.reduce_expense.category,
              active: scenario.reduce_expense.active,
              percent: reduceExpenseAvg > 0 ? scenario.reduce_expense.amount / reduceExpenseAvg : 0.2 // Default to 20% if no history
            }
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch predictions')
      }

      const data = await response.json()
      console.log(data)
      setPrediction(data)
    } catch (error) {
      console.error('Error fetching predictions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = () => {
    fetchPrediction()
  }

  // Detect theme changes
  useEffect(() => {
    // Check if document is available (client-side)
    if (typeof document !== "undefined") {
      // Initial check
      setIsDarkTheme(document.documentElement.classList.contains("dark"))

      // Create observer to watch for class changes on html element
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === "class") {
            setIsDarkTheme(document.documentElement.classList.contains("dark"))
          }
        })
      })

      // Start observing
      observer.observe(document.documentElement, { attributes: true })

      // Cleanup
      return () => observer.disconnect()
    }
  }, [])

  // Prepare chart data
  const chartData = prediction
    ? Object.keys(prediction.predictions_without_param).map((date) => ({
        date: format(new Date(date), "MMM dd"), // Format date for display
        baseline: prediction.predictions_without_param[date],
        modified: prediction.predictions_with_param[date],
      }))
    : []

  // Calculate potential savings
  const totalSavings = prediction
    ? Object.keys(prediction.predictions_without_param).reduce(
        (sum, date) =>
          sum +
          (prediction.predictions_without_param[date] -
            prediction.predictions_with_param[date]),
        0
      )
    : 0

  // Calculate average daily spending for both scenarios
  const avgBaselineSpending = prediction
    ? Object.values(prediction.predictions_without_param).reduce(
        (sum: number, val: number) => sum + val,
        0
      ) / Object.keys(prediction.predictions_without_param).length
    : 0

  const avgModifiedSpending = prediction
    ? Object.values(prediction.predictions_with_param).reduce(
        (sum: number, val: number) => sum + val,
        0
      ) / Object.keys(prediction.predictions_with_param).length
    : 0

  // Determine baseline color based on theme
  const baselineColor = isDarkTheme ? "#FFFFFF" : "#000000"

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Oracle</CardTitle>
          <CardDescription>
            Simulate different spending scenarios to see how they might affect your future finances.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Time Period Section */}
            <div className="space-y-4">
              <Label>Time Period</Label>
              <Select value={timePeriod} onValueChange={(value: TimePeriod) => setTimePeriod(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Skip Expense Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="skip-expense">Skip Expense Category</Label>
                <Switch
                  id="skip-active"
                  checked={scenario.skip_expense.active}
                  onCheckedChange={(checked) =>
                    setScenario((prev) => ({
                      ...prev,
                      skip_expense: { ...prev.skip_expense, active: checked },
                    }))
                  }
                />
              </div>
              <Select
                disabled={!scenario.skip_expense.active}
                value={scenario.skip_expense.category}
                onValueChange={(value: Category) =>
                  setScenario((prev) => ({
                    ...prev,
                    skip_expense: { ...prev.skip_expense, category: value },
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* New Expense Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="new-expense">New Expense Category</Label>
                <Switch
                  id="new-active"
                  checked={scenario.new_expense.active}
                  onCheckedChange={(checked) =>
                    setScenario((prev) => ({
                      ...prev,
                      new_expense: { ...prev.new_expense, active: checked },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Select
                  disabled={!scenario.new_expense.active}
                  value={scenario.new_expense.category}
                  onValueChange={(value: Category) =>
                    setScenario((prev) => ({
                      ...prev,
                      new_expense: { ...prev.new_expense, category: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    disabled={!scenario.new_expense.active}
                    value={scenario.new_expense.amount}
                    onChange={(e) =>
                      setScenario((prev) => ({
                        ...prev,
                        new_expense: {
                          ...prev.new_expense,
                          amount: Number.parseFloat(e.target.value) || 0,
                        },
                      }))
                    }
                    min="0"
                  />
                  <span>$</span>
                </div>
              </div>
            </div>

            {/* Reduce Expense Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="reduce-expense">Reduce Expense Category</Label>
                <Switch
                  id="reduce-active"
                  checked={scenario.reduce_expense.active}
                  onCheckedChange={(checked) =>
                    setScenario((prev) => ({
                      ...prev,
                      reduce_expense: { ...prev.reduce_expense, active: checked },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Select
                  disabled={!scenario.reduce_expense.active}
                  value={scenario.reduce_expense.category}
                  onValueChange={(value: Category) =>
                    setScenario((prev) => ({
                      ...prev,
                      reduce_expense: { ...prev.reduce_expense, category: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    disabled={!scenario.reduce_expense.active}
                    value={scenario.reduce_expense.amount}
                    onChange={(e) =>
                      setScenario((prev) => ({
                        ...prev,
                        reduce_expense: {
                          ...prev.reduce_expense,
                          amount: Number.parseFloat(e.target.value) || 0,
                        },
                      }))
                    }
                    min="0"
                  />
                  <span>$</span>
                </div>
              </div>
            </div>

            <Button onClick={handleSubmit} disabled={loading || !transactions?.[0]?.account_id} className="w-full">
              {loading ? "Calculating..." : "Calculate Prediction"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Chart */}
      {prediction && (
        <Card>
          <CardHeader>
            <CardTitle>Prediction Results</CardTitle>
            <CardDescription>
              {totalSavings > 0 
                ? `Your changes could save you $${totalSavings.toFixed(2)} over this period!` 
                : "Compare your baseline spending forecast with the modified scenario"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Average Daily Spending (Baseline)</div>
                  <div className="text-2xl font-bold">${avgBaselineSpending.toFixed(2)}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Average Daily Spending (Modified)</div>
                  <div className="text-2xl font-bold text-amber-500">${avgModifiedSpending.toFixed(2)}</div>
                </div>
              </div>
            </div>
            <div className="h-[400px] relative">
              {/* Enhanced gold glowing effect */}
              <style jsx>{`
                @keyframes vibrate {
                  0% { 
                    transform: translate(0, 0);
                    filter: drop-shadow(0 0 8px rgba(255, 204, 0, 0.8)) drop-shadow(0 0 16px rgba(255, 204, 0, 0.4));
                  }
                  25% { 
                    transform: translate(1px, 1px);
                    filter: drop-shadow(0 0 12px rgba(255, 204, 0, 0.9)) drop-shadow(0 0 20px rgba(255, 204, 0, 0.5));
                  }
                  50% { 
                    transform: translate(0, -1px);
                    filter: drop-shadow(0 0 16px rgba(255, 204, 0, 1)) drop-shadow(0 0 24px rgba(255, 204, 0, 0.6));
                  }
                  75% { 
                    transform: translate(-1px, 1px);
                    filter: drop-shadow(0 0 12px rgba(255, 204, 0, 0.9)) drop-shadow(0 0 20px rgba(255, 204, 0, 0.5));
                  }
                  100% { 
                    transform: translate(0, 0);
                    filter: drop-shadow(0 0 8px rgba(255, 204, 0, 0.8)) drop-shadow(0 0 16px rgba(255, 204, 0, 0.4));
                  }
                }

                .glow-effect {
                  animation: vibrate 1.5s ease-in-out infinite;
                  filter: drop-shadow(0 0 10px rgba(255, 204, 0, 0.8)) drop-shadow(0 0 20px rgba(255, 204, 0, 0.5));
                }

                /* Add this to make the SVG glow work better in all browsers */
                .recharts-layer.recharts-line-chart {
                  filter: none !important;
                }
              `}</style>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      border: "1px solid #ccc",
                      borderRadius: "8px",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="baseline"
                    stroke={baselineColor}
                    name="Baseline Forecast"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    className="glow-effect"
                    type="monotone"
                    dataKey="modified"
                    stroke="#FFCC00" // Lighter gold color
                    name="Modified Forecast"
                    strokeWidth={3}
                    dot={{
                      r: 6,
                      fill: "#FFCC00", // Lighter gold for dots
                      stroke: "#FFCC00",
                      strokeWidth: 2,
                    }}
                    activeDot={{
                      r: 10,
                      fill: "#FFCC00", // Lighter gold for active dot
                      stroke: "#fff", // White border for active dot
                      strokeWidth: 3,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
