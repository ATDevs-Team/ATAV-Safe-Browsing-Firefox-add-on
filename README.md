# Use the ATAV Safe Browsing API in your own project

ATAV Safe Browsing helps you identify malicious, phishing, or otherwise dangerous hostnames before users interact with them.

Whether you’re building a browser extension, server-side protection system, or security-aware UI, you can query the ATAV API to get real-time threat intelligence.

---

## Check a hostname

Let’s say you wanted to check the URL:

```
https://warn.test.atdevs/malware.exe
```

You can’t check **full URLs** with the ATAV API — only **hostnames**.

In this case, the hostname `warn.test.atdevs` is associated with malicious activity and will return a warning.

### Example `curl` command

```bash
curl "https://atav-api-browser.atdevs.org/check?host=warn.test.atdevs"
```

### Successful response (Safe)

```json
{
  "host": "good.test.atdevs",
  "status": "Safe"
}
```

### Dangerous response

```json
{
  "host": "bad.test.atdevs",
  "status": "Dangerous",
  "risk": "High",
  "category": "Malware Distribution"
}
```

#### Note:
If the response includes:

```json
"risk": "Found in compromised domains list.",
"category": "Other",
"last_updated": "2025-05-26T00:42:27.401735",
"added_by": "admin"
```

This means the domain is **known to be likely malicious**, usually part of a compromised domains list, but has not yet undergone full manual review. Treat it as suspicious and act accordingly, but note that it may be updated with a more specific category later.

---

## Report a malicious site

If you detect a suspicious site and want to report it to ATAV for review and possible blocking, use the `/report` endpoint.

### Example `curl` command

```bash
curl -X POST "https://atav-api-browser.atdevs.org/report" \
     -H "Content-Type: application/json" \
     -d '{
           "host": "bad.test.atdevs",
           "reason": "Distributes malware under fake login pages"
         }'
```

### Successful response

```json
{
  "status": "Success",
  "message": "Report submitted for review"
}
```

---

## API Summary

| Endpoint                       | Method | Description                          |
|--------------------------------|--------|--------------------------------------|
| `/check?host=example.com`      | GET    | Check the threat status of a host    |
| `/report`                      | POST   | Submit a report for a dangerous host |

---

## Caching behavior

Clients (such as browser extensions) should cache results for up to **1 minute**. After that, re-check to ensure the latest threat status is used.

---

## Example use case: block dangerous sites

This API can be used to power:

- Browser extensions that block bad sites
- Server-side URL filtering systems
- Web applications validating submitted links
- Proxy or DNS-level filtering tools

If the returned `status` is `"Dangerous"`, take action accordingly (e.g., warn or block access).

---

## Live API Endpoint

```
https://atav-api-browser.atdevs.org
```

This API is publicly accessible and does not require authentication for basic usage.

---

## Questions or contributions

- Found a bug or false positive? Report it using the `/report` endpoint or visit [atdevs.org](https://atdevs.org).
- Want to contribute threat intelligence or tooling? Open an issue or pull request on the GitHub repository. If it is a database of malicious hostnames, instead email it to malware@atdevs.org
