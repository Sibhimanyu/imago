# Launch Day: Imago

Imago turns an API response into an interface. Paste a URL and it draws the
page the data deserves. It's free, open source (MIT) and runs entirely in the
browser. Live at <https://imago.onslate.in>.

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
- Teams who want a hosted dashboard for production data.

## The three jobs

The brief's problem is "nobody knows it exists". These three jobs take a
developer from never having heard of Imago, to arriving through an API's
docs, to getting past their first problem.

### 1. Marketing: developers hear about it

Free and open source, so no sign-up funnel. The ask is: try it, then star the
repo.

- **Zoho Social:** fourteen daily posts on LinkedIn and X, each showing one
  real API becoming a page, with images from the live site.
  [social-posts.md](social-posts.md), [social/](social/)
- **Launch day:** Show HN, the launch post on dev.to, and Reddit.
  [marketing.md](marketing.md), [launch-post.md](launch-post.md)
- **Always on:** the landing page's live demo, and a demo GIF at the top of
  the README.

### 2. Partners: API owners spread it for you

My users are reading a free API's docs at the moment they need Imago. The app
now has an **Open in Imago** link (`imago.onslate.in/#open=<endpoint>`) and a
badge. One line in an API's README, and each of its readers can open the
example as a page. Pull requests go to five API owners, Open-Meteo first.
[partners.md](partners.md), [open-in-imago.md](open-in-imago.md)

### 3. Support: people who get stuck, and people who complain

Most first attempts that fail do so because of CORS or a key. The app's
messages say why, [SUPPORT.md](../SUPPORT.md) gives the fix for each, and
GitHub issue forms take the rest. The "page came out wrong" form asks for a
Share link, so every complaint arrives with a way to reproduce it. It's all
public, so each answer helps the next person too.
[support.md](support.md)

## What I dropped, and why

- **Sales.** For a free tool, the "one yes" is an API owner merging the
  badge, and that's Partners.
- **Pricing.** Free was decided by how Imago is built. There's no server, so a
  user costs nothing to serve, and the model runs on the user's own free key.
  Charging would need accounts, and accounts would mean a server holding
  people's keys. That's the whole decision, not a job.
- **Marketplace.** Developers don't browse marketplaces for a tool like this.
  Zoho Marketplace is for Zoho add-ons, Product Hunt is a one-day spike, and
  awesome lists want stars first.
- **Public relations.** No one writes about a tool with no users. Once an API
  owner merges the badge there's a story. Until then, Show HN reaches the
  press that covers developer tools.
- **Community.** A launch with no users has nobody to talk to each other.
  GitHub issues are the place to talk to me until there are.
