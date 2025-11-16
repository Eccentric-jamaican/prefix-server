import { Polar } from "@polar-sh/sdk";
import type { CheckoutCreate } from "@polar-sh/sdk/models/components/checkoutcreate";

export type PolarEnvironment = "sandbox" | "production";

export type PolarClientConfig = {
  environment?: PolarEnvironment;
  accessToken?: string;
  serverURL?: string;
};

export function createPolarClient(config: PolarClientConfig = {}) {
  const environment: PolarEnvironment = config.environment ??
    (process.env.POLAR_ENVIRONMENT === "production" ? "production" : "sandbox");

  const accessToken =
    config.accessToken ??
    (environment === "production"
      ? process.env.POLAR_ACCESS_TOKEN
      : process.env.POLAR_SANDBOX_ACCESS_TOKEN ?? process.env.POLAR_ACCESS_TOKEN);

  if (!accessToken) {
    throw new Error("Missing Polar access token. Set POLAR_ACCESS_TOKEN or POLAR_SANDBOX_ACCESS_TOKEN.");
  }

  const serverURL =
    config.serverURL ??
    (environment === "production"
      ? process.env.POLAR_API_BASE_URL
      : process.env.POLAR_SANDBOX_API_BASE_URL ?? process.env.POLAR_API_BASE_URL);

  return new Polar({
    accessToken,
    ...(serverURL ? { serverURL } : { server: environment })
  });
}

export type CreateCheckoutSessionParams = {
  customerId?: string;
  externalCustomerId?: string;
  productId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string | number | boolean>;
};

export type PolarCheckoutSession = {
  id: string;
  url: string;
  [key: string]: unknown;
};

export async function createCheckoutSession(
  params: CreateCheckoutSessionParams,
): Promise<PolarCheckoutSession> {
  const client = createPolarClient();

  const payload: CheckoutCreate = {
    successUrl: params.successUrl,
    returnUrl: params.cancelUrl,
    products: [params.productId],
    customerId: params.customerId,
    externalCustomerId: params.externalCustomerId,
    metadata: params.metadata,
  };

  const response = await client.checkouts.create(payload);

  if (!response || typeof response !== "object") {
    throw new Error("Polar checkout session response malformed.");
  }

  const { id, url } = response as { id?: unknown; url?: unknown };

  if (typeof id !== "string" || typeof url !== "string") {
    throw new Error("Polar checkout session missing id or url.");
  }

  return response as PolarCheckoutSession;
}
