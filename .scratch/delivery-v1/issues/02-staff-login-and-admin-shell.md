# 02: Staff login and admin shell

**What to build:** A Staff Member can log in at `/admin`, stay signed in on the shop phone, find their way around the admin layout (top bar, sidebar on wide screens, bottom tab bar and ☰ menu on phones), change their own password and log out. The Orders landing page exists but is empty for now.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] The first Staff Member account can be created from the server command line
- [ ] Login and logout go through API endpoints using Django session cookies with CSRF protection (Ninja session auth); sessions last about 30 days
- [ ] Every admin API endpoint rejects anonymous requests and requests without a valid CSRF token; deactivated users cannot log in
- [ ] Visiting any admin page while logged out sends the user to the login page; after login they land on Orders
- [ ] Wide screens: near-black top bar with shop name and an account menu, light grey left sidebar with Phosphor icons for Orders, Products, Categories, Import, Settings, Staff (regular weight, fill weight for the active item)
- [ ] Phones: sidebar becomes a slide-out menu behind ☰, plus a bottom tab bar with Orders, Products, Settings, More
- [ ] Account menu contains only "Change password" and "Log out"
- [ ] Change password: Staff Member enters current and new password; wrong current password is rejected; success shows a toast
- [ ] Orders page shows an empty state (icon, one line of text, action) until orders exist
- [ ] Admin uses 14 px body text, grey page, white rounded cards; icon-only buttons have screen-reader labels
- [ ] API tests cover login, logout, anonymous rejection, CSRF rejection, deactivated-user login rejection and change own password
