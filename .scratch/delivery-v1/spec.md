# Spec: Supermarket Delivery Ordering Website

Status: ready-for-agent

## Problem Statement

A local supermarket delivers groceries to houses nearby. Today every order arrives by phone: a customer calls, an employee writes the items and address on paper, and someone delivers it. This is slow for both sides. Customers can't see what the shop stocks, what things cost, or whether an item is available, so calls take a long time and orders get misheard. Staff are tied to the phone during busy hours, handwritten orders get lost or misread, and there is no single list of what has been ordered, confirmed, or delivered.

## Solution

A mobile-friendly website for the shop with two sides:

- **Customer site.** Customers browse the shop's full catalog with photos and prices, add items to a cart, enter their name, phone and address, and submit the order. Payment is cash or UPI at delivery. There are no accounts, no location services and no tracking. The customer gets an order number and a private status link, and can see past orders and reorder from the same phone.
- **Staff admin.** Staff log in to a custom admin that is easy to use on a phone. A live orders list plays a loud sound when an order arrives or is cancelled. Staff confirm, edit and progress orders, find any order by number or phone, keep the catalog up to date (prices, photos, in/out of stock), import products from a CSV file, bulk-upload photos, manage delivery settings, and manage staff accounts.
- **Look and feel.** The admin follows the clean back-office style of the Shopify admin: near-black top bar with search, grey page, white rounded cards, a left sidebar on wide screens and a bottom tab bar on phones. The customer site shares the same fonts, colours, icons and cards, but uses the quick-delivery shopping layout Indian customers already know: a two-column product grid, one-tap Add that turns into a quantity counter, and a sticky cart bar.

## Domain Vocabulary

- **Product**: something the shop sells, shown as one card to customers (e.g. "Tomato"). It belongs to one **Category**, has an optional photo, and can be **featured**.
- **Pack Option**: a purchasable size of a Product (e.g. "500 g") with its own **code**, price and in-stock flag. Every Product has at least one. The code is unique and comes from the billing software (usually the barcode).
- **Category**: a group of Products shown as a tile on the home page.
- **Cart**: the customer's chosen Pack Options and quantities, stored only on their phone.
- **Order**: a submitted Cart plus customer details. It has a **status**, a **public token** used for the **Status Link**, and an immutable **Original Request** snapshot.
- **Order Line**: one Pack Option and quantity on an Order, with the name and unit price copied at the time it was added.
- **Original Request**: the lines exactly as the customer submitted them, kept unchanged after staff edits.
- **Status Link**: a private, unguessable URL that shows one Order's status without logging in.
- **First-Time Customer**: a phone number with no earlier Delivered Order.
- **Delivery Area**: a named area or colony the shop delivers to, chosen from a dropdown at checkout.
- **Shop Settings**: one set of settings for the shop: minimum order amount, delivery charge, delivery hours, shop phone number, and the orders-per-hour limit.
- **Staff Member**: a person who can log in to the admin. Everyone has the same access.

## User Stories

### Browsing

1. As a customer, I want to open the shop website on my phone and have it load quickly, so that I can order without installing an app.
2. As a customer, I want to see the shop's delivery hours, minimum order amount and phone number on the home page, so that I know the rules before I start.
3. As a customer, I want to see a grid of categories on the home page, so that I can jump to the kind of item I need.
4. As a customer, I want to see a row of featured or popular items on the home page, so that I can quickly add common things.
5. As a customer, I want to search products by name, so that I can find a specific item without browsing.
6. As a customer, I want search to ignore upper and lower case, so that "milk" finds "Milk".
7. As a customer, I want to open a category and see all its products, so that I can browse that section like a shop aisle.
8. As a customer, I want to see a photo of each product, so that I can recognise the brand and pack.
9. As a customer, I want a placeholder image for products without a photo, so that the page still looks tidy.
10. As a customer, I want to see the price of every pack size, so that I know what I will pay.
11. As a customer, I want to choose a pack size (e.g. 250 g / 500 g / 1 kg) on the product card, so that I can buy the quantity I need.
12. As a customer, I want out-of-stock items shown greyed out and marked "Out of stock", so that I know the shop normally carries them but can't add them now.
13. As a customer, I want to see a note that the final amount is confirmed at delivery, so that I'm not surprised if loose items differ slightly.

