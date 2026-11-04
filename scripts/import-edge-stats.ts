// Offline preparation only. The operator reviews the output before replacing the KV value.
import {readFileSync} from 'node:fs';
import {readEdge} from '../feedback/worker/src/store-sources';
import {mergeSnapshot, type Snapshot} from '../feedback/worker/src/stats-model';

const [previousFile, edgeFile, observedAt, edgeId] = process.argv.slice(2);
if (!previousFile || !edgeFile || !observedAt || !edgeId)
  throw Error('Usage: bun scripts/import-edge-stats.ts previous.json|- edge.json observedAtUTC edgeItemId');
const read = (file: string) => JSON.parse(readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const previous: Snapshot | null = previousFile === '-' ? null : read(previousFile);
if (previous && (previous.version !== 1 || !previous.chrome || !previous.edge)) throw Error('Invalid previous snapshot');
const time = Date.parse(observedAt);
if (!observedAt.endsWith('Z') || !Number.isFinite(time) || time > Date.now()) throw Error('Invalid UTC observation time');
const date = new Date(time).toISOString();
if (previous?.edge.lastAttempt && previous.edge.lastAttempt >= date) throw Error('Import must be newer than the last Edge attempt');
const edge = readEdge(read(edgeFile),edgeId);
if (!edge.audience || !edge.ratings) throw Error('Incomplete Edge observation');
const next = mergeSnapshot(previous,{},edge,date);
if (previous) next.chrome = previous.chrome;
console.log(JSON.stringify(next));
