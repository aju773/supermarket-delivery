"use client";

import { useSyncExternalStore } from "react";

import { type CartItem, type CartLine, parseCart, setQuantity } from "@/lib/cart";

// The Cart lives in localStorage so it survives closing the browser. Every read and write is guarded: in a
// private window or with storage blocked the Cart still works for the visit, it just isn't kept.
const STORAGE_KEY = "cart";
const EMPTY: CartLine[] = [];

let cart: CartLine[] | null = null;
const listeners = new Set<() => void>();

function readStored(): CartLine[] {
  try {
    return parseCart(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): CartLine[] {
  cart ??= readStored();
  return cart;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab changed the Cart.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    cart = readStored();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function setCartQuantity(item: CartItem, quantity: number): void {
  save(setQuantity(getSnapshot(), item, quantity));
}

/** Empties the Cart, after an Order is placed. */
export function clearCart(): void {
  save(EMPTY);
}

function save(lines: CartLine[]): void {
  cart = lines;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Storage unavailable or full: keep the in-memory Cart.
  }
  listeners.forEach((listener) => listener());
}

/** The Cart; empty during server rendering and hydration, then the stored one. */
export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

const noSubscription = () => () => {};

/** False during server rendering and hydration, when the stored Cart isn't read yet. */
export function useCartLoaded(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
}
