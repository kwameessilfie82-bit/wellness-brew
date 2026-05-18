import "server-only";

const PAYSTACK_BASE = "https://api.paystack.co";

function getSecretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured");
  }
  return key;
}

export function isPaystackConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

export type PaystackInitializeInput = {
  email: string;
  amountPesewas: number;
  reference: string;
  channels?: ("card" | "mobile_money")[];
  metadata?: Record<string, unknown>;
  callbackUrl?: string;
};

export async function initializePaystackTransaction(
  input: PaystackInitializeInput,
) {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountPesewas,
      reference: input.reference,
      currency: "GHS",
      channels: input.channels ?? ["card", "mobile_money"],
      metadata: input.metadata,
      callback_url: input.callbackUrl,
    }),
  });

  const data = (await res.json()) as {
    status?: boolean;
    message?: string;
    data?: {
      authorization_url: string;
      access_code: string;
      reference: string;
    };
  };

  if (!res.ok || !data.status || !data.data?.authorization_url) {
    throw new Error(data.message ?? "Failed to initialize Paystack payment");
  }

  return data.data;
}

export async function verifyPaystackTransaction(reference: string) {
  const res = await fetch(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${getSecretKey()}`,
      },
    },
  );

  const data = (await res.json()) as {
    status?: boolean;
    message?: string;
    data?: {
      status: string;
      reference: string;
      amount: number;
      currency: string;
      channel: string;
      metadata?: { order_id?: string };
    };
  };

  if (!res.ok || !data.status) {
    throw new Error(data.message ?? "Failed to verify Paystack payment");
  }

  return data.data!;
}
