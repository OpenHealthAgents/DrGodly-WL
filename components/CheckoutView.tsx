"use client";

import React, { useState, useEffect } from "react";
import { AVAILABLE_PLANS } from "@/lib/plans";
import { RecommendationResult } from "@/lib/recommendations";
import { cn } from "@/lib/utils";
import { Loader2, ShieldCheck, CheckCircle2, Lock, CreditCard } from "lucide-react";
import { TrustContent } from "@/lib/trust-data";
import { StatsBanner } from "@/components/trust/StatsBanner";
import { TestimonialCard } from "@/components/trust/TestimonialCard";

export default function CheckoutView() {
  const [recommendations, setRecommendations] = useState<RecommendationResult | null>(null);
  const [trustContent, setTrustContent] = useState<TrustContent[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [address, setAddress] = useState({
    street: "",
    city: "",
    state: "",
    zip: "",
  });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [recRes, trustRes] = await Promise.all([
          fetch("/api/recommendations"),
          fetch("/api/trust")
        ]);

        if (recRes.ok) {
          const data = await recRes.json();
          setRecommendations(data);
          
          // Default to the first plan of the recommended drug
          const drugType = data.primary.drugType;
          const defaultPlan = AVAILABLE_PLANS.find(p => p.drugType === drugType);
          if (defaultPlan) setSelectedPlanId(defaultPlan.id);

        }

        if (trustRes.ok) {
          const trustData = await trustRes.json();
          setTrustContent(trustData);
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlanId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Failed to create checkout session");
      }
    } catch (error) {
      console.error("Checkout failed", error);
      alert("Checkout failed. Please ensure you are logged in and your Stripe configuration is correct.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  const drugType = recommendations?.primary.drugType || "semaglutide";
  const plans = AVAILABLE_PLANS.filter(p => p.drugType === drugType);

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-6 dark:bg-black">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-12 lg:grid-cols-3">
          {/* Main Checkout Flow */}
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Complete Your Order</h1>
              <p className="text-zinc-600 dark:text-zinc-400">Secure checkout for your personalized treatment plan.</p>
            </div>

            {/* Step 1: Select Duration */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-6 text-xl font-bold text-zinc-900 dark:text-zinc-100">1. Select Program Duration</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {plans.map((plan) => {
                  const perMonth = Math.round(plan.price / plan.durationMonths);
                  const savings = plan.durationMonths === 3 ? "Save $150" : plan.durationMonths === 6 ? "Save $480" : plan.durationMonths === 12 ? "Save $1,440" : null;
                  
                  return (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={cn(
                        "relative flex flex-col gap-2 rounded-2xl border-2 p-6 text-left transition-all",
                        selectedPlanId === plan.id
                          ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800"
                          : "border-zinc-100 hover:border-zinc-200 dark:border-zinc-800 dark:hover:border-zinc-700"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-zinc-500 uppercase">{plan.durationMonths} Month{plan.durationMonths > 1 ? 's' : ''}</span>
                        {savings && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-900 dark:text-green-300">
                            {savings}
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100">${perMonth}</span>
                        <span className="text-sm font-medium text-zinc-500">/mo</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        {plan.durationMonths === 1 ? "Great if you want to try it first." : 
                         plan.durationMonths === 3 ? "Our most chosen option." :
                         plan.durationMonths === 6 ? "Best value for consistent progress." :
                         "Maximum savings package."}
                      </p>
                      <div className="mt-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        Total: ${plan.price}
                      </div>
                    </button>
                  );
                })}
              </div>

            </div>

            {/* Step 2: Shipping Address */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-6 text-xl font-bold text-zinc-900 dark:text-zinc-100">2. Shipping Address</h2>
              <form id="checkout-form" onSubmit={handleCheckout} className="grid gap-4">
                <div className="grid min-w-0 gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Street Address</label>
                  <input
                    required
                    type="text"
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    className="w-full min-w-0 rounded-lg border border-zinc-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950"
                  />
                </div>
                <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="grid min-w-0 gap-2 lg:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">City</label>
                    <input
                      required
                      type="text"
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      className="w-full min-w-0 rounded-lg border border-zinc-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950"
                    />
                  </div>
                  <div className="grid min-w-0 gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">State</label>
                    <input
                      required
                      type="text"
                      value={address.state}
                      onChange={(e) => setAddress({ ...address, state: e.target.value })}
                      className="w-full min-w-0 rounded-lg border border-zinc-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950"
                    />
                  </div>
                  <div className="grid min-w-0 gap-2 sm:col-span-2 lg:col-span-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Zip Code</label>
                    <input
                      required
                      type="text"
                      value={address.zip}
                      onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                      className="w-full min-w-0 rounded-lg border border-zinc-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950"
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Step 3: Payment (Mock) */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-6 text-xl font-bold text-zinc-900 dark:text-zinc-100">3. Payment Information</h2>
              <div className="flex items-center gap-4 rounded-xl border border-dashed border-zinc-200 p-8 dark:border-zinc-800">
                <CreditCard className="h-8 w-8 text-zinc-400" />
                <div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Mock Payment Enabled</p>
                  <p className="text-xs text-zinc-500">Your order will be processed without a real charge for this demonstration.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary & Trust */}
          <div className="space-y-6">
            <div className="sticky top-12 space-y-6">
              {/* Summary Card */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="mb-4 text-lg font-bold">Order Summary</h2>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 capitalize">{drugType} Program</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      ${AVAILABLE_PLANS.find(p => p.id === selectedPlanId)?.price || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Medical Consultation</span>
                    <span className="font-medium text-green-600">FREE</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Shipping</span>
                    <span className="font-medium text-green-600">FREE</span>
                  </div>
                  <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
                    <div className="flex justify-between">
                      <span className="font-bold">Total</span>
                      <span className="text-xl font-black">
                        ${AVAILABLE_PLANS.find(p => p.id === selectedPlanId)?.price || 0}
                      </span>
                    </div>
                  </div>
                  <button
                    form="checkout-form"
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-2 w-full flex items-center justify-center gap-2 rounded-full bg-zinc-900 py-4 font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-4 w-4" />}
                    Place Secure Order
                  </button>
                </div>
              </div>

              {/* Dynamic Trust Content */}
              {trustContent.length > 0 && (
                <div className="space-y-4">
                  {trustContent.filter(t => t.type === "stat").slice(0, 1).map(stat => (
                    <StatsBanner key={stat.id} content={stat} />
                  ))}
                  {trustContent.filter(t => t.type === "testimonial").slice(0, 1).map(test => (
                    <TestimonialCard key={test.id} content={test} />
                  ))}
                </div>
              )}

              {/* Trust Signals */}
              <div className="space-y-4 px-2">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase">Doctor-Reviewed</p>
                    <p className="text-[10px] text-zinc-500">Your plan is reviewed by a licensed provider.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase">No Hidden Fees</p>
                    <p className="text-[10px] text-zinc-500">Transparent pricing. No surprises at checkout.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase">Cancel Anytime</p>
                    <p className="text-[10px] text-zinc-500">Flexibility to pause or stop your program.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
