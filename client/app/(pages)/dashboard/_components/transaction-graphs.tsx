"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useSession } from "@/lib/auth-client"
import { format, parseISO, subDays, eachDayOfInterval, addDays } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { formatCategory } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-mobile"

// Default budget constants - will be overridden by user settings if available
const DEFAULT_WEEKLY_BUDGET = 500
const DEFAULT_BIWEEKLY_BUDGET = 1000
const DEFAULT_MONTHLY_BUDGET = 2000

type Transaction = {
  _id: Id<"transactions">
  _creationTime: number
  transaction_id: number
  account_id: string
  amount: number
  date: string
  category: string
  time?: string
  activity?: string
  type?: string
  vendor_name?: string
  userId?: string
}

type DailySpending = {
  date: string
  formattedDate: string
  amount: number
  cumulative: number
  category?: string
  isPredicted?: boolean
}

type PredictedData = {
  predictedTransactions: any[]
  predictedDailyData: DailySpending[]
}

type TimeRange = "weekly" | "biweekly" | "monthly"
type GraphType = "daily" | "cumulative"

export default function TransactionGraphs() {
  const { data: session } = useSession()
  const user = session?.user
  const userId = user?.id || ""
  const isMobile = useMediaQuery("(max-width: 640px)")

  // Get user data to access budget settings and accountId
  const userData = useQuery(api.users.getUserById, { userId })

  // Get transactions for the user's account
  // We use getTransactionsByUser which handles the accountId lookup internally
  const transactions = useQuery(api.transactions.getTransactionsByUser, { userId })

  const [timeRange, setTimeRange] = useState<TimeRange>("weekly")
  const [graphType, setGraphType] = useState<GraphType>("daily")
  const [showPredictions, setShowPredictions] = useState(false)
  const [isPredicting, setIsPredicting] = useState(false)
  const [predictedData, setPredictedData] = useState<{
    predictedTransactions: any[]
    predictedDailyData: DailySpending[]
  } | null>(null)

  // Initialize with empty arrays
  const [weeklyData, setWeeklyData] = useState<DailySpending[]>([])
  const [biWeeklyData, setBiWeeklyData] = useState<DailySpending[]>([])
  const [monthlyData, setMonthlyData] = useState<DailySpending[]>([])

  // Calculated totals
  const [weeklyTotal, setWeeklyTotal] = useState<number>(0)
  const [biWeeklyTotal, setBiWeeklyTotal] = useState<number>(0)
  const [monthlyTotal, setMonthlyTotal] = useState<number>(0)

  // Reset predictions when time range changes
  useEffect(() => {
    if (showPredictions) {
      setShowPredictions(false)
      setPredictedData({ predictedTransactions: [], predictedDailyData: [] })
    }
  }, [timeRange])

  useEffect(() => {
    if (!transactions || transactions.length === 0) {
      return
    }

    // Get budget values from user data or use defaults
    const weeklyBudget = userData?.weeklyBudget || DEFAULT_WEEKLY_BUDGET
    const biweeklyBudget = userData?.biweeklyBudget || DEFAULT_BIWEEKLY_BUDGET
    const monthlyBudget = userData?.monthlyBudget || DEFAULT_MONTHLY_BUDGET

    // Process transactions into daily data with running totals
    const processTransactionData = (
      transactions: Transaction[],
      startDate: Date,
      endDate: Date,
      budget: number | undefined,
      days: number
    ) => {
      const dailyData: DailySpending[] = []
      let cumulativeAmount = 0

      // Create a map of dates to transaction amounts
      const dateToAmounts = new Map<string, number>()
      transactions.forEach((tx) => {
        const dateStr = tx.date
        const amount = tx.category === "income" ? -tx.amount : tx.amount // Treat income as negative expense
        dateToAmounts.set(dateStr, (dateToAmounts.get(dateStr) || 0) + amount)
      })

      // Fill in all dates in the range
      let currentDate = startDate
      while (currentDate <= endDate) {
        const dateStr = format(currentDate, "yyyy-MM-dd")
        const formattedDate = format(currentDate, "MMM dd")
        const dailyAmount = dateToAmounts.get(dateStr) || 0
        cumulativeAmount += dailyAmount

        dailyData.push({
          date: dateStr,
          formattedDate,
          amount: dailyAmount,
          cumulative: cumulativeAmount,
        })

        currentDate = addDays(currentDate, 1)
      }

      return dailyData
    }

    // Calculate totals excluding income
    const calculateTotal = (transactions: Transaction[]) => {
      return transactions.reduce((sum, tx) => {
        if (tx.category === "income") return sum
        return sum + tx.amount
      }, 0)
    }

    // Process data for each time period using the user's budget values
    const now = new Date()
    const weekStart = subDays(now, 7)
    const biWeekStart = subDays(now, 14)
    const monthStart = subDays(now, 30)

    // Filter transactions for each time period (excluding income)
    const weeklyTransactions = transactions.filter((tx) => {
      try {
        const txDate = new Date(tx.date)
        return txDate >= weekStart && txDate <= now && tx.category !== "income"
      } catch (e) {
        console.error("Error parsing date:", tx.date, e)
        return false
      }
    })

    const biWeeklyTransactions = transactions.filter((tx) => {
      try {
        const txDate = new Date(tx.date)
        return txDate >= biWeekStart && txDate <= now && tx.category !== "income"
      } catch (e) {
        console.error("Error parsing date:", tx.date, e)
        return false
      }
    })

    const monthlyTransactions = transactions.filter((tx) => {
      try {
        const txDate = new Date(tx.date)
        return txDate >= monthStart && txDate <= now && tx.category !== "income"
      } catch (e) {
        console.error("Error parsing date:", tx.date, e)
        return false
      }
    })

    // Process data for each time period using the user's budget values
    const weeklyByDate = processTransactionData(weeklyTransactions, weekStart, now, weeklyBudget, 7)
    const biWeeklyByDate = processTransactionData(biWeeklyTransactions, biWeekStart, now, biweeklyBudget, 14)
    const monthlyByDate = processTransactionData(monthlyTransactions, monthStart, now, monthlyBudget, 30)

    // Calculate totals excluding income
    const weeklySum = calculateTotal(weeklyTransactions)
    const biWeeklySum = calculateTotal(biWeeklyTransactions)
    const monthlySum = calculateTotal(monthlyTransactions)

    // Update state with actual data
    setWeeklyData(weeklyByDate)
    setWeeklyTotal(weeklySum)

    setBiWeeklyData(biWeeklyByDate)
    setBiWeeklyTotal(biWeeklySum)

    setMonthlyData(monthlyByDate)
    setMonthlyTotal(monthlySum)
  }, [transactions, userData])

  // Function to generate sample predicted data
  // In a real implementation, this would be an API call to localhost:8000
  const fetchPredictions = async () => {
    setIsPredicting(true)

    try {
      // Get the current data to find the last date and cumulative amount
      const currentData = getData()
      const lastActualData = currentData[currentData.length - 1]
      const lastDate = lastActualData ? new Date(lastActualData.date) : new Date()
      let cumulativeAmount = lastActualData ? lastActualData.cumulative : 0

      // Calculate the end date based on timeRange
      let endDate = new Date(lastDate)
      switch (timeRange) {
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

      const response = await fetch('http://localhost:8000/api/oracle/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          time_range: `${format(lastDate, 'yyyy-MM-dd')}_to_${format(endDate, 'yyyy-MM-dd')}`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch predictions')
      }

      const data = await response.json()
      const predictedDailyData: DailySpending[] = []

      // Sort dates to ensure chronological order
      const dates = Object.keys(data.predictions).sort()
      
      dates.forEach(dateStr => {
        const date = new Date(dateStr)
        // Only include predictions for dates after the last actual transaction
        if (date > lastDate) {
          // Handle both old format (number) and new format (object with amount)
          const prediction = data.predictions[dateStr]
          const amount = typeof prediction === 'number' ? prediction : prediction.amount
          cumulativeAmount += amount

          predictedDailyData.push({
            date: format(date, "yyyy-MM-dd"),
            formattedDate: format(date, "MMM dd"),
            amount: amount,
            cumulative: cumulativeAmount,
            isPredicted: true
          })
        }
      })

      setPredictedData({
        predictedTransactions: [], // We don't need individual transactions
        predictedDailyData
      })
      setShowPredictions(true)
    } catch (error) {
      console.error('Error fetching predictions:', error)
    } finally {
      setIsPredicting(false)
    }
  }

  // Toggle predictions on/off
  const togglePredictions = () => {
    if (showPredictions) {
      // Hide predictions
      setShowPredictions(false)
    } else {
      // Show predictions
      fetchPredictions()
    }
  }

  // Get the appropriate budget based on selected time range
  const getBudget = () => {
    // Use user's budget values if available, otherwise use defaults
    const weeklyBudget = userData?.weeklyBudget || DEFAULT_WEEKLY_BUDGET
    const biweeklyBudget = userData?.biweeklyBudget || DEFAULT_BIWEEKLY_BUDGET
    const monthlyBudget = userData?.monthlyBudget || DEFAULT_MONTHLY_BUDGET

    switch (timeRange) {
      case "weekly":
        return weeklyBudget
      case "biweekly":
        return biweeklyBudget
      case "monthly":
        return monthlyBudget
      default:
        return weeklyBudget
    }
  }

  // Get the total spending based on selected time range
  const getTotal = () => {
    switch (timeRange) {
      case "weekly":
        return weeklyTotal
      case "biweekly":
        return biWeeklyTotal
      case "monthly":
        return monthlyTotal
      default:
        return weeklyTotal
    }
  }

  // Calculate budget progress percentage
  const getBudgetPercentage = () => {
    const total = getTotal()
    const budget = getBudget()
    return Math.min(Math.round((total / budget) * 100), 100)
  }

  // Get title based on selections
  const getTitle = () => {
    const timeRangeTitle = timeRange.charAt(0).toUpperCase() + timeRange.slice(1)
    const graphTypeTitle = graphType.charAt(0).toUpperCase() + graphType.slice(1)
    return `${timeRangeTitle} ${graphTypeTitle} Spending`
  }

  // Get the appropriate data based on selected time range
  const getData = () => {
    let data: DailySpending[] = []

    switch (timeRange) {
      case "weekly":
        data = weeklyData
        break
      case "biweekly":
        data = biWeeklyData
        break
      case "monthly":
        data = monthlyData
        break
      default:
        data = weeklyData
    }

    // If predictions are enabled and we have predicted data, append it
    if (showPredictions && predictedData?.predictedDailyData) {
      // Get the last date from our actual data
      const lastDate = data.length > 0 ? new Date(data[data.length - 1].date) : new Date()

      // Filter predicted data to only include dates after our last actual date
      const filteredPredictions = predictedData.predictedDailyData.filter((item) => {
        const predDate = new Date(item.date)
        return predDate > lastDate
      })

      // If we're showing cumulative data, adjust the cumulative values to continue from our last actual value
      if (graphType === "cumulative" && data.length > 0 && filteredPredictions.length > 0) {
        const lastCumulative = data[data.length - 1].cumulative

        // Adjust each prediction's cumulative value
        filteredPredictions.forEach((item, index) => {
          if (index === 0) {
            item.cumulative = lastCumulative + (item.category === "income" ? -item.amount : item.amount)
          } else {
            item.cumulative = filteredPredictions[index - 1].cumulative + 
              (item.category === "income" ? -item.amount : item.amount)
          }
        })
      }

      // Combine actual and predicted data
      return [...data, ...filteredPredictions]
    }

    return data
  }

  const currentData = getData()

  // Custom tooltip formatter
  const formatTooltip = (value: number, name: string, props: any) => {
    // Check if value is valid
    if (value === null || value === undefined || typeof value !== 'number') {
      return ['$0.00', name]
    }
    // Check if this is a predicted value
    const isPredicted = props.payload && props.payload.isPredicted
    const label = isPredicted ? `${name} (Predicted)` : name
    return [`$${value.toFixed(2)}`, label]
  }

  // Render bar chart using Recharts
  const renderBarChart = () => {
    if (currentData.length === 0) {
      return (
        <div className="flex flex-col h-[300px] items-center justify-center">
          <p className="text-muted-foreground">No data available for this period</p>
        </div>
      )
    }

    // Show all data points
    const displayData = currentData

    return (
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={displayData} margin={{ top: 10, right: 10, left: isMobile ? -15 : 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="formattedDate"
            tick={{ fontSize: isMobile ? 10 : 12 }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={isMobile ? 50 : 40}
          />
          <YAxis
            tickFormatter={(value) => `$${value}`}
            tick={{ fontSize: isMobile ? 10 : 12 }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
            width={isMobile ? 40 : 60} // Narrower on mobile
          />
          <Tooltip formatter={formatTooltip} />
          <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  // Render line chart using Recharts
  const renderLineChart = () => {
    const data = getData()

    // Use either actual data or predictions, not both
    const chartData = showPredictions && predictedData?.predictedDailyData 
      ? predictedData.predictedDailyData 
      : data

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="formattedDate"
            interval={0}
            width={isMobile ? 40 : 60}
          />
          <YAxis />
          <Tooltip formatter={formatTooltip} />
          <Line
            type="monotone"
            dataKey="cumulative"
            name={showPredictions ? "Predicted Spending" : "Actual Spending"}
            stroke={showPredictions ? "#3b82f6" : "currentColor"}
            strokeWidth={2}
            dot={isMobile ? false : { 
              r: 3, 
              fill: showPredictions ? "#3b82f6" : "currentColor", 
              stroke: "#fff", 
              strokeWidth: 1 
            }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className={`flex ${isMobile ? "flex-col" : "flex-row"} items-center justify-between pb-2`}>
          <CardTitle className="text-base font-medium mb-2">{getTitle()}</CardTitle>
          <div className={`flex ${isMobile ? "flex-col w-full" : "flex-row"} items-center gap-2`}>
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
              <SelectTrigger className={`h-8 ${isMobile ? "w-full" : "w-[120px]"} text-xs`}>
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <div className={`flex ${isMobile ? "w-full" : ""} gap-2`}>
              <Tabs
                value={graphType}
                onValueChange={(value) => setGraphType(value as GraphType)}
                className={isMobile ? "flex-1" : ""}
              >
                <TabsList className={`h-8 ${isMobile ? "w-full" : ""}`}>
                  <TabsTrigger value="daily" className="text-xs flex-1">
                    Daily
                  </TabsTrigger>
                  <TabsTrigger value="cumulative" className="text-xs flex-1">
                    Cumulative
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                variant={showPredictions ? "default" : "outline"}
                size="sm"
                onClick={togglePredictions}
                disabled={isPredicting}
                className={`h-8 text-xs ${isMobile ? "flex-1" : ""}`}
              >
                {isPredicting ? "Loading..." : showPredictions ? "Hide" : "Predict"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-2">
          <div className="space-y-4">
            {/* Budget Progress */}
            <div className="space-y-1 px-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium">Budget Progress</span>
                <span className="text-muted-foreground">
                  ${getTotal().toFixed(2)} of ${getBudget().toFixed(2)}
                </span>
              </div>
              <Progress value={getBudgetPercentage()} className="h-1.5" />
              <p className="text-xs text-muted-foreground">
                {getBudgetPercentage()}% of {timeRange} budget used
              </p>
            </div>

            {/* Chart */}
            <div className="px-2">{graphType === "daily" ? renderBarChart() : renderLineChart()}</div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-2 px-2">
              <div className="bg-muted p-2 rounded-md">
                <h4 className="text-xs font-medium">Total</h4>
                <p className={`${isMobile ? "text-sm" : "text-base"} font-bold`}>${getTotal().toFixed(2)}</p>
              </div>
              <div className="bg-muted p-2 rounded-md">
                <h4 className="text-xs font-medium">Daily Avg</h4>
                <p className={`${isMobile ? "text-sm" : "text-base"} font-bold`}>
                  ${(getTotal() / (currentData.length || 1)).toFixed(2)}
                </p>
              </div>
              <div className="bg-muted p-2 rounded-md">
                <h4 className="text-xs font-medium">Remaining</h4>
                <p className={`${isMobile ? "text-sm" : "text-base"} font-bold`}>
                  ${Math.max(getBudget() - getTotal(), 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
