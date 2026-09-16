# Video review moderation from the email — plan

Status: **parked 2026-09-16.** Build when submission volume makes approving and
rejecting in Supabase by hand a chore. Until then: watch from the email link, then
set `video_submissions.status` in the Supabase table editor.

## What exists

- `POST /api/strainguide/submissions` opens a Stream upload and inserts a row as
  the user. Status goes `uploading` → `pending` on `/complete`.
- `/complete` emails `CONTACT_TO` with a watch link:
  `GET /api/strainguide/watch/:uid?sig=HMAC(uid)` mints a 1-hour Stream token
  and redirects. Stream tokens cap at 24h, so links can't be put in the email
  directly.
- Videos upload with `requiresignedurls`, so nothing is publicly playable.
- Table columns: `status` (`uploading|pending|approved|rejected`),
  `reviewed_at`, `review_note`, `featured`, `monthly_pick`, `youtube_url`.
- Worker has no service-role key. It writes as the user, and RLS only lets an
  owner move their row from `uploading` to `pending`.

## Proposed design

**Email buttons:** Approve · Reject · Feature, each a signed link:
`GET /api/strainguide/review/:id?action=approve&exp=…&sig=HMAC(id|action|exp)`

**A GET never changes state.** Gmail and other link scanners prefetch URLs, so
the GET renders a confirmation page (thumbnail, strain, handle, optional note).
A `POST` from that page's button does the write. The POST re-checks the
signature and expiry, e.g. 14 days.

**The write** can't use the user's JWT. Options:
1. `SECURITY DEFINER` RPC `moderate_video_submission(id, action, note)`, callable
   only with a shared secret, or granted to a dedicated role. No broad key in
   the Worker. **Preferred.**
2. Put the service-role key in the Worker. Simpler, but a Worker compromise
   then owns the whole DB.

Only moves from `pending` count, so a second click is a no-op.

## Open questions (decide before building)

- What does **approve** do beyond the status? Notify the submitter by push or
  email? Make it playable (drop `requiresignedurls`, or sign on the strain
  page)? Show it on the strain page in the app?
- **Reject:** delete the Stream video (saves storage minutes; limit is 1,000)
  or keep it for appeals? Tell the submitter?
- **Feature / monthly pick:** a manual choice from a list rather than an email
  button? The Premium reward goes only to the monthly pick. How is it granted
  (RevenueCat promotional entitlement)?
- Should a submitter see their status in the app?

## Trigger to build

Roughly when reviews come in faster than weekly, or when the approve step
starts to need a side effect (notify, publish, reward). Doing that by hand is
error-prone.
