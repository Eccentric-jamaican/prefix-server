import dotenv from "dotenv";
import process from "node:process";

import { Polar } from "@polar-sh/sdk";

import { PRODUCT_CATALOG } from "./catalog.js";

dotenv.config();
dotenv.config({ path: ".env.local", override: true });

const args = new Set(process.argv.slice(2));
const useProduction = args.has("--prod") || args.has("--production");
const accessToken = useProduction
  ? process.env.POLAR_ACCESS_TOKEN
  : process.env.POLAR_SANDBOX_ACCESS_TOKEN ?? process.env.POLAR_ACCESS_TOKEN;

if (!accessToken) {
  console.error(
    "Missing Polar access token. Set POLAR_ACCESS_TOKEN or POLAR_SANDBOX_ACCESS_TOKEN."
  );
  process.exit(1);
}

const explicitBaseUrl = useProduction
  ? process.env.POLAR_API_BASE_URL
  : process.env.POLAR_SANDBOX_API_BASE_URL ?? process.env.POLAR_API_BASE_URL;

const polar = new Polar({
  accessToken,
  ...(explicitBaseUrl
    ? { serverURL: explicitBaseUrl }
    : { server: useProduction ? "production" : "sandbox" })
});

const PLAN_METADATA_KEY = "plan_id";

async function findProductByPlanId(planId) {
  const iterator = await polar.products.list({
    limit: 10,
    metadata: {
      [PLAN_METADATA_KEY]: planId
    }
  });

  for await (const page of iterator) {
    const items = page.result?.items ?? [];
    if (items.length > 0) {
      return items[0];
    }
  }

  return null;
}

async function createProduct(plan) {
  const result = await polar.products.create({
    name: plan.name,
    description: plan.description,
    recurringInterval: plan.recurringInterval,
    prices: [
      {
        amountType: "fixed",
        priceAmount: plan.priceCents,
        priceCurrency: plan.currency
      }
    ],
    metadata: {
      [PLAN_METADATA_KEY]: plan.planId,
      credits_per_cycle: plan.creditsPerCycle
    }
  });

  return result;
}

async function main() {
  console.log(
    `Seeding ${PRODUCT_CATALOG.length} products to Polar (${useProduction ? "production" : "sandbox"}).`
  );

  for (const plan of PRODUCT_CATALOG) {
    try {
      const existing = await findProductByPlanId(plan.planId);

      if (existing) {
        console.log(
          `✔ Plan "${plan.planId}" already exists (product ${existing.id}). Skipping.`
        );
        continue;
      }

      const created = await createProduct(plan);
      console.log(
        `✅ Created plan "${plan.planId}" (product ${created.id}) at ${plan.priceCents} ${plan.currency}.`
      );
    } catch (error) {
      console.error(`✖ Failed to provision plan "${plan.planId}":`, error);
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error("Unexpected error while creating Polar products:", error);
  process.exit(1);
});
