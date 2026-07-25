# HTTPQL

Use HTTPQL only through `caido_list_requests`. Start with the smallest official expression, then add one clause at a time. Keep the query bounded and pass it verbatim; never concatenate it into GraphQL. On `INVALID_HTTPQL`, report the upstream parse location and simplify the clause. Verify field names/operators against current Caido documentation instead of inventing syntax.

Official references:

- `https://docs.caido.io/app/reference/httpql`
- `https://docs.caido.io/app/guides/filters_httpql`

Core fields include `req.method`, `req.host`, `req.path`, `req.raw`, `resp.code`, `resp.len`, and `resp.raw`. String values are quoted; integer values are not. Use explicit parentheses around mixed `AND`/`OR`. Regex is Rust-flavored and does not support features such as look-ahead.

Examples:

```httpql
req.method.eq:"POST" AND resp.code.gte:500 AND resp.code.lt:600
```

GraphQL detection is heuristic. Prefer a known endpoint:

```httpql
req.method.eq:"POST" AND resp.code.gte:500 AND resp.code.lt:600 AND (req.path.eq:"/graphql" OR req.raw.cont:"application/graphql")
```

Custom endpoints, persisted queries, batching, JSON bodies, and multipart uploads can produce false positives or negatives. State the heuristic and ask for application conventions rather than claiming complete GraphQL coverage.
