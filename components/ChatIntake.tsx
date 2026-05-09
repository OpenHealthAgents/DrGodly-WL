"use client";

import React, { useState, useEffect, useRef } from "react";
import { IntakeStep } from "@/lib/intake-state";
import { STEP_METADATA, Message } from "@/lib/chat-utils";
import { cn } from "@/lib/utils";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import ResultsView from "@/components/ResultsView";
import CheckoutView from "@/components/CheckoutView";
import { LoginButton } from "@/components/LoginButton";
import { TrustContent } from "@/lib/trust-data";
import { RecommendationResult } from "@/lib/recommendations";

type FlowState = "intake" | "results" | "checkout" | "success";
type CompletedIntakeResult = {
  data?: {
    height?: number;
    weight?: number;
    goalWeight?: number;
  };
  recommendations?: RecommendationResult;
};

export default function ChatIntake() {
  const [flowState, setFlowState] = useState<FlowState>("intake");
  const [completedResult, setCompletedResult] = useState<CompletedIntakeResult | null>(null);

  if (flowState === "results") {
    return <ResultsView initialResult={completedResult} onCheckout={() => setFlowState("checkout")} />;
  }

  if (flowState === "checkout") {
    return <CheckoutView />;
  }

  if (flowState === "success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6 text-center dark:bg-black">
        <div className="mb-6 rounded-full bg-green-100 p-4 dark:bg-green-900">
          <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="mb-2 text-3xl font-bold">Order Placed!</h1>
        <p className="max-w-md text-zinc-600 dark:text-zinc-400">
          Thank you for choosing Wellora. A licensed medical provider will review your profile shortly. Keep an eye on your email for updates.
        </p>
      </div>
    );
  }

  return (
    <ChatIntakeComponent
      onComplete={(result) => {
        setCompletedResult(result);
        setFlowState("results");
      }}
    />
  );
}

