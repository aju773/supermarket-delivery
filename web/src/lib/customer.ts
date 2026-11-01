/**
 * What the customer's phone remembers between orders: their details for pre-filling checkout, and the
 * public tokens of the Orders placed from it. No imports, so `node --test` can run its tests directly.
 */
export type PaymentMethod = "cash" | "upi";

/** The checkout fields filled in automatically next time; the note is for one Order only. */
export type CustomerDetails = {
  name: string;
  phone: string;
  deliveryAreaId: number | null;
  address: string;
  landmark: string;
  paymentMethod: PaymentMethod;
};

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function parseCustomerDetails(raw: string | null): CustomerDetails | null {
  const value = parseJson(raw);
  if (typeof value !== "object" || value === null) return null;
  const details = value as Record<string, unknown>;
  const valid =
    typeof details.name === "string" &&
    typeof details.phone === "string" &&
    (details.deliveryAreaId === null || Number.isInteger(details.deliveryAreaId)) &&
    typeof details.address === "string" &&
    typeof details.landmark === "string" &&
    (details.paymentMethod === "cash" || details.paymentMethod === "upi");
  if (!valid) return null;
  const { name, phone, deliveryAreaId, address, landmark, paymentMethod } = details as CustomerDetails;
  return { name, phone, deliveryAreaId, address, landmark, paymentMethod };
}

export function parseOrderTokens(raw: string | null): string[] {
  const value = parseJson(raw);
  return Array.isArray(value) ? value.filter((token): token is string => typeof token === "string" && token !== "") : [];
}

/** The tokens with this one first, newest first. */
export function addOrderToken(tokens: string[], token: string): string[] {
  return [token, ...tokens.filter((existing) => existing !== token)];
}
