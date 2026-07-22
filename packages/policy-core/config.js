import fs from 'node:fs';
import {assertDestinationPolicy} from './index.js';

export function loadDestinationConfig(path){
  const parsed=JSON.parse(fs.readFileSync(path,'utf8'));
  assertDestinationPolicy(parsed.destinations);
  return parsed;
}
