"use client";

import { useEffect, useRef, useState } from "react";
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

interface PricingFeature {
  text: string;
}
interface PricingPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  features: PricingFeature[];
  button: {
    text: string;
    url: string;
  };
}
interface Pricing2Props {
  heading?: string;
  description?: string;
  plans?: PricingPlan[];
}

const Pricing2 = ({
  heading = "Plans & Pricing",
  description = "Choose the plan that matches your workflow and scale with ease.",
  plans = [
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
  ],
}: Pricing2Props) => {
  const [isYearly, setIsYearly] = useState(false);

  // --- minimal hero particles ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const setSize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect?.width ?? window.innerWidth));
      const h = Math.max(1, Math.floor(rect?.height ?? window.innerHeight));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    setSize();

    type P = { x: number; y: number; v: number; o: number };
    let parts: P[] = [];
    let raf = 0;

    const make = (): P => ({
      x: Math.random() * (canvas.width / (window.devicePixelRatio || 1)),
      y: Math.random() * (canvas.height / (window.devicePixelRatio || 1)),
      v: Math.random() * 0.25 + 0.05,
      o: Math.random() * 0.35 + 0.15,
    });

    const init = () => {
      parts = [];
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      const count = Math.floor((w * h) / 12000);
      for (let i = 0; i < count; i++) parts.push(make());
    };

    const draw = () => {
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, w, h);
      parts.forEach((p) => {
        p.y -= p.v;
        if (p.y < 0) {
          p.x = Math.random() * w;
          p.y = h + Math.random() * 40;
          p.v = Math.random() * 0.25 + 0.05;
          p.o = Math.random() * 0.35 + 0.15;
        }
        ctx.fillStyle = `rgba(250,250,250,${p.o})`;
        ctx.fillRect(p.x, p.y, 0.7, 2.2);
      });
      raf = requestAnimationFrame(draw);
    };

    const onResize = () => {
      setSize();
      init();
    };

    const ro = new ResizeObserver(onResize);
    ro.observe(canvas.parentElement || document.body);

    init();
    raf = requestAnimationFrame(draw);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      data-locked
      className="relative w-full min-h-screen py-24 md:py-32 bg-zinc-950 text-zinc-50 overflow-hidden isolate"
    >
      <style>{`
        :where(html, body, #__next){
          margin:0; min-height:100%;
          background:#0b0b0c; color:#f6f7f8; color-scheme:dark;
          overflow-x:hidden; scrollbar-gutter:stable both-edges;
        }
        html{ background:#0b0b0c }
        section[data-locked]{ color:#f6f7f8; color-scheme:dark }
        .card-animate{opacity:0;transform:translateY(12px);animation:fadeUp .6s ease .25s forwards}
        @keyframes fadeUp{to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Subtle vignette */}
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(80%_60%_at_50%_15%,rgba(255,255,255,0.06),transparent_60%)]" />

      {/* Particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-70 pointer-events-none"
      />

      {/* Content */}
      <div className="relative container pt-24">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">
          <h2 className="text-pretty text-4xl font-bold lg:text-6xl">{heading}</h2>
          <p className="text-zinc-400 lg:text-xl">{description}</p>

          <div className="inline-flex items-center rounded-full p-1" style={{ background: "rgba(255,255,255,0.03)" }}>
            <button
              aria-pressed={!isYearly}
              style={{
                padding: "10px 20px",
                borderRadius: 9999,
                fontSize: 14,
                fontWeight: 600,
                background: !isYearly ? "rgba(255,255,255,0.06)" : "transparent",
                color: !isYearly ? "#f6f7f8" : "#b5b6bb",
                transition: "background .2s ease, color .2s ease",
              }}
              onClick={() => setIsYearly(false)}
            >
              Monthly
            </button>
            <button
              aria-pressed={isYearly}
              style={{
                padding: "10px 20px",
                borderRadius: 9999,
                fontSize: 14,
                fontWeight: 600,
                background: isYearly ? "rgba(255,255,255,0.06)" : "transparent",
                color: isYearly ? "#f6f7f8" : "#b5b6bb",
                transition: "background .2s ease, color .2s ease",
              }}
              onClick={() => setIsYearly(true)}
            >
              Yearly
            </button>
          </div>

          <div className="mt-2 flex flex-col items-stretch gap-6 md:flex-row">
            {plans.map((plan, i) => (
              <Card
                key={plan.id}
                className={`card-animate flex w-80 flex-col justify-between text-left border-zinc-800 bg-zinc-900/70 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/60 ${
                  i === 1 ? "md:translate-y-2" : ""
                }`}
                style={{ animationDelay: `${0.25 + i * 0.08}s` }}
              >
                <CardHeader>
                  <CardTitle>
                    <p className="text-zinc-50">{plan.name}</p>
                  </CardTitle>
                  <p className="text-sm text-zinc-400">{plan.description}</p>
                  <span className="text-4xl font-bold text-white">
                    {isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                  </span>
                  <p className="text-zinc-500">
                    {plan.monthlyPrice === "Custom" || plan.yearlyPrice === "Custom"
                      ? "Custom pricing"
                      : `Billed $${
                          isYearly
                            ? Number(plan.yearlyPrice.slice(1)) * 12
                            : Number(plan.monthlyPrice.slice(1)) * 12
                        } annually`}
                  </p>
                </CardHeader>

                <CardContent>
                  <Separator className="mb-6 bg-zinc-800" />
                  {plan.id === "growth" && (
                    <p className="mb-3 font-semibold text-zinc-200">
                      Everything in Starter, and:
                    </p>
                  )}
                  <ul className="space-y-4">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-zinc-200">
                        <CircleCheck className="size-4 text-zinc-400" />
                        <span>{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="mt-auto">
                  <Button
                    asChild
                    className="w-full rounded-lg bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
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
  );
};

export { Pricing2 };
