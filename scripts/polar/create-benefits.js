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
const creditsMeterEnv = useProduction
  ? process.env.POLAR_CREDITS_METER_ID
  : process.env.POLAR_SANDBOX_CREDITS_METER_ID ?? process.env.POLAR_CREDITS_METER_ID;
const meterId = typeof creditsMeterEnv === "string" && creditsMeterEnv.trim().length > 0
  ? creditsMeterEnv.trim()
  : null;

async function findBenefitByPlanId(planId) {
  const iterator = await polar.benefits.list({
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

function buildBenefitPayload(plan) {
  const description = `${plan.name} credits (${plan.creditsPerCycle} / mo)`;
  const metadata = {
    [PLAN_METADATA_KEY]: plan.planId,
    credits_per_cycle: plan.creditsPerCycle,
    plan_name: plan.name
  };

  if (meterId) {
    return {
      type: "meter_credit",
      description,
      properties: {
        meterId,
        units: plan.creditsPerCycle,
        rollover: true
      },
      metadata
    };
  }

  return {
    type: "custom",
    description,
    properties: {
      note: `${plan.creditsPerCycle} credits per ${plan.recurringInterval}`
    },
    metadata
  };
}

async function createBenefit(plan) {
  const payload = buildBenefitPayload(plan);
  return await polar.benefits.create(payload);
}

async function ensureProductHasBenefit(productId, benefitId) {
  const product = await polar.products.get({ id: productId });
  const existingBenefitIds = (product.benefits ?? []).map((benefit) => benefit.id);

  if (existingBenefitIds.includes(benefitId)) {
    return false;
  }

  const nextBenefitIds = Array.from(new Set([...existingBenefitIds, benefitId]));
  await polar.products.updateBenefits({
    id: productId,
    productBenefitsUpdate: {
      benefits: nextBenefitIds
    }
  });

  return true;
}

async function main() {
  console.log(
    `Seeding benefits for ${PRODUCT_CATALOG.length} plans to Polar (${useProduction ? "production" : "sandbox"}).`
  );
  if (meterId) {
    console.log(`Using meter credit benefits with meter ID ${meterId}.`);
  } else {
    console.log("No meter ID configured; creating custom benefits with credit metadata.");
  }

  for (const plan of PRODUCT_CATALOG) {
    try {
      const product = await findProductByPlanId(plan.planId);
      if (!product) {
        console.error(`✖ No product found for plan "${plan.planId}". Seed products first.`);
        process.exitCode = 1;
        continue;
      }

      const existingBenefit = await findBenefitByPlanId(plan.planId);
      const benefit = existingBenefit ?? (await createBenefit(plan));

      if (existingBenefit) {
        console.log(
          `✔ Benefit for plan "${plan.planId}" already exists (benefit ${existingBenefit.id}).`
        );
      } else {
        console.log(
          `✅ Created benefit for plan "${plan.planId}" (benefit ${benefit.id}).`
        );
      }

      const attached = await ensureProductHasBenefit(product.id, benefit.id);
      if (attached) {
        console.log(
          `🔗 Attached benefit ${benefit.id} to product ${product.id} (${plan.planId}).`
        );
      } else {
        console.log(
          `✔ Product ${product.id} already grants benefit ${benefit.id} (${plan.planId}).`
        );
      }

      console.log(
        `→ Plan "${plan.planId}" ready (product ${product.id}, benefit ${benefit.id}, credits ${plan.creditsPerCycle}).`
      );
    } catch (error) {
      console.error(`✖ Failed to provision benefit for plan "${plan.planId}":`, error);
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error("Unexpected error while creating Polar benefits:", error);
  process.exit(1);
});
