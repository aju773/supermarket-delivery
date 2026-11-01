# 20: Staff accounts

**What to build:** Staff see the list of Staff Member accounts, add a new one, reset another member's password, and deactivate or reactivate accounts. The admin can never be locked out: no one can deactivate their own account or the last active account.

**Blocked by:** 02

**Design:** `admin-staff.png` in `docs/design/screens/`. Follow `docs/design/README.md`: the spec wins on content, screenshots guide layout.

**Status:** ready-for-agent

- [ ] Staff page lists accounts with name and active/inactive status
- [ ] Add a Staff Member with username and password
- [ ] Reset another Staff Member's password
- [ ] Deactivate (with a confirmation popup) and reactivate; accounts are never deleted and order history still shows their name
- [ ] Deactivating your own account or the last active account is rejected with a clear message
- [ ] Deactivated Staff Members can't log in
- [ ] API tests cover list, create, reset password, deactivate, reactivate, both guards, anonymous and missing-CSRF rejection
- [ ] No hard-coded values: every colour, size, radius, shadow, spacing and layer comes from the design tokens (the CI check passes)
