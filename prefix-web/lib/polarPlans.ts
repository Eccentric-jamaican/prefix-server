// Polar plan definitions
export const POLAR_PRODUCT_IDS = {
  starter: "b05dac02-5a09-40fa-8255-0ab05bdc8c16",
  growth: "49580b8e-f109-4381-bb08-325cec7e5502",
  scale: "da6fbebf-bf7a-4bb5-81fb-9246f0bddba7"
} as const;

export const POLAR_BENEFIT_IDS = {
  starter: "e29b989c-942e-4f90-a857-df9c387755cc",
  growth: "2e045371-de74-49bc-bf40-4484c8481d61",
  scale: "a0d7f423-74d7-4f13-904e-9a7c133130a0"
} as const;

export const POLAR_PLAN_DEFINITIONS = {
  starter: {
    planId: "starter_monthly",
    productId: POLAR_PRODUCT_IDS.starter,
    benefitId: POLAR_BENEFIT_IDS.starter,
    creditsPerCycle: 1000,
    priceCents: 4900,
    currency: "usd"
  },
  growth: {
    planId: "growth_monthly",
    productId: POLAR_PRODUCT_IDS.growth,
    benefitId: POLAR_BENEFIT_IDS.growth,
    creditsPerCycle: 5000,
    priceCents: 19900,
    currency: "usd"
  },
  scale: {
    planId: "scale_monthly",
    productId: POLAR_PRODUCT_IDS.scale,
    benefitId: POLAR_BENEFIT_IDS.scale,
    creditsPerCycle: 15000,
    priceCents: 49900,
    currency: "usd"
  }
} as const;

export type PaidPlanKey = keyof typeof POLAR_PLAN_DEFINITIONS;