### Cart

14. As a customer, I want to add a pack option to my cart with one tap, so that ordering is quick.
15. As a customer, I want to change the quantity or remove items in my cart, so that I can fix mistakes.
16. As a customer, I want to see a running cart total and item count from any page, so that I keep track of my spending.
17. As a customer, I want my cart kept if I close the browser and come back later, so that I don't lose what I picked.
18. As a customer, I want to see the delivery charge and how far I am below the minimum order amount, so that I know whether I can check out.
19. As a customer, I want to be blocked from checking out below the minimum order amount, with a clear message, so that I understand why.

### Checkout

20. As a customer, I want to enter my name and phone number, so that the shop can contact me.
21. As a customer, I want to pick my area from a dropdown, so that I only order if the shop delivers to me.
22. As a customer, I want to type my house and street address and a landmark, so that the delivery person can find my house without maps.
23. As a customer, I want to add a note for the shop (e.g. "ring the bell twice", "green chillies, not red"), so that special requests reach the staff.
24. As a customer, I want to choose Cash or UPI as my payment at delivery, so that the delivery person brings change or a QR code.
25. As a customer, I want my name, phone, area and address filled in automatically next time, so that repeat orders are fast.
26. As a customer, I want to be told before the order goes through if a price changed or an item went out of stock since I added it, so that I'm never charged an amount I didn't see.
27. As a customer, I want to confirm or go back after seeing those changes, so that I stay in control of the order.
28. As a customer ordering outside delivery hours, I want to be told my order will be delivered from the next opening time, so that I know when to expect it.
29. As a customer, I want a clear error if I place too many orders in a short time, so that I understand why my order wasn't accepted.

### After ordering

30. As a customer, I want an order confirmation screen with my order number, items, total and payment method, so that I have a record.
31. As a customer, I want a private status link for my order, so that I can check it later without an account.
32. As a customer, I want the status page to show where my order is (New, Confirmed, Out for delivery, Delivered or Cancelled), so that I know when to expect it.
33. As a customer, I want the status page to show the final items and total if staff changed my order, so that I know what is coming and what I'll pay.
34. As a customer, I want to cancel my order from the status link while it is New or Confirmed, so that I don't have to phone the shop.
35. As a customer whose order is already out for delivery, I want the status page to show the shop's phone number instead of a cancel button, so that I can call if needed.
36. As a customer, I want a "My orders" page listing orders placed from this phone, so that I can find past orders.
37. As a customer, I want to tap Reorder on a past order and have its items placed in my cart at current prices, so that weekly shopping takes seconds.
38. As a customer, I want Reorder to skip items that are no longer sold or are out of stock and tell me which ones, so that I'm not confused.

### Staff: orders

39. As a staff member, I want to log in to the admin with a username and password, so that only shop staff can see orders and change the catalog.
40. As a staff member, I want to stay logged in on the shop phone, so that I don't have to log in every time.
41. As a staff member, I want a live orders list that updates on its own, so that I don't have to keep refreshing.
42. As a staff member, I want a loud sound when a new order arrives, so that I notice it while serving in the shop.
43. As a staff member, I want a sound when a customer cancels an order, so that I stop packing it.
44. As a staff member, I want a clear "Start alerts" button that enables the sound, so that the browser actually allows it to play.
45. As a staff member, I want orders from first-time customers marked "Call to confirm", so that I phone new customers before packing.
46. As a staff member, I want orders from repeat customers confirmed automatically, so that I don't waste time calling regulars.
47. As a staff member, I want to filter the orders list by status, so that I can focus on what needs action.
48. As a staff member, I want four tiles at the top of the orders page (today's orders, today's sales, orders waiting to confirm, orders out for delivery), so that the owner knows how the day is going and staff see what needs action.
49. As a staff member, I want an order detail page with the customer's name, phone (tap to call), area, address, landmark, note, payment method, items and total, so that I have everything needed to pack and deliver.
50. As a staff member, I want to see whether an order was placed outside delivery hours, so that I can plan deliveries for opening time.
51. As a staff member, I want to move an order through Confirmed → Out for delivery → Delivered with one tap each, so that the status stays accurate.
52. As a staff member, I want to cancel an order that isn't delivered yet, so that I can handle fake or impossible orders.
53. As a staff member, I want to remove an item, change its quantity or swap it for a different product while the order is New or Confirmed, so that I can handle out-of-stock items or brand changes agreed on the phone.
54. As a staff member, I want the total recalculated automatically after edits, so that the delivery person collects the right amount.
55. As a staff member, I want to see the customer's Original Request next to the current items, so that I know exactly what was changed.
56. As a staff member, I want to see who changed each order status and when, so that we can sort out disputes.

