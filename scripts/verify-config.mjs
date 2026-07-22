import path from 'node:path';
import {loadDestinationConfig} from '../packages/policy-core/config.js';
const config=loadDestinationConfig(path.resolve('config','destinations.json'));
console.log(`Destination policy verified: ${Object.keys(config.destinations).length} destinations; flagship manual-only.`);
