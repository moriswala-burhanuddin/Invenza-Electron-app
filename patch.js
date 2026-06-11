import fs from 'fs';

const content = fs.readFileSync('src/lib/store-data.ts', 'utf8');
const lines = content.split('\n');

const endOfErpState = lines.findIndex(l => l.includes('export const useERPStore = create<ERPState>()('));

let typesLines = lines.slice(0, endOfErpState);
const startInitial = typesLines.findIndex(l => l.includes('// Initial Demo Data'));
const startTaxSlab = typesLines.findIndex(l => l.includes('export interface TaxSlab {'));

let finalTypes = [
  'import { StateCreator } from \'zustand\';',
  ...typesLines.slice(0, startInitial),
  ...typesLines.slice(startTaxSlab)
].join('\n');

finalTypes = finalTypes.replace(/from '\.\//g, "from '../");
finalTypes += '\n\nexport type StoreSlice<T> = StateCreator<ERPState, [["zustand/persist", unknown]], [], T>;\n';

fs.mkdirSync('src/lib/store', { recursive: true });
fs.writeFileSync('src/lib/store/types.ts', finalTypes);
console.log('Types created properly');
