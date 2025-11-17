'use client';

import { useSession } from "@/lib/auth-client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Link } from "lucide-react";

export default function ConnectPlaidBanner() {
  const { data: session } = useSession();
  const user = session?.user;
  const isLoaded = true;
  const userId = user?.id || "";
  
  // Get the current user from the database
  const userData = useQuery(api.users.getUserById, { userId });

  // If user data is loading or the user has an accountId, don't show the banner
  if (!isLoaded || !userData || userData.accountId) {
    return null;
  }

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Connect Your Bank Account</CardTitle>
        <CardDescription>
          Link your bank account to see real-time transaction data and get personalized financial insights.
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex flex-col space-y-2">
          <div className="flex items-start space-x-2">
            <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">1</div>
            <div className="flex-1">
              <p className="text-sm font-medium">Secure Connection</p>
              <p className="text-xs text-muted-foreground">We use Plaid to securely connect to your bank. Your credentials are never stored on our servers.</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">2</div>
            <div className="flex-1">
              <p className="text-sm font-medium">Personalized Insights</p>
              <p className="text-xs text-muted-foreground">Get AI-powered insights about your spending habits, budget recommendations, and savings opportunities.</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">3</div>
            <div className="flex-1">
              <p className="text-sm font-medium">Real-time Updates</p>
              <p className="text-xs text-muted-foreground">See your transactions as they happen and track your progress toward financial goals.</p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full sm:w-auto" onClick={() => alert("This would open the Plaid connection flow in a real app")}>
          Connect Bank Account <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
