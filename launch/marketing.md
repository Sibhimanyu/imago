# Marketing: developers hear about it

Imago is free and open source, so the marketing is too. Show the product
working, link to the code, and ask for one thing: **try it, then star the
repo**. Nothing to sign up for, no email list. Developers watch the repo
for releases.

| Where | What | When | Runs without you |
|---|---|---|---|
| **Landing page** | The live demo: a real forecast turns into an interface before the page asks for anything. | Live now | Always |
| **README** | The demo GIF at the top (`docs/readme/demo.gif`): paste a URL, get a page, in nine seconds. | Live once the repo is public | Always |
| **Zoho Social** | Fourteen daily posts on LinkedIn and X, each one showing a real API: [social-posts.md](social-posts.md) | Days 1 to 14 | Scheduled once, posts itself |
| **Hacker News** | Show HN, below | Day 1 | Found by search after launch |
| **dev.to** | The launch post, [launch-post.md](launch-post.md), with the blog banner as its cover | Day 1 | Found by search after launch |
| **Reddit** | One post each in r/opensource and r/SideProject, and r/webdev on its showcase day | Days 1 to 7 | Found by search after launch |

**Before Day 1:** the repo is public, and its About box has the site link and
these topics: `api`, `json`, `api-client`, `json-viewer`, `developer-tools`,
`generative-ui`, `no-build`, `vanilla-js`. Topics are how GitHub search finds
it.

**How we'll know it worked:** visits to imago.onslate.in, stars and watchers
on the repo, and issues opened by people you don't know.

## Show HN

**Title:** Show HN: Imago – paste an API URL, get an interface instead of JSON

**URL:** https://imago.onslate.in

**First comment:**

> I kept doing the same thing with every new API: open the URL, scroll a
> screen of raw JSON, then write a throwaway page to see whether the data was
> any use. Imago skips the throwaway page.
>
> Paste a GET endpoint (or a curl command). It fetches the JSON, works out the
> response's shape, and draws a page for it: a Pokémon becomes a profile with
> stat bars, a forecast becomes metrics and a chart, a search becomes a table.
>
> A few things that might interest HN:
>
> - The model never writes HTML. It returns a small JSON plan (which fields
>   matter, which component shows each), and Imago's own renderer draws it with
>   textContent. Nothing from the API or the model is ever treated as markup.
> - The plan is cached by the response's *shape*, so watching an endpoint every
>   10 seconds for an hour is ~360 fetches and one model call.
> - It works with no key at all. The fallback is the same renderer driven by
>   heuristics, and a test fails if any sample API's field names leak into
>   those rules.
> - There is no backend. Keys stay in your browser. It's MIT-licensed, with no
>   build step: native ES modules.
>
> It only reads public, CORS-enabled GET endpoints, which is the honest limit
> of anything that runs only in a browser. I'd love reports of endpoints it
> draws badly. The Share button makes a link that shows me exactly what you saw.
>
> Code: https://github.com/Sibhimanyu/imago

Post on a weekday morning US Eastern time. Stay in the thread for the first
three hours.

## dev.to

Publish [launch-post.md](launch-post.md) as written, with
`brand/kit/exports/imago-task3-blog-banner.png` as the cover image. Tags:
`opensource`, `webdev`, `api`, `javascript`. Swap the relative links for full
GitHub URLs before publishing.

## Reddit

Read each subreddit's self-promotion rules on the day. They change, and some
allow showcases only on one day of the week. Post as the maker, answer every
comment, and don't cross-post the same text on the same day.

> **Title:** I built Imago: paste an API URL and get an interface instead of
> JSON (free, open source, browser-only)
>
> Every time I tried a new API I'd scroll raw JSON, then write a throwaway
> page just to see the data. Imago reads the response's shape and draws the
> page for it: a Pokémon becomes a profile with stat bars, a forecast becomes
> metrics and a chart, a search becomes a table. Watch re-fetches and marks
> what changed.
>
> No account, no server. Keys stay in your browser, and it works with no key
> at all. MIT-licensed, no build step.
>
> Live: https://imago.onslate.in · Code: https://github.com/Sibhimanyu/imago
>
> It only reads public GET endpoints that allow browser apps (CORS). Endpoints
> it draws badly are the most useful thing you could send me.
