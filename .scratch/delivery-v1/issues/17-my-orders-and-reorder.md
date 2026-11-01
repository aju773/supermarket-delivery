# 17: My orders and Reorder

**What to build:** A customer can open "My orders" to see the Orders placed from this phone, open each one's status page, and tap Reorder to put its items back in the Cart at current prices. Items no longer sold or out of stock are skipped and listed.

**Blocked by:** 09

**Status:** ready-for-agent

- [ ] "My orders" lists Orders from the tokens saved on the phone, newest first, with order number, date, status badge and total; it handles localStorage being unavailable
- [ ] Empty state shows an icon, one line of text and a "Start shopping" button
- [ ] Reorder loads the Order through its token and adds its current lines to the Cart at current prices
- [ ] Lines that are hidden, unavailable or out of stock are skipped and the customer is told which ones
- [ ] API tests cover the reorder lookup returning current prices and flagging lines that can't be ordered
- [ ] Playwright: "My orders" lists a placed Order and Reorder fills the Cart
