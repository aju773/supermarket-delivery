"use client";

import { addOrderToken, type CustomerDetails, parseCustomerDetails, parseOrderTokens } from "@/lib/customer";

// Kept in localStorage like the Cart. Every read and write is guarded: with storage blocked checkout
// still works, the details just aren't remembered.
const DETAILS_KEY = "customer";
const ORDERS_KEY = "orders";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable or full.
  }
}

export function loadCustomerDetails(): CustomerDetails | null {
  return parseCustomerDetails(read(DETAILS_KEY));
}

/** Remembers the details and the new Order's token after a successful checkout. */
export function rememberOrder(details: CustomerDetails, token: string): void {
  write(DETAILS_KEY, details);
  write(ORDERS_KEY, addOrderToken(parseOrderTokens(read(ORDERS_KEY)), token));
}

/** The tokens of the Orders placed from this phone, newest first; none when storage is unavailable. */
export function loadOrderTokens(): string[] {
  return parseOrderTokens(read(ORDERS_KEY));
}
