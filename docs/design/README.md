# Design reference

Screenshots of the Google Stitch designs for delivery v1. Stitch project: "Supermarket Delivery v1" (`987454621397710355`).

## How to use these screens

- **The spec wins on what a screen contains.** Fields, buttons, wording and behaviour come from `.scratch/delivery-v1/spec.md`. Anything on a screenshot that isn't in the spec is not built.
- **Screenshots guide layout**: arrangement, spacing, visual weight and which card goes where.
- **Admin shell**: `admin-orders.png` (Admin Orders v2) is the reference for the admin top bar and sidebar on every admin page. Other admin screens are followed only for their page content.
- **Icons**: Stitch drew Material icons. Use the Phosphor icon that means the same thing.
- **Values**: never copy colours, sizes or other values from a screenshot or from Stitch's HTML. Use the design tokens (see the "Design tokens" section of the spec).
- **Phone admin screens on a wide canvas**: `admin-login.png`, `admin-orders-phone.png` and `admin-order-detail-phone.png` are phone layouts that Stitch drew on a desktop-width canvas. Read the centred column as the phone screen; the top bar and bottom tab bar items belong at the phone's edges.
- The customer site on wide screens has no screenshot; follow the spec (wider grid, cart button in the top bar).

## Screens

| File | Stitch screen | Stitch ID | Tickets |
| --- | --- | --- | --- |
| `screens/customer-home.png` | Fresh Mart - Home | `6dd1e927db6942d3b4191993da601dc9` | 01, 07 |
| `screens/customer-category.png` | Fresh Mart - Category (Vegetables) | `1e446bf2e5dd4bbf8851866f0afd4364` | 07, 08 |
| `screens/customer-product.png` | Fresh Mart - Product (Tomato) | `df42bff75e454d08b0007667bef48ecf` | 07 |
| `screens/customer-pack-size-sheet.png` | Fresh Mart - Category (Pack Size Sheet) | `8b5f3939cb1448698c43a79ad6761ea0` | 08 |
| `screens/customer-cart.png` | Fresh Mart - Cart | `ad75a466b10943519ef507b3503c6e57` | 08 |
| `screens/customer-checkout.png` | Fresh Mart - Checkout | `71b08b74171a48fcb887889e7db42bfb` | 09 |
| `screens/customer-checkout-price-change.png` | Fresh Mart - Checkout (Price Change Popup) | `6d68bade146f4409869a0fadfdadbeb5` | 10 |
| `screens/customer-order-placed.png` | Fresh Mart - Order Placed | `2edccdf82fe24b0cacc7f7f4a76c22cd` | 09 |
| `screens/customer-order-status.png` | Fresh Mart - Order Status | `66b01ae70409470aac6750601f7450d1` | 09, 12, 15 |
| `screens/customer-my-orders.png` | Fresh Mart - My Orders | `c469779554514f548012d824ab126d3e` | 17 |
| `screens/admin-login.png` | Fresh Mart - Staff Admin Login | `c79b725086874ca2a9b49fc0458b9963` | 02 |
| `screens/admin-orders.png` | Fresh Mart - Admin Orders v2 | `b04601cad94e4dc1b1b687c7396a627c` | 02, 11, 13, 14 |
| `screens/admin-orders-phone.png` | Fresh Mart - Staff Admin Orders (Mobile) | `cca38fe0121445718a4ce8dde90b079b` | 02, 11, 13, 14 |
| `screens/admin-global-search.png` | Fresh Mart - Admin Global Search v2 | `755e77981839434996ff641ab5dbabdf` | 16 |
| `screens/admin-order-detail.png` | Fresh Mart - Staff Admin Order Detail | `23294cd096c24f02b2b90828c62b3627` | 11, 12, 15 |
| `screens/admin-order-detail-phone.png` | Fresh Mart - Staff Admin Order Detail (Mobile) | `477e3d8a8d2142919f3910171831decd` | 11, 12 |
| `screens/admin-products.png` | Fresh Mart - Admin Products v2 | `2be31eb08bdd42c58d71e7afa2a325f6` | 05 |
| `screens/admin-product-editor.png` | Fresh Mart - Admin Product Editor v2 | `85da317a47d64580864fd5eeab9a517e` | 05, 06 |
| `screens/admin-categories.png` | Fresh Mart - Staff Admin Categories | `5d9c12b6554745bbbf71979245a2ef5a` | 04 |
| `screens/admin-import-csv.png` | Fresh Mart - Staff Admin Import | `aa220948750e45f8b665f28cb10b3a3e` | 18 |
| `screens/admin-import-photos.png` | Fresh Mart - Staff Admin Import (Photos) | `cb8102d78eb848119894f891d95032ba` | 19 |
| `screens/admin-settings.png` | Fresh Mart - Staff Admin Settings | `d5b3caf5a74a41bc89f0b31d413e7caa` | 03 |
| `screens/admin-staff.png` | Fresh Mart - Admin Staff v2 | `480156627a3d49d6a94c64096f0c9075` | 20 |
| `screens/admin-change-password.png` | Fresh Mart - Admin Change Password v2 | `bf66bf82abee41e5b6d5ce9a248475a6` | 02 |

## Starting token values

The token file is seeded once from the Stitch design system ("Supermarket Delivery"), then owns these values. Stitch is not updated afterwards.

- Font: Inter
- Corner rounding: 12px for cards
- Top bar: near-black `#1A1A1A`
- Page: light grey `#F1F1F1`
- Cards: white with hairline borders
- Main buttons: black
- Brand colour: fresh green `#16A34A`
- Status badges: New amber, Confirmed blue, Out for delivery purple, Delivered green, Cancelled grey

Any value that fails the WCAG AA contrast check is adjusted in the token file.
