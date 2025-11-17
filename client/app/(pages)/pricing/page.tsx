"use client";

import { useState } from "react";
import { ArrowRight, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import NavBar from "@/components/wrapper/navbar";
import Footer from "@/components/footer";
import { AccordionComponent } from "@/components/homepage/accordion-component";

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);

  const plans = [
    {
      id: "starter",
      name: "Starter",
      description: "Perfect for personal finance tracking",
      monthlyPrice: "$49",
      yearlyPrice: "$39",
      features: [
        { text: "Track all transactions" },
        { text: "Secure Google sign-in" },
        { text: "Real-time sync" },
        { text: "Budget tracking" },
        { text: "Spending insights" },
      ],
      button: {
        text: "Get Started",
        url: "https://21st.dev",
      },
    },
    {
      id: "professional",
      name: "Professional",
      description: "AI-powered financial insights",
      monthlyPrice: "$99",
      yearlyPrice: "$79",
      features: [
        { text: "Everything in Starter" },
        { text: "AI financial assistant" },
        { text: "Spending predictions" },
        { text: "Fraud detection" },
        { text: "Email alerts" },
        { text: "Advanced analytics" },
      ],
      button: {
        text: "Get Started",
        url: "https://21st.dev",
      },
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: "For teams and organizations",
      monthlyPrice: "Custom",
      yearlyPrice: "Custom",
      features: [
        { text: "Everything in Professional" },
        { text: "Custom AI model integration" },
        { text: "Team collaboration" },
        { text: "Dedicated support" },
        { text: "Custom features" },
        { text: "SLA guarantee" },
      ],
      button: {
        text: "Contact Sales",
        url: "https://21st.dev",
      },
    },
  ];

  return (
    <>
      <NavBar />
      <section className="pt-48 pb-24 md:pb-32">
        <div className="container">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">
            <h2 className="text-pretty text-4xl font-bold lg:text-6xl">Plans & Pricing</h2>
            <p className="text-muted-foreground lg:text-xl">Choose the plan that matches your workflow and scale with ease.</p>

            <div className="inline-flex items-center rounded-full p-1 bg-muted">
              <button
                aria-pressed={!isYearly}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-colors ${
                  !isYearly ? "bg-background shadow-sm" : ""
                }`}
                onClick={() => setIsYearly(false)}
              >
                Monthly
              </button>
              <button
                aria-pressed={isYearly}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-colors ${
                  isYearly ? "bg-background shadow-sm" : ""
                }`}
                onClick={() => setIsYearly(true)}
              >
                Yearly
              </button>
            </div>

            <div className="mt-8 flex flex-col items-stretch gap-6 md:flex-row">
              {plans.map((plan, i) => (
                <Card
                  key={plan.id}
                  className={`flex w-80 flex-col justify-between text-left ${
                    i === 1 ? "md:scale-105 border-primary" : ""
                  }`}
                >
                  <CardHeader>
                    <CardTitle>
                      <p>{plan.name}</p>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                    <span className="text-4xl font-bold">
                      {isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                    </span>
                    <p className="text-muted-foreground text-sm">
                      {plan.monthlyPrice === "Custom" || plan.yearlyPrice === "Custom"
                        ? "Custom pricing"
                        : isYearly
                          ? `/month, billed $${Number(plan.yearlyPrice.slice(1)) * 12} annually`
                          : "/month"}
                    </p>
                  </CardHeader>

                  <CardContent>
                    <Separator className="mb-6" />
                    <ul className="space-y-4">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <CircleCheck className="size-4 text-muted-foreground" />
                          <span>{feature.text}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter className="mt-auto">
                    <Button
                      asChild
                      className="w-full"
                    >
                      <a href={plan.button.url} target="_blank" rel="noreferrer">
                        {plan.button.text}
                        <ArrowRight className="ml-2 size-4" />
                      </a>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>
      <div className="py-20 px-4">
        <AccordionComponent />
      </div>
      <Footer />
    </>
  );
}
