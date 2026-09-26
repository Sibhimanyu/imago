# Getting help with Imago

Imago runs entirely in your browser. There is no server, no account and
nobody reading your data, so most problems have the same few causes. Start
with the one that matches what you see.

## "This API does not allow browser apps"

The API answered, but it did not send the CORS headers a web page needs to
read the response. Every browser-only tool hits this wall, not only Imago.

- Look in the API's docs for a public or browser-facing endpoint. Many APIs
  have one.
- If you sent headers (Inspect → Headers), try without them. Some APIs let a
  plain request through but refuse one that carries headers.
- If you control the API, add `Access-Control-Allow-Origin: *` to public GET
  responses.

Imago cannot work around this, and it will not send your data through a
proxy it controls.

## "Could not reach …"

The address is wrong, the server is down, or your network blocks it. Open
the URL in a new tab. If the browser cannot load it either, Imago cannot.

## The page says "Fallback" and looks plain

That is the basic layout, built without a model. It is on purpose: Imago
works with no key. For a designed page, add a free key in
**Settings → API keys**:

- Google Gemini: <https://aistudio.google.com/apikey>
- Groq: <https://console.groq.com/keys>

Then press **Generate interface**. Your key stays in this browser and is sent
only to the provider you picked.

## "rejected the API key"

Open **Settings → Connection tests**. A red test there means the provider
refused the key: paste it again, or make a new one. If the test is green but
generating still fails, the model name may have been retired. Clear the Model
field to go back to the default.

## A share link does not load for someone else

A share link never carries your headers or keys. If the endpoint needed them,
the other person needs their own. Imago warns you about this when you press
**Share**.

## Imago drew the page wrong

That is the report we most want. Press **Share**, then
[open a "The page came out wrong" issue](https://github.com/Sibhimanyu/imago/issues/new?template=wrong-page.yml)
and paste the link. It shows us exactly what you saw.

## Something else, or you're annoyed

[Open an issue](https://github.com/Sibhimanyu/imago/issues/new/choose).
Complaints are welcome. Say what you expected and what happened. Every issue
gets a reply within two days, even if the reply is "not yet".

## Starting over

**Settings → Clear all saved data** removes endpoints, cached layouts,
snapshots and keys from this browser. Nothing is kept anywhere else.
