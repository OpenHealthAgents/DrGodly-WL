"use client";

import React, { useEffect, useState } from "react";
import { PersonalizationResult } from "@/lib/personalization";
import { RegionConfig } from "@/lib/region-config";

import { RecommendationResult } from "@/lib/recommendations";
import { TrendingDown, Calendar, Activity, ShieldCheck } from "lucide-react";

import { motion } from "framer-motion";
import { TestimonialCard } from "@/components/trust/TestimonialCard";
import { StatsBanner } from "@/components/trust/StatsBanner";
import { FALLBACK_TRUST_CONTENT, TrustContent } from "@/lib/trust-data";
import { formatCurrency } from "@/lib/region-shared";
import { TIERED_PRICING_STRATEGY, formatTierMonthlyPrice, getPricingTierForProduct } from "@/lib/pricing-strategy";

type RecommendationPayload = RecommendationResult & {
  region: RegionConfig;
  preferences?: {
    formFactor?: "injection" | "tablet";
    primaryInterest?: "affordability" | "potency";
  };
};

interface Product {
  id: string;
  name: string;
  activeIngredient?: string | null;
  manufacturer?: string | null;
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

export interface ResultsViewProps {
  onCheckout: () => void;
}

export default function ResultsView({ onCheckout }: ResultsViewProps) {
  const [personalization, setPersonalization] = useState<(PersonalizationResult & { region: RegionConfig }) | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationPayload | null>(null);
  const [inventory, setInventory] = useState<Product[]>([]);
  const [trustContent, setTrustContent] = useState<TrustContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Pull the four data sources needed to render a complete recommendation screen.
        const [pRes, rRes, tRes, iRes] = await Promise.all([
          fetch("/api/personalization"),
          fetch("/api/recommendations"),
          fetch("/api/trust"),
          fetch("/api/inventory"),
        ]);

        
        if (pRes?.ok) {
          const pData = await pRes.json();
          setPersonalization(pData);
        }

        if (rRes?.ok) {
          const rData = await rRes.json();
          setRecommendations(rData);
        }

        if (tRes.ok) {
          const tData = await tRes.json();
          setTrustContent(tData);
        }

        if (iRes.ok) {
          const iData = await iRes.json();
          setInventory(iData.products || []);
        }
      } catch (error) {
        console.error("Failed to fetch results", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent dark:border-zinc-100" />
          <p className="text-sm font-medium text-zinc-500">Generating your personalized plan...</p>
        </div>
      </div>
    );
  }