export function ChatIntakeComponent({ onComplete }: { onComplete: (result: CompletedIntakeResult) => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState<IntakeStep | null>(null);
  const [trustContent, setTrustContent] = useState<TrustContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputValue, setInputValue] = useState<unknown>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInitialState();
  }, []);

  useEffect(() => {
    const scrollToLatestMessage = () => {
      messagesEndRef.current?.scrollIntoView({ block: "end" });
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    };

    const animationFrame = requestAnimationFrame(scrollToLatestMessage);
    const timeout = window.setTimeout(scrollToLatestMessage, 250);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.clearTimeout(timeout);
    };
  }, [messages, isSubmitting]);

  const fetchInitialState = async () => {
    setIsLoading(true);
    console.log("ChatIntake - Fetching initial state...");
    try {
      // Fetch intake state first as it's critical
      const stateRes = await fetch("/api/intake");
      if (!stateRes.ok) {
        const errorText = await stateRes.text();
        throw new Error(`Failed to load intake state: ${stateRes.status} ${errorText}`);
      }
      
      const data = await stateRes.json();
      console.log("ChatIntake - Received intake data:", data);
      
      // Fetch trust content second (non-critical)
      let trustData = [];
      try {
        const trustRes = await fetch("/api/trust");
        if (trustRes.ok) {
          trustData = await trustRes.json();
        }
      } catch (trustError) {
        console.warn("ChatIntake - Trust fetch failed (continuing anyway):", trustError);
      }
      
      setCurrentStep(data.currentStep);
      setTrustContent(trustData);
      
      const welcomeMsg: Message = {
        id: "welcome",
        role: "assistant",
        content: "Welcome to Wellora. This guided intake checks your initial eligibility for weight-loss treatment and helps match you with a plan. Let's start with some basic information.",
      };
      
      const step = data.currentStep || IntakeStep.HEIGHT;
      const nextQ = STEP_METADATA[step];
      
      if (!nextQ) {
        console.error("ChatIntake - Question metadata not found for step:", step);
        throw new Error(`Invalid step: ${step}`);
      }

      const questionMsg: Message = {
        id: `question-${step}`,
        role: "assistant",
        content: nextQ.question,
      };

      setMessages([welcomeMsg, questionMsg]);
      console.log("ChatIntake - Successfully initialized messages.");
    } catch (error) {
      console.error("ChatIntake - Initialization error:", error);
      setMessages([{
        id: "error",
        role: "assistant",
        content: `I'm having trouble connecting: ${error instanceof Error ? error.message : 'Unknown error'}. Please refresh or check your console.`,
      }]);
    } finally {
      setIsLoading(false);
    }
  };



  const buildTrustMessage = (data: { data?: { weight?: number; goalWeight?: number } }) => {
    const stat = trustContent.find(t => t.type === "stat");
    const test = trustContent.find(t => t.type === "testimonial");
    const currentWeight = data.data?.weight;
    const goalWeight = data.data?.goalWeight;
    const weightContext =
      typeof currentWeight === "number" && typeof goalWeight === "number"
        ? `You told us your current weight is ${currentWeight}kg and your goal weight is ${goalWeight}kg.`
        : "You are building a profile we can use for a more relevant treatment recommendation.";
    const trustContext =
      stat?.description ||
      "Many members begin seeing weight changes within the first few months of a treatment plan.";
    const testimonialContext = test
      ? ` One member, ${test.metadata?.author || "a Wellora member"}, shared: "${test.description}"`
      : "";

    return `${weightContext} ${trustContext}${testimonialContext}`;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentStep || inputValue === "" || isSubmitting) return;

    setIsSubmitting(true);
    const stepMeta = STEP_METADATA[currentStep];
    
    // Add user message
    let displayValue = inputValue;
    if (stepMeta.type === "options") {
      displayValue = stepMeta.options?.find(o => o.value === inputValue)?.label || inputValue;
    } else if (stepMeta.type === "checkbox") {
      displayValue = Array.isArray(inputValue) ? inputValue.join(", ") : inputValue;
    }

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: String(displayValue),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/intake/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: currentStep, answer: inputValue }),
      });
      const data = await res.json();

      if (data.success) {
        const nextStep = data.nextStep;
        const completedStep = currentStep;
        setCurrentStep(nextStep);
        setInputValue("");

        if (nextStep !== IntakeStep.COMPLETED) {
          setTimeout(() => {
            // Midway Trust Break
            if (completedStep === IntakeStep.DATE_OF_BIRTH) {
              const trustMsg: Message = {
                id: `trust-${Date.now()}`,
                role: "assistant",
                content: buildTrustMessage(data),
              };
              setMessages((prev) => [...prev, trustMsg]);
              
              setTimeout(() => {
                const nextQ = STEP_METADATA[nextStep];
                const assistantMsg: Message = {
                  id: `question-${nextStep}`,
                  role: "assistant",
                  content: nextQ.question,
                };
                setMessages((prev) => [...prev, assistantMsg]);
              }, 2000);
            } else {
              const nextQ = STEP_METADATA[nextStep];
              const assistantMsg: Message = {
                id: `question-${nextStep}`,
                role: "assistant",
                content: nextQ.question,
              };
              setMessages((prev) => [...prev, assistantMsg]);
            }
          }, 600);
        } else {
          setTimeout(() => {
            setMessages((prev) => [
              ...prev,
              {
                id: "completed",
                role: "assistant",
                content: "Thank you! Your intake is complete. We are reviewing your information.",
              },
            ]);
            // Redirect to results after a short delay
            setTimeout(() => onComplete(data), 1500);
          }, 600);
        }
      } else {
        // Handle validation error
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: "I'm sorry, that doesn't seem right. Could you please check your answer?",
          },
        ]);
      }
    } catch (error) {
      console.error("Submission failed", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderInput = () => {
    if (!currentStep || currentStep === IntakeStep.COMPLETED) return null;
    const meta = STEP_METADATA[currentStep];

    switch (meta.type) {
      case "number":
        return (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="number"
              value={inputValue as string | number | undefined}
              onChange={(e) => setInputValue(Number(e.target.value))}
              placeholder={meta.placeholder}
              autoFocus
              className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </form>
        );
      case "options":
        return (
          <div className="flex flex-wrap gap-2">
            {meta.options?.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setInputValue(opt.value);
                  // We need to trigger submit but inputValue state might not be updated yet
                  // So we pass the value directly to a handler
                  submitWithValue(opt.value);
                }}
                disabled={isSubmitting}
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                {opt.label}
              </button>
            ))}
          </div>
        );
      case "date":
        return (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="date"
              value={inputValue as string | number | undefined}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            />
            <button
              type="submit"
              className="flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        );
      case "checkbox":
        const currentVals = Array.isArray(inputValue) ? inputValue : [];
        return (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {meta.options?.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    const newVals = currentVals.includes(opt.value)
                      ? currentVals.filter((v) => v !== opt.value)
                      : [...currentVals, opt.value];
                    setInputValue(newVals);
                  }}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    currentVals.includes(opt.value)
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => handleSubmit()}
              disabled={currentVals.length === 0 || isSubmitting}
              className="mt-2 w-full rounded-lg bg-zinc-900 py-2 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Continue
            </button>
          </div>
        );
      case "text":
        return (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={inputValue as string || ""}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={meta.placeholder}
              autoFocus
              className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={isSubmitting || !inputValue}
              className="flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </form>
        );

      default:
        return null;
    }
  };

  const submitWithValue = async (val: unknown) => {
    if (!currentStep || isSubmitting) return;
    setIsSubmitting(true);
    const stepMeta = STEP_METADATA[currentStep];
    const displayValue = stepMeta.options?.find(o => o.value === val)?.label || val;

    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: "user", content: String(displayValue) }]);

    try {
      const res = await fetch("/api/intake/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: currentStep, answer: val }),
      });
      const data = await res.json();
      if (data.success) {
        const step = currentStep;
        setCurrentStep(data.nextStep);
        setInputValue("");
        if (data.nextStep !== IntakeStep.COMPLETED) {
          setTimeout(() => {
             // Midway Trust Break
             if (step === IntakeStep.DATE_OF_BIRTH) {
              const trustMsg: Message = {
                id: `trust-${Date.now()}`,
                role: "assistant",
                content: buildTrustMessage(data),
              };
              setMessages((prev) => [...prev, trustMsg]);
              
              setTimeout(() => {
                const nextQ = STEP_METADATA[data.nextStep];
                setMessages((prev) => [...prev, { id: `question-${data.nextStep}`, role: "assistant", content: nextQ.question }]);
              }, 2000);
            } else {
              const nextQ = STEP_METADATA[data.nextStep];
              setMessages((prev) => [...prev, { id: `question-${data.nextStep}`, role: "assistant", content: nextQ.question }]);
            }
          }, 600);
        } else {
           setTimeout(() => {
            setMessages((prev) => [...prev, { id: "completed", role: "assistant", content: "Thank you! Your intake is complete." }]);
            // Redirect to results after a short delay
            setTimeout(() => onComplete(data), 1500);
          }, 600);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetIntake = async () => {
    if (!confirm("Are you sure you want to start over? This will clear your current progress.")) return;
    
    try {
      await fetch("/api/intake", { method: "DELETE" });
      setMessages([]);
      setCurrentStep(null);
      fetchInitialState();
    } catch (error) {
      console.error("Reset failed", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white dark:bg-black">
      <header className="flex min-h-16 items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-900 sm:px-6">
        <h1 className="shrink-0 text-xl font-bold tracking-tight">Wellora</h1>
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <button 
            onClick={resetIntake}
            className="shrink-0 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Start Over
          </button>
          <a href="/dashboard" className="shrink-0 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">Dashboard</a>
          <LoginButton />
        </div>
      </header>


      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
          <AnimatePresence>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex max-w-[80%] flex-col gap-1",
                  m.role === "assistant" ? "items-start" : "ml-auto items-end"
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2 text-sm leading-relaxed",
                    m.role === "assistant"
                      ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                      : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  )}
                >
                  {m.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isSubmitting && (
            <div className="flex items-center gap-1 text-zinc-400">
              <span className="h-1 w-1 animate-bounce rounded-full bg-current" style={{ animationDelay: "0ms" }} />
              <span className="h-1 w-1 animate-bounce rounded-full bg-current" style={{ animationDelay: "200ms" }} />
              <span className="h-1 w-1 animate-bounce rounded-full bg-current" style={{ animationDelay: "400ms" }} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-zinc-100 p-6 dark:border-zinc-900">
          <div className="mx-auto max-w-2xl">
            {renderInput()}
          </div>
        </div>
      </main>
    </div>
  );
}
