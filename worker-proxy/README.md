# Tradux worker-proxy

Cloudflare Worker proxy for translation provider requests.

## Server-only access model

The worker-proxy is intentionally server-to-server / CLI only. Browser clients must not call this worker directly.

Any request with an `Origin` header is treated as browser-originated and rejected with `403`, including `OPTIONS` preflight requests. Requests without an `Origin` header continue to work for trusted CLI or server callers.

No CORS allowlist or `ALLOWED_ORIGINS` deployment variable is required. The worker does not emit `Access-Control-Allow-Origin` for successful server-to-server responses.

The Tradux browser runtime should fetch only public static config and i18n JSON assets. Translation provider calls that require credentials belong in the Tradux CLI or a trusted server context.

## Credential threat model

The proxy accepts provider credentials in request bodies, including Cloudflare `apiToken` and `accountId`. Those credentials must stay in CLI/server workflows where the caller is trusted to handle secrets.

Rejecting `Origin` blocks browser-based use of the credential-bearing proxy, but it is not authentication for server-side callers. Keep the worker endpoint scoped to trusted automation, prefer short-lived or scoped provider credentials when possible, and avoid logging request bodies.
