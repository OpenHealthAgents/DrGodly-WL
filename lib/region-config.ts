export type MeasurementSystem = "metric" | "imperial";

export interface RegionConfig {
  country: string;
  currency: string;
  system: MeasurementSystem;
  locale: string;
}

export const REGION_MAPPING: Record<string, Omit<RegionConfig, "country">> = {
  US: { currency: "USD", system: "imperial", locale: "en-US" },
  IN: { currency: "INR", system: "metric", locale: "en-IN" },
  GB: { currency: "GBP", system: "metric", locale: "en-GB" },
  CA: { currency: "CAD", system: "imperial", locale: "en-CA" },
  DE: { currency: "EUR", system: "metric", locale: "de-DE" },
  FR: { currency: "EUR", system: "metric", locale: "fr-FR" },
  DEFAULT: { currency: "USD", system: "metric", locale: "en-US" },
};
