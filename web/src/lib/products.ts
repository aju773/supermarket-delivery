/** A Pack Option as the admin API returns it. Money is whole paise. */
export type PackOption = { id: number; code: string; label: string; price_paise: number; in_stock: boolean };

/** A Product as the admin API returns it, with only its visible Pack Options, in display order. */
export type Product = {
  id: number;
  name: string;
  category: { id: number; name: string };
  is_featured: boolean;
  is_visible: boolean;
  pack_options: PackOption[];
  /** Stable URLs of the WebP photo and its thumbnail, or null for the placeholder. */
  photo_url: string | null;
  thumbnail_url: string | null;
};

/** Products shown per page of the admin list; matches the API's page size. */
export const PRODUCTS_PAGE_SIZE = 25;
