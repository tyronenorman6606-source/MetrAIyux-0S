#!/usr/bin/env node
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { resolveDropEnv } = require('../netlify/functions/_lib/drop-env.cjs');

const status = resolveDropEnv();
console.log(JSON.stringify(status, null, 2));