### Staff: catalog

57. As a staff member, I want to search products by name or code in the admin, so that I can find one quickly at the counter.
58. As a staff member, I want to flip a pack option's in-stock switch with one tap from the product list, so that sold-out items disappear from ordering immediately.
59. As a staff member, I want to add a new product with a name, category and one or more pack options (each with a code, label and price), so that new stock can be sold online.
60. As a staff member, I want to edit a product's name, category, pack options and prices, so that the website matches the shelf.
61. As a staff member, I want to mark a product as featured, so that it shows in the home page popular row.
62. As a staff member, I want to hide a product completely without deleting it, so that discontinued items disappear but old orders still make sense.
63. As a staff member, I want to upload or replace a product's photo from my phone's camera or gallery, so that I can photograph items on the shelf.
64. As a staff member, I want uploaded photos resized and compressed automatically, so that the customer site stays fast on mobile data.
65. As a staff member, I want to add, rename, reorder and hide categories, so that the home page grid matches how the shop is organised.
66. As a staff member, I want to upload a CSV export of products and see a preview of what will be created, updated or rejected before anything is saved, so that a bad file can't ruin the catalog.
67. As a staff member, I want CSV rows that share a group value merged into one product with several pack options, so that "Tomato 250 g / 500 g / 1 kg" becomes one card.
68. As a staff member, I want re-importing a CSV to update existing pack options by code instead of duplicating them, so that I can refresh prices from the billing software.
69. As a staff member, I want to upload many photos at once, matched to products by file name = pack option code, so that I don't attach 500 photos one by one.
70. As a staff member, I want a report of photo files that didn't match any code, so that I can rename and retry them.

### Staff: settings and accounts

71. As a staff member, I want to manage the list of delivery areas (add, rename, disable), so that the checkout dropdown only offers areas we serve.
72. As a staff member, I want to set the minimum order amount and delivery charge, so that small orders stay worth delivering.
73. As a staff member, I want to set delivery opening and closing times, so that customers know when orders will arrive.
74. As a staff member, I want to set the shop phone number shown to customers, so that they can call us.
75. As a staff member, I want to set how many orders one phone number can place per hour, so that prank orders are limited.
76. As a staff member, I want to see a list of staff accounts, so that I know who has access.
77. As a staff member, I want to add a staff account, so that a new employee can log in.
78. As a staff member, I want to reset another staff member's password, so that someone who forgot it can get back in.
79. As a staff member, I want to deactivate a staff account instead of deleting it, so that a former employee loses access but order history still shows their name.
80. As a staff member, I want to be stopped from deactivating my own account or the last active account, so that the shop can never be locked out of the admin.
81. As a staff member, I want to change my own password, so that I can keep my account secure.
82. As a staff member, I want to log out, so that a shared phone isn't left signed in.

### Customer site look and feel

83. As a customer, I want an Add button on each product card that turns into a − 1 + counter, so that I can change quantities without leaving the page.
84. As a customer, I want a bar fixed to the bottom of the screen showing my item count, cart total and "View cart", so that checkout is always one tap away.
85. As a customer, I want to tap the pack size on a card and choose from a panel that slides up listing every pack with its price, so that I can pick a size without leaving the list.
86. As a customer, I want products with only one pack size to add straight from the card, so that I don't get an extra step.
87. As a customer, I want to tap a product photo and see a larger photo with all its pack sizes, so that I can check the brand before buying.
88. As a customer, I want a row of category buttons along the top of a category page, so that I can switch aisles without going back home.
89. As a customer, I want my order status page to show a timeline (Placed, Confirmed, Out for delivery, Delivered) with times, so that I can see at a glance how far my order has got.
90. As a customer on a computer, I want the same shop in a wider grid with a cart button in the top bar, so that ordering from a laptop works too.

### Staff admin look and feel

