# Paginated Search API

Use this route instead of loading all 10,200 records into browser memory for API workflows:

```txt
GET /api/templates/search?q=lease&state=AZ&risk=medium&page=1&pageSize=50
```

Supported filters:

- q
- category
- state
- risk
- lane
- page
- pageSize
