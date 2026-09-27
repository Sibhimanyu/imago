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

## The four jobs

The brief's problem is "nobody knows it exists". Marketing brings developers
in, Pricing answers the first question they ask of an AI tool, Public
relations lets other people talk about it, and Community gives the ones who
stay a place to talk. Each keeps working without me.

### 1. Marketing: developers hear about it

**The API gallery**, <https://imago.onslate.in/apis/>. One page per
popular free API (PokeAPI, Open-Meteo, Open Library, Frankfurter, Wikipedia,
the ISS), each with plain text on what the API returns, its live response
drawn by Imago's own renderer, and "Open it in Imago". Developers search for
an API's name when they first meet it, and these pages answer that search for
as long as they exist.

- **Zoho Catalyst Slate** hosts it on the app's own site, beside the app, the
  press kit and the waitlist: one address for everything.
- **Zoho PageSense** (free, up to 5,000 visitors a month) measures it: visits,
  which APIs people came for, heatmaps, and a goal counting clicks into
  Imago. It runs on every page of the site, the app included. The trade-off:
  Imago keeps people's model keys in the browser, and a script on the same
  site could read them; the app's CSP lets in PageSense's two hosts by name
  and no other outside script.

[marketing.md](marketing.md)

### 2. Pricing: what it costs, and why

**Free forever**, when you bring your own free Gemini or Groq key, or use
none. There is no server, so a user costs nothing to serve; the model call runs
on the user's own key, and only once per response shape. Charging would need
accounts, and accounts would mean a server holding people's keys.

**Hosted AI, waitlist only.** For people with no key who want Imago to
provide the model. That needs a server and costs money on every call, so it
would be paid: price follows cost. Draft price ₹99 a month for 100 new
layouts, about ₹40 of model cost. It isn't built, and nobody pays now.

- **Zoho Catalyst** runs the waitlist: a page on the site that posts to a
  Catalyst function storing each sign-up in the Data Store. It asks which
  price people would pay (₹49, ₹99, ₹199, or only free): demand and price
  data, collected without me. <https://imago.onslate.in/waitlist/>
- The landing page says all of this under "Free, and why".

[pricing.md](pricing.md)

### 3. Public relations: other people talk about it

**The press kit**, <https://imago.onslate.in/press/>. Four
vertical reels (Amigo introduces Imago; paste a URL, get a page; Watch
marking what changed; why it's free), ready-made posts with copyable
captions, the logo, the Amigo mascot and a fact sheet. I don't post them
myself: anyone who wants to write about or share Imago can take them without
asking. PageSense counts the visits.

[press/reels/README.md](press/reels/README.md), [social-posts.md](social-posts.md)

### 4. Community: a place to talk

**GitHub Discussions**, <https://github.com/Sibhimanyu/imago/discussions>,
next to the code, which is where an open-source project's users look. It
started with threads that are useful before anyone replies: "APIs that work
with Imago" (a list people add to), a Q&A on the error most people hit first
(CORS) with its answer marked, Show and tell, Ideas, and one thread per
gallery API, linked from that API's page.

[community.md](community.md)

## What I dropped, and why

- **Partners.** It depends on someone else's yes. One listing request is open
  at Open-Meteo ([#2155](https://github.com/open-meteo/open-meteo/pull/2155)),
  but the launch doesn't count on it.
- **Sales.** Nothing to sell yet. The waitlist tests demand first.
- **Support.** Not a separate job: the app explains its own errors,
  [SUPPORT.md](../SUPPORT.md) covers the rest, and Discussions Q&A takes
  questions. A help desk such as Zoho Desk would hide answers in private
  tickets, which is the wrong shape for open source.
- **Marketplace.** Developers don't browse marketplaces for a tool like this,
  and Zoho Marketplace is for Zoho add-ons.

## Tools

Zoho Catalyst (Slate hosting the site; Functions and Data
Store for the pricing waitlist), Zoho PageSense (measuring the marketing), GitHub
(Discussions, issues), Claude (Claude Code), HyperFrames (the reels), Figma
(design sync). Brand pieces from earlier tasks: Adobe Illustrator.
