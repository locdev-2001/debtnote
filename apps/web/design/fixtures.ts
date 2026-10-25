import { createDemoRecords } from '../src/features/home/demo-store';
import { getTodayKey } from '../src/features/home/ledger';
import { recordView } from '../src/features/home/presentation';

const today = getTodayKey();
export const exampleDebts = createDemoRecords(today).map((record) => recordView(record, today));
