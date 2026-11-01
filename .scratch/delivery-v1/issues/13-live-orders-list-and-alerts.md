# 13: Live orders list and alerts

**What to build:** The Orders list updates on its own. After a staff member taps "Start alerts", a loud sound plays when a new Order arrives and a sound plays when a customer cancels one.

**Blocked by:** 12

**Status:** ready-for-agent

- [ ] A polling endpoint returns Orders created or cancelled since a given cursor
- [ ] The Orders page polls about every 5 seconds and adds or updates rows without a page refresh
- [ ] A clear "Start alerts" control enables sound (browsers block sound until the user taps); it shows whether alerts are on
- [ ] A loud sound plays for each new Order and a sound plays when an Order is cancelled
- [ ] API tests cover the polling endpoint returning new and cancelled Orders after the cursor and nothing older
- [ ] Playwright: staff logs in, a new Order placed by a customer appears in the live list, and staff moves it to Delivered
