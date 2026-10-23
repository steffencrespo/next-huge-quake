# Instagram Publisher v1 (PAUSED)

**Status: paused on 2026-10-23.** We still publish and schedule Reels by hand in Instagram. This code is kept so the work can pick up again later. No Meta API call has ever been made with it. It has never uploaded or published anything.

Why it's paused: the Meta developer console setup took more manual work than it was worth at this stage.

## Scope

v1 covers three things only: connecting to Instagram, validating and approving a manifest, and **staging** a Reel. Staging means creating a Reels container and uploading the local MP4. A container is not public, and Meta deletes it 24 hours after creation unless it is published.

There is **no `media_publish` call** anywhere. The YouTube publisher (`src/publisher/`, `publish/*.json`, `publish/state.json`) is untouched.

## What's implemented

| File | Purpose |
|---|---|
| `src/instagram/graph.ts` | Graph API v26.0 on `graph.instagram.com` (Instagram Login). It reads the account (`/me`), refreshes the token, creates a Reels container with `upload_type=resumable` (direct upload of the local file), uploads the file to `rupload.facebook.com`, and reads the container's status. The token goes in the request body or header, never in a printed URL. Error messages have the token removed. Writes that get no answer, or an unreadable one, are reported as "outcome unknown" and never retried. |
| `src/instagram/auth.ts` | The long-lived token comes from the App Dashboard (*Generate token*). It is stored at `~/.config/next-huge-quake/instagram/token.json` with mode 0600 (override the folder with `NHQ_INSTAGRAM_DIR`). Only @nexthugequake as a Business or Creator account is accepted. The token is refreshed automatically once it is 7 days old. |
| `src/instagram/manifest.ts` | Manifests live in `publish/instagram/<id>.json`, with separate `generated` and `approved` captions. The approval hash covers the caption, `shareToFeed`, `thumbOffsetMs` and the **SHA-256 of the MP4**, so a re-render makes the approval stale. It also checks Instagram's limits (caption ≤ 2,200 characters, ≤ 30 hashtags, ≤ 20 @mentions, file ≤ 300 MB), that the MP4's `moov` box comes before `mdat`, and the Output.ai and terrain credits. |
| `src/instagram/state.ts` | Staging state is kept in `publish/instagram/state.json`, which is created on the first real `stage`. Each status is saved *before* the write it describes: `creating → created → uploading → uploaded → staged` (or `failed`). Staging can only carry on from `created`, a container that definitely exists. Any other existing entry blocks staging until a person clears it. |
| `scripts/instagram-connect.ts` | `npm run instagram:connect`: paste the token at a hidden prompt, or pipe it in. `-- --check` verifies the stored token. |
| `scripts/instagram-publish.ts` | `npm run instagram:publish preview\|approve\|stage\|status`. `preview` is offline. `stage` is a dry run unless you add `--confirm`. `status` is read-only. |
| `publish/instagram/magnitude-6-vs-7.json` | The test manifest. It uses the music-free `out/instagram/magnitude-6-vs-7-reel-final.mp4`, which is git-ignored and stays local. It is **unapproved** and marked `publishedManually` (2026-10-23): use it only to test staging, never to publish. |

## What's tested

- `src/instagram/instagram.spec.ts`, with the Meta API mocked (no network). It covers:
  - manifest validation, including the committed manifest;
  - the MP4 box check and caption limits;
  - approval going stale when the caption or the video bytes change;
  - the staging state machine refusing every uncertain state;
  - the account guard, token parsing, and the token file's 0600 mode;
  - unanswered or unreadable writes raising `AmbiguousWriteError`;
  - token removal from error messages, and the token staying out of URLs.
- `npm run typecheck` and the full `npm test` passed: 280 tests.
- Run by hand: `instagram:publish preview` printed the expected output, and `stage` stopped at the approval check before any API call.
- **Never run against Meta:** connect, staging and the token refresh.

## What's missing

1. **Meta console setup.** No app exists yet (steps below).
2. **The first live check:** does `upload_type=resumable` work under *Instagram Login*? Meta only documents it for Facebook Login for Business. This is the main open risk.
3. **A fallback if it doesn't.** Create the container with `video_url` pointing at a temporary Cloudflare quick tunnel (`cloudflared tunnel --url`, free, no account) that serves only that one file until Meta has fetched it. Not implemented, and `cloudflared` isn't installed. The last resort is Facebook Login for Business, which needs a linked Facebook Page.
4. **Publishing.** A `publish` command (`media_publish` plus reading back the permalink) is deliberately left out of v1. When it's added, it must:
   - record `publishing` before the call;
   - if the outcome is unknown, never call it again; read the container's `status_code` instead (`PUBLISHED` means it worked);
   - refuse any manifest that has `publishedManually`.
5. **Scheduling.** The Instagram API has no scheduled-publish option, so a scheduled post would have to be a local timed run of `publish`.
6. **Hard-coding the IG user id** after the first successful connect. Today the guard checks the username, and the user id stored at connect.

## How to resume

1. Rebase this branch onto `master`. Run `cd video && npm test && npm run typecheck`.
2. Meta developer console (developers.facebook.com):
   1. *My Apps → Create app*. Use case **Other**, app type **Business**. Don't connect a business portfolio.
   2. Add the **Instagram** product and choose **API setup with Instagram login**.
   3. Make sure `instagram_business_basic` and `instagram_business_content_publish` are added.
   4. *Generate access tokens → Add account*, then sign in as @nexthugequake (the account must be public). Accept the tester invite in Instagram if one appears.
   5. Click **Generate token**. Never paste it into chats, issues or files in the repo.
   6. Skip webhooks, the redirect URL, App Review and Business Verification. Leave the app in development mode. Standard Access is enough for an account you own.
3. `npm run instagram:connect`: paste the token and check that the report shows @nexthugequake.
4. `npm run instagram:publish preview magnitude-6-vs-7`, then `approve magnitude-6-vs-7`. This is the human approval.
5. `npm run instagram:publish stage magnitude-6-vs-7 --confirm`. Success means the status reaches `FINISHED` and state shows `staged`. The container is never published and is gone after 24 hours.
   - If container creation is rejected because resumable upload isn't supported, the entry is cleared automatically: implement the Cloudflare tunnel fallback (item 3 above).
   - Any "outcome unknown" error: run `status`, then clear the entry in `publish/instagram/state.json` by hand.

## Cost

$0. The Meta API is free, and the fallback tunnel is free with no account. No server or storage is needed.
