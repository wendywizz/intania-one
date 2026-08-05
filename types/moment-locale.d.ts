/**
 * moment ships its locale bundles as plain JS with no accompanying types, so a
 * side-effect `import 'moment/locale/th'` — the documented way to register the
 * Thai locale — has nothing to resolve to. TypeScript 6 rejects that outright
 * (TS2882) where earlier versions let it through. Declaring the module keeps
 * the import, which is load-bearing: without it every Thai date in the app
 * falls back to English.
 */
declare module 'moment/locale/th';
