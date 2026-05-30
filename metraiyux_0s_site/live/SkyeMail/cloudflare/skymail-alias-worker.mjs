const CANONICAL_ORIGIN = "https://skyemail-platform.graylondonskyes.workers.dev";

export default {
  async fetch(request) {
    const target = new URL(request.url);
    const canonical = new URL(CANONICAL_ORIGIN);
    target.protocol = canonical.protocol;
    target.hostname = canonical.hostname;
    target.port = canonical.port;
    return fetch(new Request(target.toString(), request));
  },
};