91. As a staff member, I want to search from the top bar for a product by name or code, or an order by order number or customer phone, so that I can answer "where's my order?" calls quickly.
92. As a staff member on the shop phone, I want a bottom tab bar for Orders, Products, Settings and More, so that the pages I use most are one tap away.
93. As a staff member, I want a count badge on Orders showing how many orders are New, so that I see waiting work from any page.
94. As a staff member, I want each order's status shown as a coloured badge with its name, so that I can scan the list quickly.
95. As a staff member on the shop phone, I want a large button at the bottom of an order for its next step (Confirm order, Out for delivery, Mark delivered), with Cancel tucked in a menu, so that I move orders along with my thumb and don't cancel by accident.
96. As a staff member, I want a short message after each save and a confirmation popup before cancelling an order, deactivating staff or applying a CSV import, so that I know what happened and can't make hard-to-undo mistakes by accident.

## Implementation Decisions

### Architecture

- **Backend:** Django with a Django Ninja API and a PostgreSQL database. All business rules live in the backend; the frontend never decides prices, totals, status transitions or permissions.
- **Frontend:** a single Next.js app (App Router) with two areas: the public customer site and the staff admin under an `/admin` path. Django's built-in admin is not used by staff.
- **One domain:** a reverse proxy sends `/api` to Django and everything else to Next.js, so cookies work without cross-domain setup.
- **API split:** public endpoints (catalog, shop info, checkout, order status, cancel, reorder lookup) need no login. Admin endpoints under an admin API prefix need a staff session.
- **Admin authentication:** Django session cookie plus CSRF protection, using Ninja's session authentication. Login and logout go through API endpoints. Sessions last a long time (e.g. 30 days) so the shop phone stays signed in.
- **Local development:** Docker Compose runs Postgres, Django and Next.js. Configuration comes from environment variables, documented in `.env.example`.
- **Timezone:** one shop timezone setting, defaulting to Asia/Kolkata. "Today" and delivery hours are calculated in it.
- **Money:** stored as whole paise (integers) everywhere, formatted as ₹ only for display.

### Backend modules

- **Catalog**: Category, Product, Pack Option.
  - Category: name, display order, visible flag.
  - Product: name, category, featured flag, visible flag, optional photo (processed into a full size and a thumbnail, stored as WebP).
  - Pack Option: product, unique code, label (e.g. "500 g"), price, in-stock flag, display order.
  - A product is shown to customers only if it and its category are visible and it has at least one pack option. Out-of-stock pack options are shown but can't be ordered.
  - Products and pack options are hidden, never deleted, once any order refers to them.
  - Interface: catalog queries (home data, category listing, search, product lookup by pack option IDs) and admin commands (create/update product and options, toggle stock, set photo).
- **Shop Settings**: one settings record (minimum order, delivery charge, opening time, closing time, shop phone, orders-per-hour limit, timezone) plus Delivery Areas (name, display order, active flag). Exposes "is the shop open now?" and "next opening time".
- **Checkout**: one entry point that takes a submitted cart and customer details and either creates an Order or returns a list of problems. Steps, in order:
  1. Validate the customer fields: name, phone (normalised to 10-digit Indian mobile), active delivery area, address, payment method (`cash` or `upi`), optional landmark and note.
  2. Check the orders-per-hour limit for that phone number.
  3. Look up every cart line's pack option and compare its current price and stock with the price the customer saw.
  4. If anything differs, reject with a structured list of changes. Each change is one of `price_changed` (old/new), `out_of_stock` or `unavailable`. Nothing is created. The client shows the changes, updates the cart, and resubmits after the customer confirms.
  5. Check the minimum order against the subtotal at server prices.
  6. Create the Order with Order Lines (name, pack label and unit price copied), the Original Request snapshot, delivery charge, total, a random public token, and an "after hours" flag if the shop is closed.
  7. Set the starting status: **New** for a First-Time Customer, **Confirmed** otherwise.
