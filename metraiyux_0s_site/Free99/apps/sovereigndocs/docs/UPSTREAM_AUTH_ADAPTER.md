# SovereignDocs Upstream Auth Adapter

SovereignDocs intentionally has no login screen and no built-in auth. It is designed to inherit identity from an upstream gateway.

## Browser Static Adapter

The frontend reads, in order:

```js
window.SOVEREIGNDOCS_USER
window.OMEGA_SKYGATE_USER
localStorage["sovereigndocs.upstream-session.v1"]
```

If none are present, it uses local operator mode.

Example injection before loading the app:

```html
<script>
  window.OMEGA_SKYGATE_USER = {
    id: "sky_123",
    name: "Operator",
    organization: "Skyes Over London",
    roles: ["founder"]
  };
</script>
```

## API Header Adapter

The optional Node API reads:

```txt
x-sovereigndocs-user
x-omega-skygate-user
```

Header values can be JSON strings or a simple user ID string.

## Production Rule

Do not add fake auth. Gate SovereignDocs upstream, then pass user identity into the app and API through a trusted gateway, reverse proxy, Workers middleware, or server session adapter.
