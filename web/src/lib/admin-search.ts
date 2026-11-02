import type { OrderStatus } from "./order-timeline.ts";

/** What GET /admin/search returns; each group holds at most a handful of matches. */
export type SearchResults = {
  products: ProductResult[];
  orders: OrderResult[];
};

export type ProductResult = { id: number; name: string; category: string; thumbnail_url: string | null };

export type OrderResult = {
  number: number;
  customer_name: string;
  phone: string;
  total_paise: number;
  status: OrderStatus;
};

/** One tappable result, in the order the groups are shown. */
export type ResultRow =
  | { key: string; kind: "product"; href: string; product: ProductResult }
  | { key: string; kind: "order"; href: string; order: OrderResult };

/** The shortest query worth sending: one character, since a single digit or letter can be a number or a name. */
export const MIN_QUERY_LENGTH = 1;

/** How long to wait after typing before searching. */
export const SEARCH_DELAY_MS = 250;

export function isSearchable(query: string): boolean {
  return query.trim().length >= MIN_QUERY_LENGTH;
}

/** The results flattened into one list, for arrow-key movement: Products, then Orders. */
export function resultRows({ products, orders }: SearchResults): ResultRow[] {
  return [
    ...products.map((product): ResultRow => ({
      key: `product-${product.id}`,
      kind: "product",
      href: `/admin/products/${product.id}`,
      product,
    })),
    ...orders.map((order): ResultRow => ({
      key: `order-${order.number}`,
      kind: "order",
      href: `/admin/orders/${order.number}`,
      order,
    })),
  ];
}