- **Orders**: the order state machine, edits and queries.
  - Statuses and allowed transitions:
    - `new → confirmed`
    - `confirmed → out_for_delivery`
    - `out_for_delivery → delivered`
    - `new | confirmed | out_for_delivery → cancelled` (by staff)
    - `new | confirmed → cancelled` (by the customer, through the token)
  - Every transition is saved in a status history with the time and who made it (staff member or "customer"). Invalid transitions are rejected.
  - Line edits (change quantity, remove a line, add or swap in a pack option at its current price) are allowed only in `new` or `confirmed`. The total is recalculated after each edit. The Original Request is never changed.
  - Admin queries:
    - The list, filtered by status.
    - Search by order number (exact) or customer phone (normalised the same way as at checkout).
    - A polling endpoint that returns orders created or cancelled since a given cursor. The client polls about every 5 seconds and plays a sound on new or cancelled ones.
    - The summary for the four tiles: today's order count and today's sales total (both counting orders created today and excluding cancelled ones), plus the current number of orders in `new` and in `out_for_delivery`. The `new` count also drives the Orders badge.
  - Public query: an order by public token (status, current lines, total, payment method, shop phone, whether it can be cancelled).
- **Staff Accounts**: built on Django's user model, using the active flag.
  - Operations: list, create, reset password, change own password, deactivate, reactivate.
  - Rules: no one deactivates their own account; the last active account can't be deactivated; accounts are never deleted.
  - The first account is created from the server command line.
- **Bulk Import**:
  - **CSV import:** columns `code`, `name`, `category`, `pack_label`, `price`, plus optional `group` and `in_stock`. Two phases: *preview* (parse, validate, report creates, updates and row errors without saving) and *apply* (all or nothing in one transaction).
    - Rows with the same `group` become one Product with several Pack Options. Rows without a group become a single-option Product.
    - Existing pack options are matched by `code` and updated.
    - Categories are created by name if they don't exist.
  - **Bulk photo upload:** accepts many image files (or a zip). Each file name without its extension is matched to a pack option code, and the photo is set on that option's product. Unmatched files are reported back.

### Frontend

- **Customer site:**
  - **Pages:** home, category, search results, product, cart, checkout, order confirmation and status (by token), and "My orders".
  - **Rendering:** catalog pages are rendered on the server, with short caching, for fast first load on slow mobile networks.
  - **On the customer's phone (localStorage):** the cart (pack option ID, quantity and the price seen), the customer details for pre-filling checkout, and the list of placed order tokens for "My orders". All reads and writes handle localStorage being unavailable.
  - **Reorder:** loads the order through its token and adds its current lines to the cart at current prices, skipping and listing any lines that can't be ordered.
- **Staff admin:**
  - **Pages:** login, orders list (live), order detail, products list, product editor, categories, CSV import, bulk photos, settings (shop settings and delivery areas), staff accounts, and change password.
  - **Layout:** mobile-first, with large tap targets.
  - **Alert sound:** needs a one-time "Start alerts" tap because browsers block sound until the user interacts with the page.

### UI and UX

