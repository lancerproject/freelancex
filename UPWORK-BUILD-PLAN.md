# Xwork — Upwork Workflow Study & Build Plan

A complete map of how Upwork works end-to-end, and exactly what Xwork has vs. still needs.
Goal: a real marketplace that works at launch with zero manual steps for users.

---

## 1. The two sides (separate accounts — our model)

- **Client** = posts jobs, reviews proposals, hires, pays. Verification NOT required.
- **Freelancer** = builds a profile, finds work, sends proposals, delivers, gets paid. Identity verification required (to receive money).
- Separate sign-ups, each with one fixed role. ✅ (built)

---

## 2. End-to-end CLIENT workflow

1. Sign up → pick "Client". ✅
2. Land on client dashboard ("last steps", overview, talent). ✅
3. Post a job (fixed-price): title → category → skills → scope → budget → description → review → post/draft. ✅
4. Job appears publicly; freelancers apply. ✅
5. Review proposals (All / Shortlisted / Messaged / Archived). ✅
6. Message a freelancer. ✅ (chat + online/offline)
7. Invite specific freelancers / search talent / saved talent. ✅
8. Send an offer → set milestones → freelancer accepts → contract starts. ✅ (offers/contracts exist)
9. Fund a milestone → freelancer works → approve → **payment released**. ⚠️ (UI exists, real money NOT — needs Stripe)
10. Leave a review when contract ends. ✅ (double-blind reviews)
11. Reports / contracts management. ✅

---

## 3. End-to-end FREELANCER workflow

1. Sign up → pick "Freelancer". ✅
2. **Build profile**: photo, title, overview/bio, skills, hourly note, portfolio, location. ⚠️ (basic profile exists; needs the richer Upwork-style profile + portfolio)
3. Find Work feed: Best Matches / Most Recent / Saved + search + filters. ✅ (just built)
4. Open a job → submit a **proposal** (cover letter, your price/milestones). ⚠️ (apply exists; needs the full proposal form like Upwork: terms, milestones, attachments)
5. Track **My Proposals** (active / submitted / offers). ⚠️ (page exists, needs polish)
6. Receive an **offer** → accept → contract starts. ✅
7. **Deliver work**: submit milestones, message client, share files. ✅ (contract page)
8. **Get paid** when milestone approved. ⚠️ (needs Stripe payout)
9. Leave a review. ✅
10. Availability badge. ✅ (just built)

---

## 4. Shared systems

- **Messaging** — list + chat + presence dots. ✅
- **Search & discovery** — jobs, talent, projects. ✅ (jobs/talent)
- **Notifications** — bell + list. ✅
- **Reviews & ratings** — double-blind. ✅
- **Help Center / content/legal pages / footer.** ✅
- **Public marketing site** (landing, find-talent, pricing, mega-menu). ✅

---

## 5. The BIG remaining pieces (in priority order)

1. **Payments (Stripe Connect escrow)** — the heart of a marketplace. Client funds a milestone → held in escrow → released to freelancer on approval → freelancer withdraws. Fees: 2% client / 10% freelancer. **This is what makes "Manage finances" and "get paid" real.**
2. **Full proposal flow** — Upwork-style submit-proposal screen (cover letter, milestone breakdown, attachments) + "My Proposals" states (submitted / viewed / offer / declined).
3. **Rich freelancer profile + public profile page** — overview, skills, portfolio items, work history, hourly note, reviews shown. The page clients see before hiring.
4. **Identity verification for freelancers** — a simple verified flag/flow before payout (no money without it).
5. **Polish & states** — empty states, loading, mobile, consistent copy.

---

## 6. Launch readiness

- Signup assigns role automatically (email + Google). ✅
- One-time DB setup is done by owner once (not per user). ✅
- Before launch: a security/RLS pass (lock down who can read/write what), Stripe live keys, email/SMTP for confirmations & notifications.

---

## Suggested build order

**A.** Full proposal + My Proposals (completes the freelancer loop without money) →
**B.** Rich freelancer profile + public profile page →
**C.** Payments / Stripe escrow (the launch-critical money layer) →
**D.** Security/RLS hardening + launch checklist.
