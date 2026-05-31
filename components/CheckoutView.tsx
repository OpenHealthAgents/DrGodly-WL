"use client";

import React, { useState, useEffect } from "react";
import { RecommendationResult } from "@/lib/recommendations";
import { cn } from "@/lib/utils";
import { Loader2, ShieldCheck, CheckCircle2, Lock, CreditCard, Box } from "lucide-react";
import { TrustContent } from "@/lib/trust-data";
import { StatsBanner } from "@/components/trust/StatsBanner";
import { TestimonialCard } from "@/components/trust/TestimonialCard";
import { RegionConfig } from "@/lib/region-config";
import { formatCurrency } from "@/lib/region-shared";
import Image from "next/image";

interface Product {
  id: string;
  name: string;
  activeIngredient?: string | null;
  description: string;
  image: string | null;
  formFactor: string;
  plans: Plan[];
}

interface Plan {
  id: string;
  drugType: string;
  tier: string;
  prices: Record<string, number>;
  priceCurrencies: Record<string, string>;
  durationMonths: number;
}

interface RazorpayCheckoutResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
  };
  handler: (response: RazorpayCheckoutResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => {
      open: () => void;
      on: (event: "payment.failed", handler: (response: unknown) => void) => void;
    };
  }
}

function loadRazorpayCheckout() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Razorpay Checkout."));
    document.body.appendChild(script);
  });
}

