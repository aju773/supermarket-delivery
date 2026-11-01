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
};

/** Products shown per page of the admin list; matches the API's page size. */
export const PRODUCTS_PAGE_SIZE = 25;
