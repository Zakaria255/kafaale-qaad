// Vercel serverless entry point — imports the compiled backend Express app.
// backend/ compiles to CommonJS while this file is ESM, so the shape of the
// import depends on how Node's cjs interop resolves `exports.default`. Unwrap
// defensively so we always hand Vercel the express handler, never the module.
import * as serverModule from '../backend/dist/server.js';

const mod: any = serverModule;
const app = mod?.default?.default ?? mod?.default ?? mod;

export default app;
