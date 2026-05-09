export interface Plan {
  id: string;
  drugType: "semaglutide" | "liraglutide" | "tirzepatide";
  tier: "affordable" | "standard" | "premium";
  price: number;
  durationMonths: number;
  stripePriceId?: string;
}

export const AVAILABLE_PLANS: Plan[] = [
  // Semaglutide
  { id: "sema-1", drugType: "semaglutide", tier: "affordable", price: 299, durationMonths: 1, stripePriceId: "price_sema_1m" },
  { id: "sema-3", drugType: "semaglutide", tier: "affordable", price: 747, durationMonths: 3, stripePriceId: "price_sema_3m" }, // 249 * 3
  { id: "sema-6", drugType: "semaglutide", tier: "affordable", price: 1314, durationMonths: 6, stripePriceId: "price_sema_6m" }, // 219 * 6
  { id: "sema-12", drugType: "semaglutide", tier: "affordable", price: 2148, durationMonths: 12, stripePriceId: "price_sema_12m" }, // 179 * 12
  
  // Tirzepatide
  { id: "tirz-1", drugType: "tirzepatide", tier: "premium", price: 399, durationMonths: 1, stripePriceId: "price_tirz_1m" },
  { id: "tirz-3", drugType: "tirzepatide", tier: "premium", price: 897, durationMonths: 3, stripePriceId: "price_tirz_3m" }, // 299 * 3
];