- **Design system:**
  - **Components:** Tailwind CSS with shadcn/ui components, copied into the project and restyled. Shopify's Polaris components, icons and illustrations are not used: their licence only covers apps that integrate with Shopify. We copy the general style, not Shopify's assets or branding.
  - **Icons:** Phosphor Icons. Regular weight everywhere; fill weight for the active navigation item.
  - **Font:** Inter, served from our own server (no outside font service). Numbers use tabular figures so prices and totals line up.
  - **Type sizes:** 14 px body in the admin, 16 px body on the customer site, and 16 px for every form input so phones don't zoom in on focus.
  - **Colours:** near-black top bar, light grey page, white cards with rounded corners and hairline borders, black main buttons. One accent colour (fresh green by default, or the shop's brand colour) for Add, the cart bar and success states.
  - **Light mode only.**
  - **Shared colour and type settings:** the admin and the customer site use the same colours, fonts, icons and components, so the two sides look like one product.
- **Customer site:**
  - **Top bar:** shop logo and name, call-the-shop button, link to "My orders". Wide screens add a cart button with a count.
  - **Home:** search box, an info strip (open/closed now, delivery hours, minimum order), category tiles, and a "Popular" row of featured products.
  - **Product cards:** two columns on phones, 4–6 on wide screens. Each shows photo (or a grey placeholder with a basket icon), name, pack label, price, and an Add button that turns into a − 1 + counter.
  - **Pack sizes:**
    - Product with more than one Pack Option: the card shows one pack with a ▾. Tapping it opens a panel that slides up from the bottom, listing every pack with its price and its own Add/counter.
    - Product with one Pack Option: adds straight from the card.
  - **Out of stock:** greyed out and labelled "Out of stock", with no Add button.
  - **Product page:** large photo and the pack list. It has its own link.
  - **Category page:** a row of category buttons along the top that scrolls sideways.
  - **Cart bar:** fixed to the bottom on phones ("3 items · ₹245 · View cart"), shown whenever the Cart isn't empty.
  - **Cart:** a full page with lines, minimum-order message, delivery charge, total and the "final amount confirmed at delivery" note.
  - **Checkout:** one page with customer details (pre-filled), a short order summary and a sticky "Place order · ₹total" button. Price and stock changes from the server appear in a popup that lists them, with Confirm and Go back.
  - **Status page:** a vertical timeline (Placed, Confirmed, Out for delivery, Delivered, or Cancelled) with times, then the current lines and total. At the bottom: Cancel while allowed, otherwise "Call the shop".
- **Staff admin:**
  - **Wide screens:** near-black top bar (shop name, global search, account menu) and a light grey left sidebar with icons: Orders (with a count badge of New orders), Products, Categories, Import, Settings, Staff.
  - **Phones:** the sidebar becomes a slide-out menu behind ☰, plus a bottom tab bar: Orders, Products, Settings, More.
  - **Global search:** finds Products by name or pack option code, and Orders by order number or customer phone. Results are grouped by type.
  - **Landing page:** Orders.
    - Four metric tiles: Today's orders, Today's sales, Waiting to confirm, Out for delivery.
    - The "Start alerts" control and status filter buttons.
    - The list itself: cards on phones (order number, name, area, total, time, status badge, "Call to confirm" tag), a table with the same columns on wide screens.
  - **Status badges:** small rounded labels that always include the status name. New amber, Confirmed blue, Out for delivery purple, Delivered green, Cancelled grey. A separate grey "After hours" tag with a moon icon.
  - **Order detail:**
    - Wide screens use two columns. Left: the lines card (with Edit and totals), the Original Request beside the current lines when they differ, and status history. Right: the customer card with tap-to-call phone, area, address, landmark, note and payment method.
    - Phones stack the same cards and add a sticky button for the next transition: "Confirm order", "Out for delivery" or "Mark delivered". Cancel lives in a ⋯ menu.
  - **Products list:** thumbnail, name, category, and each Pack Option with its price and an in-stock switch right on the row. Search and a category filter at the top. Hidden products show a grey "Hidden" badge. Tapping a row opens the product editor.
  - **Other screens** (login, categories, CSV import preview, bulk photos, settings, staff accounts, change password) use the same white cards on grey, the same tables/cards and the same feedback patterns.
- **Feedback patterns (both sides):**
  - Short toast messages after saves ("Product saved", "Order confirmed").
  - Confirmation popups only for actions that are hard to undo: cancelling an Order, deactivating a Staff Member, applying a CSV import.
  - Grey placeholder blocks (skeletons) while pages load, not spinners.
  - Empty screens show an icon, one line of text and an action button.
- **Accessibility baseline:**
  - Tap targets of at least 44 px.
  - Text contrast that meets WCAG AA.
  - A visible focus outline on keyboard focus.
  - A screen-reader label on every icon-only button.
  - Status and prices never shown by colour alone.

### API contract notes

- The checkout response is either `201` with the order number and public token, or `409` with a list of `changes`, or `422` with field errors. The rate limit returns `429`.
- The public token is a long random value, separate from the order number. Order numbers are short and sequential for staff and customers to read aloud on the phone.
- Admin list endpoints are paginated. Product search matches names case-insensitively, or an exact pack option code.

## Testing Decisions

- **What makes a good test:** it uses the system the way a client does and checks only the visible result: responses, and what is later returned by other endpoints. It does not check internal tables, private functions or how things are built. A test should still pass after an internal refactor that keeps behaviour the same.
- **Main test seam: the HTTP API.** Almost all tests go through the Django Ninja API using its test client, against a real Postgres database (in Docker), with pytest and pytest-django. This one seam covers every business rule, so the frontend can stay thin.
  - **Catalog:** visibility rules, search (case-insensitive, exact code), out-of-stock shown but not orderable.
  - **Checkout:**
    - happy path
    - each change type (`price_changed`, `out_of_stock`, `unavailable`) returning `409` and creating nothing
    - minimum order
    - inactive delivery area
    - phone number normalisation
    - orders-per-hour limit (`429`)
    - after-hours flag
    - First-Time Customer → `new`, repeat customer → `confirmed`
  - **Order state machine:** every allowed and rejected transition, by staff and by the customer through the token; status history recorded.
  - **Order edits:** allowed only in `new` and `confirmed`; totals recalculated; Original Request unchanged.
  - **Live polling:** new and cancelled orders returned after the cursor.
  - **Orders summary:** today's count and sales exclude cancelled orders and respect the shop timezone; the waiting-to-confirm and out-for-delivery counts match the current statuses.
  - **Order search:** finds an order by exact order number and by phone in any accepted format; returns nothing for unknown values; rejects anonymous requests.
  - **Staff accounts:** admin endpoints reject anonymous requests and those without a CSRF token; the self-deactivation and last-active-account guards; deactivated users can't log in.
  - **CSV import:** the preview saves nothing; grouping; updates by code; all or nothing on errors.
  - **Bulk photos:** matching by code; unmatched files reported; images resized and converted.
- **Thin end-to-end layer:** a few Playwright tests against the full Docker Compose stack for the flows that depend on the browser:
  - customer browses, adds to cart, checks out and sees the status page
  - checkout shows the price-change prompt and resubmits
  - staff logs in, sees the new order appear in the live list, and moves it to Delivered
  - "My orders" and Reorder work from the stored tokens
- **Not tested directly:** frontend component internals and styling. The Playwright flows run on a phone-sized screen, so they exercise the mobile layout (cart bar, pack-size panel, sticky next-step button) on the way.
- **Prior art:** none yet. This is a new repository, so these tests set the pattern.

## Out of Scope

- Online payment and payment gateways (payment is cash or UPI at delivery only)
- WhatsApp messages of any kind, SMS and email notifications
- Location services, maps, GPS and delivery tracking
- Customer accounts, login and OTP checks
- Exact stock counts and stock that decreases with each order
- Automatic sync with the shop's billing software (CSV import only)
- A staff screen for entering phone orders (planned for version 2)
- Delivery time slots (as soon as possible only)
- More than one shop
- Languages other than English
- Different staff roles or permission levels
- Offers, discount codes and coupons
- Sales reports beyond the "today" summary
- A native mobile app
- Dark mode
- Shopify's Polaris components, icons, illustrations or branding
- Custom illustrations for empty states
- Sales or visitor charts on the admin (only the four Orders tiles)

## Further Notes

- **Build order** (everything runs locally until step 7):
  1. Base setup, including the design system (shared colours and type, Inter, Phosphor, shadcn/ui) and both page shells: the customer top bar with cart bar, and the admin top bar with sidebar and bottom tab bar
  2. Catalog and settings, with their admin screens
  3. Customer site
  4. Orders admin
  5. CSV import and bulk photos (needs the real export from the billing software)
  6. Staff accounts screen
  7. Deployment
  8. Optional Telegram alert bot
- **Deployment (later phase):**
  - **Server:** the developer's free-tier Oracle Ampere A1 (ARM) server, running Docker Compose with Caddy for automatic HTTPS.
  - **Images:** built for ARM by GitHub Actions, never on the server.
  - **Backups:** nightly backups of Postgres and photos to Oracle Object Storage and one copy off Oracle, with a tested restore. This matters because Oracle may reclaim always-free servers that sit idle.
  - **Handover:** the shop's data lives in the developer's personal Oracle account, so plan a handover or move if that arrangement ends.
- **Possible later additions:**
  - **Telegram alerts:** a free, official, automatic alert channel if staff want alerts beyond the orders page sound.
  - **WhatsApp:** a "Send order on WhatsApp" link from the customer's phone, then later the WhatsApp Business Cloud API, if order volume justifies the setup.
- **Still needed from the shop:**
  - **Billing software:** its name and whether it can export products to Excel or CSV. The CSV column format may need adapting to that export.
  - **Domain name:** needed at deployment.
  - **Branding:** the shop's display name, its logo (if any) and its brand colour (if any; green is used until then).
