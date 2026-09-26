# Support: people who get stuck, and people who complain

> **Not a separate launch job.** The app explains its own errors, SUPPORT.md covers the rest, and GitHub Discussions Q&A takes questions (see [community.md](community.md)). The runbook below still applies to issues.

Imago is free and open source, so support happens in public on GitHub. A
question answered in an issue answers the next person who searches for it.
A complaint in an issue is a bug report, and the fix links back to it. No
help desk: private tickets would hide the answers, and one maintainer can't
honestly promise a support team's response times.

## What answers people when you're not there

1. **The app's own messages.** Each failure says what happened and what to
   try, for example "This API does not allow browser apps", with the reason
   and the fix.
2. **[SUPPORT.md](../SUPPORT.md).** Each error, word for word, with its fix.
   Linked from the README and from the new-issue page.
3. **Issue forms** (`.github/ISSUE_TEMPLATE/`). "The page came out wrong"
   asks for a Share link, so every complaint arrives with a way to reproduce
   it. "Something is broken" points to SUPPORT.md first.

## What you do

- **Reply to every issue within two days.** SUPPORT.md promises this. "Not
  yet, and here's why" counts as a reply.
- **Label it:** `wrong page`, `bug`, `cors` (the API refuses browsers; not
  an Imago bug), `out of scope` (POST, GraphQL, auth flows).
- **Close with a link to the fix.** When a wrong page gets fixed, reply with
  the release number, so the person who complained sees it was heard.

## Saved replies

Add these under GitHub → Settings → Saved replies, so the common answers
take seconds.

**CORS**
> Thanks for trying Imago. This API doesn't send the CORS headers a web page
> needs to read it, so no browser-only tool can reach it, Imago included. The
> fix has to come from the API: a public or browser-facing endpoint in its
> docs, or `Access-Control-Allow-Origin: *` if you run it. More in
> [SUPPORT.md](https://github.com/Sibhimanyu/imago/blob/master/SUPPORT.md#this-api-does-not-allow-browser-apps).
> Closing as not an Imago bug, but reopen if the API does send CORS headers.

**Wrong page, thanks**
> Thanks. The Share link shows exactly what you saw, which is what I need.
> I'll look at why the rules picked this layout and reply here with what
> changes.

**Key problems**
> This looks like the model provider refusing the key. Open Settings →
> Connection tests: a red test there means the key needs pasting again or
> replacing. If it's green and generating still fails, clear the Model field
> to go back to the default and try again.

**Out of scope**
> Thanks for the idea. Imago only reads public GET endpoints, on purpose: the
> point is the step from response to interface, and Postman or Hoppscotch are
> better at sending requests. I'm closing this so the issue list stays
> honest about what's planned, but the reasoning is in the README under
> Limits.

**A complaint**
> Sorry this got in your way, and thanks for saying so instead of just
> leaving. Here's what happened: … Here's what I'm changing: …
