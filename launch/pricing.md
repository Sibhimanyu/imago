# Pricing: free, and why

Imago is free forever and open source (MIT). A paid hosted-AI option may come
later. For now it is a waitlist and nothing else: not built, no payment taken.

## The decision

**Free forever, MIT.** Bring your own free Gemini or Groq key, or use no key at
all. The basic layout needs no key.

Why it is free:

- **Imago has no server.** The page is static files. Fetching the API, drawing
  the page and storing saved endpoints all happen in the user's browser, so
  another user costs nothing to serve.
- **The model runs on the user's own key.** The call goes from their browser to
  Gemini or Groq, and only once per response shape. A shape Imago has seen
  before reuses its layout, so watching an endpoint for an hour is about 360
  fetches and one model call.
- **Charging would need accounts, and accounts would need a server holding
  people's keys.** That is the one thing Imago is built not to have.

**Hosted AI, waitlist only (not built).** This is for people who have no key and
want Imago to provide the model. The price follows the cost. It would need a
server and it costs money on every call, so it would be paid.

- Draft price: **₹99 a month for 100 new layouts.**
- Cached shapes and Watch refreshes make no model call, so they cost nothing
  and would not count against the 100.
- The waitlist collects emails and the price people would pay. It takes no
  payment.

Waitlist wording, used everywhere the waitlist is offered:

> Not built yet. No payment now. We'll email you if it opens.

## Cost estimate

Source: Gemini API pricing, <https://ai.google.dev/gemini-api/docs/pricing>
(paid tier, checked 26 Sep 2026). Gemini 3.1 Flash-Lite costs $0.25 per 1M
input tokens (text) and $1.50 per 1M output tokens.

| Per new layout | Tokens | Cost |
|---|---:|---:|
| Input (prompt, schema, compact sample) | ~6,000 | $0.0015 |
| Output (the layout), at most | ~2,000 | $0.0030 |
| **Total, at most** | | **~$0.005 (about ₹0.40)** |

At the draft price, 100 new layouts cost at most about $0.45 (₹40) in model
calls. The rest of the ₹99 would pay for the server, payment fees and tax.
Rupee figures assume about ₹88 to the dollar. Recheck the source page before
setting a real price. Model prices change.

## Waitlist form (Zoho Forms)

Build this form in Zoho Forms exactly as written. The app only links to it.
No Zoho script, iframe or embed goes on imago.onslate.in.

**Form title**

> Imago hosted AI: waitlist

**Intro text**

> Imago is free and stays free with your own Gemini or Groq key, or with no key.
> Hosted AI would be for people without a key: Imago would provide the model.
> That needs a server and costs money on every call, so it would be paid.
>
> Not built yet. No payment now. We'll email you if it opens.

**Fields**

| # | Label | Type | Required | Choices |
|---|---|---|---|---|
| 1 | Email | Email | Yes | |
| 2 | What would you use Imago for? | Single line | No | |
| 3 | Do you already have a Gemini or Groq key? | Radio | No | Yes / No / Not sure |
| 4 | Which monthly price would you pay for hosted AI (100 new layouts)? | Radio | No | ₹49 / ₹99 / ₹199 / I'd only use the free version |
| 5 | Email me if hosted AI opens | Decision box (checkbox) | Yes | |

**Thank-you message**

> Thanks. You're on the list. Hosted AI is not built yet, and nothing is
> charged. We'll email you once, if it opens. Until then, Imago works free with
> your own Gemini or Groq key, or with none: https://imago.onslate.in

**Limits.** The Zoho Forms free plan allows 3 forms and 500 responses a month.
That is enough for a waitlist. If responses near 500 in a month, that is the
answer to whether to build it.

## What the owner does

1. Create a free Zoho Forms account at <https://forms.zoho.in> with a personal
   Zoho login, not a work account.
2. Build the form from the spec above: title, intro, the five fields in order,
   and the thank-you message.
3. Publish it and copy its public link.
4. Send the public link to whoever maintains the app. It goes in one place:
   `WAITLIST_URL` in `js/config.js`. While that is empty, every waitlist link
   in the app stays hidden. Once set, the link appears on the landing page
   ("Free, and why", under Hosted AI) and in Settings under the key boxes. It
   must be an `https://` link.
