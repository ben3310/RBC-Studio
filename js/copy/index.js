import {makeInstagram} from './instagram.js';
import {makeTiktok} from './tiktok.js';
import {makeTelegram} from './telegram.js';
import {makeThreads} from './threads.js';
import {makeX} from './x.js';
import {makeDm} from './dm.js';

// 'dm' is intentionally absent from app.js's PLATFORMS list, which is what
// keeps it out of the 5-channel readiness meter — it stays registered here
// so it shares the same testable maker contract as every public channel.
export const COPY_MAKERS={instagram:makeInstagram,tiktok:makeTiktok,telegram:makeTelegram,threads:makeThreads,x:makeX,dm:makeDm};
