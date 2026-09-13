// scooba-service's two hosts — the one and only place either address is
// written down. Plain CommonJS (not .ts) on purpose: metro.config.js runs as
// bare Node before any TypeScript/Babel transform exists, so it can only
// `require()` a file like this one, not `import` from endpoints.ts.
//
// Before this file existed, metro.config.js kept its own hand-copied version
// of these two lines and had drifted — its `development` said
// `localhost:1337`, this one said `172.31.133.131:1337` — silently, because
// nothing ever compared them. One file now backs both call sites.
//
// development: scooba-service's `strapi develop` box — see
// scooba-service/CONTEXT.md and the [Scooba-service local dev] note.
module.exports = {
  development: 'http://172.31.133.131:1337',
  production: 'https://apis.eng.psu.ac.th/scooba',
};
