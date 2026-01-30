/**
 * Centralized pricing configuration
 * Update values here to change pricing across the entire app
 * (Landing page, Upgrade modal, etc.)
 */

export interface PricingFeature {
  text: string;
  highlight?: string; // Optional bold text prepended to the feature
}

export interface PricingTier {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number | 'custom';
    annual?: number;
    annualSavings?: string; // e.g., "save 27%"
  };
  features: PricingFeature[];
  cta: {
    text: string;
    action: 'free' | 'checkout' | 'contact';
  };
  highlighted?: boolean;
  badge?: string; // e.g., "Most Popular"
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Basic',
    description: 'Get started with radiology training',
    price: {
      monthly: 0,
    },
    features: [
      { text: '10 cases per month' },
      { text: 'Chest X-ray cases' },
      { text: 'Basic AI feedback' },
      { text: 'Progress tracking' },
      { text: 'Community access' },
    ],
    cta: {
      text: 'Get Started',
      action: 'free',
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For serious exam preparation',
    price: {
      monthly: 20,
      annual: 179,
      annualSavings: 'save 25%',
    },
    features: [
      { text: 'cases', highlight: 'Unlimited' },
      { text: 'Full AI tutor & explanations' },
      { text: 'Spaced repetition scheduling' },
      { text: 'Board exam prep mode' },
      { text: 'Performance analytics' },
      { text: 'Priority support' },
    ],
    cta: {
      text: 'Get Started',
      action: 'checkout',
    },
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    id: 'enterprise',
    name: 'Residency',
    description: 'For programs & institutions',
    price: {
      monthly: 'custom',
    },
    features: [
      { text: 'Everything in Pro' },
      { text: 'Cohort management dashboard' },
      { text: 'Custom case uploads' },
      { text: 'Progress reports for directors' },
      { text: 'ACGME milestone tracking' },
      { text: 'SSO & LMS integration' },
      { text: 'Dedicated account manager' },
    ],
    cta: {
      text: 'Contact Sales',
      action: 'contact',
    },
  },
];

// Quick access to tiers
export const FREE_TIER = PRICING_TIERS.find((t) => t.id === 'free')!;
export const PRO_TIER = PRICING_TIERS.find((t) => t.id === 'pro')!;
export const ENTERPRISE_TIER = PRICING_TIERS.find((t) => t.id === 'enterprise')!;

// App-wide stats (used in multiple places)
export const APP_STATS = {
  totalCases: 861,
  pathologyCount: 7,
  baselineCases: 20,
  baselineMinutes: 15,
};

// Helper to format price display
export function formatPrice(price: number | 'custom'): string {
  if (price === 'custom') return 'Custom';
  if (price === 0) return '$0';
  return `$${price}`;
}

// Helper to format annual price
export function formatAnnualPrice(tier: PricingTier): string | null {
  if (!tier.price.annual) return null;
  return `$${tier.price.annual}/year (${tier.price.annualSavings})`;
}

// Get feature text with optional highlight
export function getFeatureText(feature: PricingFeature): string {
  if (feature.highlight) {
    return `${feature.highlight} ${feature.text}`;
  }
  return feature.text;
}
