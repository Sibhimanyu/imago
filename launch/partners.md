# Partners: API owners spread it for you

> **Dropped as a launch job.** Partners depends on someone else's yes, so the launch doesn't count on it. The Open-Meteo listing request below stays open as extra effort.

Imago's users are already in one place at the moment they need it: reading a
free API's docs. The people who own those docs are the partners. One yes puts
Imago in front of every developer who reads them afterwards, without you.

## Who, and why only one

Each API in Imago's examples was checked on 2026-09-26 for a place in its
README where a link to Imago would belong, and for a maintainer who merges
outside pull requests.

| API | Verdict |
|---|---|
| **Open-Meteo** (`open-meteo/open-meteo`, 6k stars) | **Ask.** Its README has a "Who is using Open-Meteo?" list and ends: *"Do you use Open-Meteo? Please open a pull request and add your repository or app to the list!"* A dozen of these were merged in 2026. Imago does use it: the landing page's live demo is an Open-Meteo forecast. |
| PokeAPI | Skip. Its README lists only wrapper libraries, and Imago isn't one. A badge in the header would be self-promotion in someone else's README. |
| Frankfurter | Skip. Its README covers only deployment and contributing. |
| Free Dictionary API | Skip. No commits since November 2023, and the API timed out when checked. |
| Thirukkural API | Skip. No public repository found. |

One pull request that belongs is worth more than five that don't. The
"Open in Imago" badge ([open-in-imago.md](open-in-imago.md)) stays available
for any API owner who asks for it.

## First: meet Open-Meteo's licence

Open-Meteo's data is CC BY 4.0: *"Include an attribution link next to any
location where Open-Meteo data is displayed."* Their maintainer looks at the
apps people submit (one 2026 pull request was sent back for making too many
requests), so Imago has to be in order before asking:

- The landing demo credits them: "Weather data by Open-Meteo.com", linked
  (v0.13.4.0).
- It makes one request per landing page view.
- It's free and non-commercial, which is what their free API is for.
- The social posts and the launch post credit them wherever their data
  appears.

## The pull request

One line in the **Apps** list, in alphabetical order (after Home Assistant),
in the list's own format:

```markdown
- [Imago](https://imago.onslate.in) Open-source, browser-only tool that turns an API response into an interface. Its landing page draws a live Open-Meteo forecast. ([GitHub](https://github.com/Sibhimanyu/imago))
```

**Title:** Add Imago to "Who is using Open-Meteo?"

**Description:**

> Adds Imago (https://imago.onslate.in), a free, MIT-licensed tool that runs
> in the browser and draws an API response as an interface. Its landing page
> fetches one live Open-Meteo forecast per visit and draws it, credited
> "Weather data by Open-Meteo.com" next to the demo.
>
> Code: https://github.com/Sibhimanyu/imago

## Tracking it

| Partner | Pull request | Opened | Followed up | Result |
|---|---|---|---|---|
| Open-Meteo | [#2155](https://github.com/open-meteo/open-meteo/pull/2155) | 2026-09-26 | | Open |

One follow-up after a week, on the same thread, if there's no answer. After
that, leave it.

## One more to try: Zoho Catalyst

Imago is hosted on Catalyst Slate. A showcase or blog post from the Catalyst
team would put it in front of their developer audience. Ask whether they
feature projects built on Slate. It isn't known that they do.

## How we'll know it worked

- The Open-Meteo pull request is merged. That's the one yes, and the reason
  Sales isn't a separate job.
- Visitors arrive at imago.onslate.in from github.com/open-meteo.
