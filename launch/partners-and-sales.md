# Partners, and the one yes

Imago's users are already in one place at the moment they need it: reading a
free API's docs. The people who own those docs are the partners. Sales here
means one of them saying yes and adding the badge.

## The ask

One line in their README or docs: the **Open in Imago** badge pointing at one
of their own example endpoints. Nothing else. It costs them nothing, it needs
no account, and it can be removed in one commit.

What they get: their readers see the API's data as an interface in one click.
More people get past "is this API any good?", which is the first question a
free API has to answer.

## Who to ask first

Picked because the API is public, keyless, sends CORS headers and already
renders well in Imago. Each one is in Imago's Try an example list.

| API | Why them | Where to ask |
|---|---|---|
| **Open-Meteo** | The landing hero, the flyer and the banner all show their forecast. Asking first is the obvious move. | GitHub Discussions on `open-meteo/open-meteo` |
| **PokeAPI** | Huge student and hobby audience, and the best-looking Imago page. | GitHub issue or discussion on `PokeAPI/pokeapi` |
| **Frankfurter** | Small team, currency rates change daily, so Watch has something to show. | Its maintainer, linked from its site |
| **Free Dictionary API** | Heavy hackathon use, deeply nested JSON that Imago makes readable. | Its maintainer, linked from its site |
| **Thirukkural API** | Small, and close to home. The most likely first yes. | Its maintainer, linked from its site |

Check each repo's contributing notes before posting. Some want an issue
before a pull request.

## The message

Send it as a pull request where the repo takes them: the badge line already
added to the README, and this as the description. A pull request is a yes or
no. An issue is a conversation.

> **Add an "Open in Imago" link to the README**
>
> Hi. I built Imago (https://imago.onslate.in), a free, open-source,
> browser-only tool that draws a JSON response as an interface. Your API is
> one of its examples. Here it is:
>
> <open link to one of their endpoints>
>
> This PR adds one badge under the examples so readers can open that response
> as a page in one click. Nothing is installed and nothing goes through a
> server: the reader's browser fetches your API directly, with the same CORS
> access your docs already rely on.
>
> If it isn't a fit, close it, no hard feelings. If you'd rather point at a
> different endpoint, tell me which and I'll change it.

## The follow-up

One follow-up, a week later, on the same thread. After that, leave it.

## How we'll know it worked

- The badge is merged in one repo. That is the one yes.
- A Share link or `#open=` link from that API turns up in an issue, which
  shows someone reached Imago that way.
