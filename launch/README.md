# Launch Day: Imago

## Who it is for

**Developers meeting a public JSON API for the first time.** The ten minutes
between finding an API and writing the first line of code against it, when
the only question is whether the data is any good.

**What they do today:** paste the URL into a browser tab and scroll raw JSON,
or send it through Postman and scroll it there. Then, to really see the data,
they write a throwaway page they will delete by evening.

**Who is left out, on purpose:**

- Anyone working with private, internal or logged-in APIs that don't allow
  browser apps (CORS). Imago can't reach them, and won't route data through a
  server to try.
- Anyone sending POSTs, running test suites or checking contracts. Postman and
  Insomnia already do that well.
- Anyone who isn't a developer. You need to know what an endpoint is.
- Teams who want a hosted dashboard for production data. Imago is a look, not
  a monitor you depend on.

## The jobs I picked

| Job | What I made | Why it works without me |
|---|---|---|
| **Partners** | An **Open in Imago** link (`#open=<endpoint>`, new in the app) and a badge, with a kit for API owners: [open-in-imago.md](open-in-imago.md) | My users are reading a free API's docs at the moment they need Imago. A badge in those docs brings each new reader in, and I'm not there for any of it. |
| **Sales** | One ask to five API owners, written as a ready pull request: [partners-and-sales.md](partners-and-sales.md) | The one yes is a merged badge. Once it's merged, it stays. |
| **Marketplace** | Show HN, Product Hunt, AlternativeTo and GitHub topics and lists: [listings.md](listings.md) | Developers search these for tools. A listing keeps being found long after launch day. |
| **Marketing** | A launch post ([launch-post.md](launch-post.md)), the blog banner, the A4 flyer, the launch video, and the landing page's live demo | The landing page sells itself: a live forecast turns into an interface before anyone asks for anything. |
| **Pricing** | **Free, MIT.** Written into the README and the post | There is no server, so each user costs nothing to serve. The model call runs on the user's own free Gemini or Groq key, and only once per response shape. Charging would mean accounts, and accounts would mean a server holding your keys, which breaks the one promise the product makes. |
| **Support** | [SUPPORT.md](../SUPPORT.md) with the real error messages and their fixes, and GitHub issue forms. The "page came out wrong" form asks for a Share link. | Most problems are CORS or a key, and the page answers them. For the rest, the Share link is the reproduction: I see exactly what they saw, without a call. The form also takes complaints. |

## What I dropped, and why

- **Public relations.** Nobody writes about a tool with no users, and a press
  pitch with nothing behind it is spam. For developer tools, Show HN is where
  the press looks, so it's covered under Marketplace. I'll pick PR up again
  once an API owner has merged the badge and there's a story to tell.
- **Community.** An empty Discord tells every visitor nobody uses the product.
  For now GitHub issues are the place to talk, and every issue gets a reply.
  A community comes once users can answer each other.

## Before it goes live

1. Make the GitHub repo public. Every support and partner link points at it.
2. Post the listings, then open the partner pull requests (Open-Meteo first).