  if (!personalization || !recommendations) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Could not load results. Please try completing the intake again.</p>
      </div>
    );
  }

  const { primary, secondary } = recommendations;
  const comparableProducts = getComparableProducts(
    inventory,
    primary.drugType,
    recommendations.region.country,
    recommendations.preferences?.formFactor,
    secondary?.drugType
  );
  const activeStats = trustContent.filter(t => t.type === "stat");
  const activeTestimonials = trustContent.filter(t => t.type === "testimonial");
  const fallbackStats = FALLBACK_TRUST_CONTENT.filter(t => t.type === "stat");
  const fallbackTestimonials = FALLBACK_TRUST_CONTENT.filter(t => t.type === "testimonial");
  const stats = [
    ...activeStats,
    ...fallbackStats.filter(item => !activeStats.some(active => active.id === item.id)),
  ].slice(0, 2);
  const testimonials = [
    ...activeTestimonials,
    ...fallbackTestimonials.filter(item => !activeTestimonials.some(active => active.id === item.id)),
  ].slice(0, 3);
  const pricingTiers = TIERED_PRICING_STRATEGY.map((tier) => ({
    ...tier,
    priceLabel: formatTierMonthlyPrice(tier),
  }));

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-6 dark:bg-black">
      <div className="mx-auto max-w-4xl space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl"
          >
            Your DrGodly Plan is Ready
          </motion.h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Based on your profile, we&apos;ve designed a treatment path tailored to your goals.
          </p>
        </div>

        {/* Success Probability Banner */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl bg-zinc-900 p-8 text-center text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xl"
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-bold uppercase tracking-widest opacity-70">Chance of Success</span>
            <div className="text-6xl font-black">{personalization.successProbability}%</div>
            <div className="rounded-full bg-green-500/20 px-4 py-1 text-xs font-bold uppercase text-green-400">
              Very High
            </div>
          </div>
          <p className="mt-4 text-sm opacity-70">
            Based on your profile and metabolic score of {personalization.metabolicScore}/100, you are a strong candidate for GLP-1 therapy.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-4">
          <StatCard 
            icon={<Activity className="h-5 w-5 text-blue-500" />} 
            label="Current BMI" 
            value={personalization.bmi.toString()} 
          />
          <StatCard 
            icon={<TrendingDown className="h-5 w-5 text-green-500" />} 
            label="Weekly Loss" 
            value={personalization.region.system === "imperial" 
              ? `${Math.round(personalization.weeklyWeightLossRange.min * 2.20462)}-${Math.round(personalization.weeklyWeightLossRange.max * 2.20462)} lbs`
              : `${personalization.weeklyWeightLossRange.min}-${personalization.weeklyWeightLossRange.max} kg`
            } 
          />
          <StatCard 
            icon={<Calendar className="h-5 w-5 text-purple-500" />} 
            label="Timeline" 
            value={`${personalization.estimatedWeeksToGoal.min}-${personalization.estimatedWeeksToGoal.max} Weeks`} 
          />
          <StatCard 
            icon={<ShieldCheck className="h-5 w-5 text-yellow-500" />} 
            label="Goal Weight" 
            value={personalization.estimatedWeeksToGoal.min === 0 ? "Goal Reached" : "Target Set"} 
          />

        </div>

        {/* Recommendations */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Recommended Options</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Based on your intake, these options match your treatment category and form-factor preference. Lower-cost options are shown first.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {pricingTiers.map((tier) => (
              // This is the simple tier comparison table shown before the product-specific cards.
              <div key={tier.title} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{tier.title}</p>
                <h3 className="mt-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">{tier.medication}</h3>
                <p className="mt-1 text-sm font-semibold text-zinc-600 dark:text-zinc-400">{tier.formFactor}</p>
                <p className="mt-3 text-2xl font-black text-zinc-900 dark:text-zinc-100">{tier.priceLabel}</p>
                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{tier.audience}</p>
                <ul className="mt-4 space-y-2 text-sm text-zinc-500">
                  {tier.includes.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {comparableProducts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {comparableProducts.map((product, index) => (
                <ProductOptionCard
                  key={product.id}
                  product={product}
                  region={recommendations.region}
                  isRecommended={index === 0}
                  onSelect={() => {
                    sessionStorage.setItem("drgodly:selectedProductId", product.id);
                    onCheckout();
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="absolute top-0 right-0 bg-zinc-900 px-4 py-1 text-xs font-bold uppercase tracking-widest text-white dark:bg-zinc-100 dark:text-zinc-900">
                Best Match
              </div>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-2xl font-bold capitalize text-zinc-900 dark:text-zinc-100">
                    {primary.drugType} ({primary.tier})
                  </h3>
                  <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                    {primary.explanation}
                  </p>
                </div>
                <button
                  onClick={onCheckout}
                  className="rounded-full bg-zinc-900 px-6 py-3 font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Continue to Checkout
                </button>
              </div>
            </div>
          )}
        </div>

        {/* What is Included & What Happens Next */}
        <div className="grid gap-8 sm:grid-cols-2">
          <div className="rounded-3xl bg-zinc-100 p-8 dark:bg-zinc-900">
            <h3 className="mb-6 text-xl font-bold">What is Included?</h3>
            <ul className="space-y-4">
              <StepItem icon="💊" title="Prescription GLP-1" desc="Cost of medication is fully included." />
              <StepItem icon="👨‍⚕️" title="1:1 Physician Guidance" desc="Ongoing medical oversight." />
              <StepItem icon="📦" title="Free Shipping" desc="Fast, discreet delivery to your door." />
              <StepItem icon="🛡️" title="Weight Loss Guarantee" desc="Results or your money back." />
            </ul>
          </div>
          <div className="rounded-3xl border border-zinc-200 p-8 dark:border-zinc-800">
            <h3 className="mb-6 text-xl font-bold">What Happens Next?</h3>
            <ul className="space-y-6">
              <NextStep number={1} title="Physician Review" desc="Most are approved in < 24 hours." />
              <NextStep number={2} title="Medication Shipping" desc="Tracking info sent within 2 days." />
              <NextStep number={3} title="Unlimited Support" desc="24/7 access to your care team." />
            </ul>
          </div>
        </div>


        {/* Trust Section */}
        <div className="grid gap-12 pt-12 border-t border-zinc-200 dark:border-zinc-800 sm:grid-cols-2">
          {/* Stats */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold uppercase tracking-widest text-zinc-500">Expected Weight Loss</h3>
            <div className="grid gap-4">
              {stats.map(stat => (
                <StatsBanner key={stat.id} content={stat} />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-green-500" />
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">FDA-approved medications prescribed by licensed clinicians.</p>
            </div>
          </div>

          {/* Testimonials */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold uppercase tracking-widest text-zinc-500">Real Stories</h3>
            <div className="grid gap-6">
              {testimonials.map(test => (
                <TestimonialCard key={test.id} content={test} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductOptionCard({
  product,
  region,
  isRecommended,
  onSelect,
}: {
  product: Product;
  region: RegionConfig;
  isRecommended: boolean;
  onSelect: () => void;
}) {
  const displayPlan = getDisplayPlan(product, region.country);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{product.name}</h3>
            {isRecommended && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700 dark:bg-green-900 dark:text-green-300">
                Recommended
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-500">
            {[product.activeIngredient, product.manufacturer].filter(Boolean).join(" • ")}
          </p>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            {getPricingTierForProduct(product).title}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold capitalize text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {product.formFactor}
        </span>
      </div>
      <p className="mt-4 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{product.description}</p>
      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">From</p>
          <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
            {displayPlan
              ? `${formatCurrency(displayPlan.monthlyAmount, displayPlan.currency, region.locale)}/mo`
              : "Price unavailable"}
          </p>
          {displayPlan && (
            <p className="text-xs text-zinc-500">{displayPlan.durationMonths}-month plan</p>
          )}
        </div>
        <button
          onClick={onSelect}
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] dark:bg-zinc-100 dark:text-zinc-900"
        >
          Select
        </button>
      </div>
    </div>
  );
}

function getComparableProducts(
  products: Product[],
  primaryDrugType: string,
  country: string,
  preferredFormFactor?: "injection" | "tablet",
  secondaryDrugType?: string
) {
  // Start with matching medication types, then keep the user's preferred form factor.
  const primaryMatches = products.filter((product) => productMatchesDrugType(product, primaryDrugType));
  const secondaryMatches = secondaryDrugType
    ? products.filter((product) => productMatchesDrugType(product, secondaryDrugType))
    : [];
  const seen = new Set<string>();

  return [...primaryMatches, ...secondaryMatches]
    .filter((product) => productMatchesFormFactor(product, preferredFormFactor))
    .filter((product) => {
      if (seen.has(product.id) || !product.plans.some(hasPrice)) return false;
      seen.add(product.id);
      return true;
    })
    .sort((a, b) => getProductMonthlyPrice(a, country) - getProductMonthlyPrice(b, country))
    .slice(0, 4);
}

function productMatchesFormFactor(product: Product, preferredFormFactor?: "injection" | "tablet") {
  if (!preferredFormFactor) return true;

  const formFactor = product.formFactor.toLowerCase();

  if (preferredFormFactor === "tablet") {
    // Tablets should not surface injection-only products.
    return formFactor.includes("tablet") || formFactor.includes("capsule");
  }

  // Injection preference includes pens and vial/syringe formats.
  return (
    formFactor.includes("injection") ||
    formFactor.includes("injectable") ||
    formFactor.includes("pen") ||
    formFactor.includes("vial") ||
    formFactor.includes("syringe")
  );
}

function productMatchesDrugType(product: Product, drugType: string) {
  const normalizedDrugType = drugType.toLowerCase();

  return (
    product.name.toLowerCase().includes(normalizedDrugType) ||
    product.activeIngredient?.toLowerCase().includes(normalizedDrugType) ||
    product.plans.some((plan) => plan.drugType.toLowerCase().includes(normalizedDrugType))
  );
}

function hasPrice(plan: Plan) {
  return Object.keys(plan.prices).length > 0;
}

function getDisplayPlan(product: Product, country: string) {
  // Pick the cheapest monthly-equivalent plan so the card shows a "from" price.
  const pricedPlans = product.plans
    .map((plan) => {
      const amount = plan.prices[country] ?? plan.prices.US ?? Object.values(plan.prices)[0];
      const currency = plan.priceCurrencies[country] ?? plan.priceCurrencies.US ?? Object.values(plan.priceCurrencies)[0];

      if (!amount || !currency) return null;

      return {
        durationMonths: plan.durationMonths,
        monthlyAmount: Math.ceil(amount / plan.durationMonths),
        currency,
      };
    })
    .filter((plan): plan is { durationMonths: number; monthlyAmount: number; currency: string } => plan !== null);

  return pricedPlans.find((plan) => plan.durationMonths === 1) ||
    pricedPlans.sort((a, b) => a.durationMonths - b.durationMonths)[0];
}

function getProductMonthlyPrice(product: Product, country: string) {
  return getDisplayPlan(product, country)?.monthlyAmount ?? Number.POSITIVE_INFINITY;
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-500">
          {icon}
          {label}
        </div>
        <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</div>
      </div>
    </div>
  );
}

function StepItem({ icon, title, desc }: { icon: string, title: string, desc: string }) {
  return (
    <li className="flex gap-4">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-bold text-zinc-900 dark:text-zinc-100">{title}</p>
        <p className="text-sm text-zinc-500">{desc}</p>
      </div>
    </li>
  );
}

function NextStep({ number, title, desc }: { number: number, title: string, desc: string }) {
  return (
    <li className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
        {number}
      </div>
      <div>
        <p className="font-bold text-zinc-900 dark:text-zinc-100">{title}</p>
        <p className="text-sm text-zinc-500">{desc}</p>
      </div>
    </li>
  );
}