export default function CheckoutView() {
  const [recommendations, setRecommendations] = useState<(RecommendationResult & { region: RegionConfig }) | null>(null);
  const [inventory, setInventory] = useState<Product[]>([]);
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
        const [recRes, trustRes, invRes] = await Promise.all([
          fetch("/api/recommendations"),
          fetch("/api/trust"),
          fetch("/api/inventory")
        ]);

        let detectedRegion: RegionConfig | null = null;
        let drugType: string | null = null;

        if (recRes.ok) {
          const data = await recRes.json();
          setRecommendations(data);
          detectedRegion = data.region;
          drugType = data.primary.drugType;
        }

        if (trustRes.ok) {
          const trustData = await trustRes.json();
          setTrustContent(trustData);
        }

        if (invRes.ok) {
          const invData = await invRes.json();
          setInventory(invData.products);
          
          if (!detectedRegion) detectedRegion = invData.region;

          if (invData.products.length > 0) {
            const availablePlans = getCheckoutPlans(invData.products, drugType || undefined);
            if (availablePlans.length > 0) {
              setSelectedPlanId(availablePlans[0].id);
            }
          }
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
      await loadRazorpayCheckout();

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlanId, address }),
      });
      const data = await res.json();

      if (!res.ok || !data.orderId) {
        throw new Error(data.error || "Failed to create Razorpay order");
      }

      if (!window.Razorpay) {
        throw new Error("Razorpay Checkout is unavailable.");
      }

      const checkout = new window.Razorpay({
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: data.name,
        description: data.description,
        order_id: data.orderId,
        prefill: data.prefill,
        handler: async (response) => {
          const verifyRes = await fetch("/api/checkout/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const verifyData = await verifyRes.json();

          if (!verifyRes.ok || !verifyData.success) {
            alert(verifyData.error || "Payment verification failed. Please contact support.");
            return;
          }

          window.location.href = "/dashboard?status=success";
        },
        modal: {
          ondismiss: () => setIsSubmitting(false),
        },
      });

      checkout.on("payment.failed", (response) => {
        console.error("Razorpay payment failed", response);
        alert("Payment failed. Please try again or use another payment method.");
        setIsSubmitting(false);
      });

      checkout.open();
    } catch (error) {
      console.error("Checkout failed", error);
      alert("Checkout failed. Please ensure you are logged in and your Razorpay configuration is correct.");
      setIsSubmitting(false);
    }
  };

  if (loading || !recommendations) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  const { region } = recommendations;
  const recommendedDrugType = recommendations.primary.drugType;
  
  // Find the recommended product and its plans from inventory
  const selectedProduct = inventory.find(p => matchesRecommendedProduct(p, recommendedDrugType)) || inventory.find((product) =>
    product.plans.some((plan) => plan.id === selectedPlanId)
  );
  
  const plans = getCheckoutPlans(inventory, recommendedDrugType);
  const allPlans = inventory.flatMap(p => p.plans);
  const selectedPlan = allPlans.find(p => p.id === selectedPlanId);

  const getPriceValue = (plan: Plan) => {
    return getPlanPrice(plan, region.country);
  };

  const getPriceCurrency = (plan: Plan) => {
    return getPlanCurrency(plan, region.country, region.currency);
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-6 dark:bg-black">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-12 lg:grid-cols-3">
          {/* Main Checkout Flow */}
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Complete Your Order</h1>
                <p className="text-zinc-600 dark:text-zinc-400">Secure checkout for your personalized treatment plan.</p>
              </div>
              
              {/* Product Preview Card */}
              {selectedProduct && (
                <div className="flex items-center gap-6 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  {selectedProduct.image ? (
                    <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl">
                      <Image 
                        src={selectedProduct.image} 
                        alt={selectedProduct.name} 
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                      <Box className="h-8 w-8 text-zinc-400" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{selectedProduct.name}</h3>
                    <p className="text-sm text-zinc-500 line-clamp-2">{selectedProduct.description}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Step 1: Select Duration */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-6 text-xl font-bold text-zinc-900 dark:text-zinc-100">1. Select Program Duration</h2>
              {plans.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {plans.map((plan) => {
                  const totalPrice = getPriceValue(plan);
                  const perMonth = totalPrice ? Math.round(totalPrice / plan.durationMonths) : null;
                  
                  const savings = plan.durationMonths === 3 ? "Most Popular" : plan.durationMonths === 6 ? "Best Value" : plan.durationMonths === 12 ? "Best Deal" : null;
                  
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
                        <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
                        {perMonth ? formatCurrency(perMonth, getPriceCurrency(plan), region.locale) : "Price unavailable"}
                        </span>
                        {perMonth && <span className="text-sm font-medium text-zinc-500">/mo</span>}
                      </div>
                      <p className="text-xs text-zinc-400">
                        {plan.durationMonths === 1 ? "Great if you want to try it first." : 
                         plan.durationMonths === 3 ? "Our most chosen option." :
                         plan.durationMonths === 6 ? "Consistent progress package." :
                         "Maximum savings package."}
                      </p>
                      <div className="mt-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        Total: {totalPrice ? formatCurrency(totalPrice, getPriceCurrency(plan), region.locale) : "Unavailable"}
                      </div>
                    </button>
                  );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-sm text-zinc-500 dark:border-zinc-800">
                  No active priced plans are available right now. Please contact support before continuing.
                </div>
              )}

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
                    className="w-full min-w-0 rounded-lg border border-zinc-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
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
                      className="w-full min-w-0 rounded-lg border border-zinc-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                    />
                  </div>
                  <div className="grid min-w-0 gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">State / Region</label>
                    <input
                      required
                      type="text"
                      value={address.state}
                      onChange={(e) => setAddress({ ...address, state: e.target.value })}
                      className="w-full min-w-0 rounded-lg border border-zinc-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                    />
                  </div>
                  <div className="grid min-w-0 gap-2 sm:col-span-2 lg:col-span-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Zip / Postal Code</label>
                    <input
                      required
                      type="text"
                      value={address.zip}
                      onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                      className="w-full min-w-0 rounded-lg border border-zinc-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Step 3: Payment */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-6 text-xl font-bold text-zinc-900 dark:text-zinc-100">3. Payment Information</h2>
              <div className="flex items-center gap-4 rounded-xl border border-dashed border-zinc-200 p-8 dark:border-zinc-800">
                <CreditCard className="h-8 w-8 text-zinc-400" />
                <div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Razorpay Secure Checkout</p>
                  <p className="text-xs text-zinc-500">Payment opens in Razorpay and is verified before your order is marked paid.</p>
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
                    <span className="text-zinc-500 capitalize">{recommendedDrugType} Program</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {selectedPlan && getPriceValue(selectedPlan) ? formatCurrency(getPriceValue(selectedPlan), getPriceCurrency(selectedPlan), region.locale) : "-"}
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
                        {selectedPlan && getPriceValue(selectedPlan) ? formatCurrency(getPriceValue(selectedPlan), getPriceCurrency(selectedPlan), region.locale) : "-"}
                      </span>
                    </div>
                  </div>
                  <button
                    form="checkout-form"
                    type="submit"
                    disabled={isSubmitting || !selectedPlan || !getPriceValue(selectedPlan)}
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
                    <p className="text-[10px] text-zinc-500">
                      Transparent pricing in {selectedPlan ? getPriceCurrency(selectedPlan) : region.currency}.
                    </p>
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

function matchesRecommendedProduct(product: Product, drugType: string) {
  const normalizedDrugType = drugType.toLowerCase();

  return (
    product.name.toLowerCase().includes(normalizedDrugType) ||
    product.activeIngredient?.toLowerCase().includes(normalizedDrugType) ||
    product.plans.some((plan) => matchesRecommendedPlan(plan, drugType))
  );
}

function matchesRecommendedPlan(plan: Plan, drugType: string) {
  return plan.drugType.toLowerCase().includes(drugType.toLowerCase());
}

function getPlanPrice(plan: Plan, country: string) {
  return plan.prices[country] ?? plan.prices.US ?? Object.values(plan.prices)[0];
}

function getPlanCurrency(plan: Plan, country: string, fallbackCurrency: string) {
  return plan.priceCurrencies[country] ?? plan.priceCurrencies.US ?? Object.values(plan.priceCurrencies)[0] ?? fallbackCurrency;
}

function hasPrice(plan: Plan) {
  return Object.keys(plan.prices).length > 0;
}

function getCheckoutPlans(products: Product[], recommendedDrugType?: string) {
  const recommendedPlans = recommendedDrugType
    ? products
        .flatMap((product) => product.plans)
        .filter((plan) => matchesRecommendedPlan(plan, recommendedDrugType) && hasPrice(plan))
    : [];

  if (recommendedPlans.length > 0) {
    return recommendedPlans;
  }

  return products.flatMap((product) => product.plans).filter(hasPrice);
}
