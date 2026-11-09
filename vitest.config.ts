import {defineConfig} from 'vitest/config';
// Each PostgreSQL integration suite starts a WASM database; bound concurrency to avoid memory/CPU timeouts.
export default defineConfig({test:{maxWorkers:2}});
