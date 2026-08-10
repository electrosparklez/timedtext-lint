#!/usr/bin/env node

import { runAction } from './action.js';

process.exitCode = await runAction();
