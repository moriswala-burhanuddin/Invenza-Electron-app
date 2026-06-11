import fs from 'fs';

const content = fs.readFileSync('src/lib/store-data.ts', 'utf8');
const lines = content.split('\n');

const startIndexToggleTestMode = lines.findIndex(l => l.includes('toggleTestMode: () => set((state) => ({ testModeEnabled: !state.testModeEnabled })),'));
const toggleTestModeContent = lines[startIndexToggleTestMode];

const startAddLog = lines.findIndex(l => l.includes('addActivityLog: (log: { action: string; details: string }) => {'));
const endAddLog = lines.findIndex((l, i) => i > startAddLog && l.includes('},') && l.trim().length === 3);
const addLogContent = lines.slice(startAddLog, endAddLog + 1).join('\n');

const startSyncData = lines.findIndex(l => l.includes('syncData: async () => {'));
const endSyncData = lines.findIndex((l, i) => i > startSyncData && l.includes('},') && l.trim().length === 7);
const syncDataContent = lines.slice(startSyncData, endSyncData + 1).join('\n');

const startResetSync = lines.findIndex(l => l.includes('resetSyncStatus: () => {'));
const endResetSync = lines.findIndex((l, i) => i > startResetSync && l.includes('},') && l.trim().length === 7);
const resetSyncContent = lines.slice(startResetSync, endResetSync + 1).join('\n');

const startLoadDB = lines.findIndex(l => l.includes('loadFromDatabase: async () => {'));
const endLoadDB = lines.findIndex((l, i) => i > startLoadDB && l.includes('},') && l.trim().length === 7);
const loadDBContent = lines.slice(startLoadDB, endLoadDB + 1).join('\n');

const startClear = lines.findIndex(l => l.includes('clearLocalData: async () => {'));
const endClear = lines.findIndex((l, i) => i > startClear && l.includes('},') && l.trim().length === 7);
const clearContent = lines.slice(startClear, endClear + 1).join('\n');


let finalSystem = [
  'import { StoreSlice, SystemState, ActivityLog, Product, Customer, Sale, Quotation, Purchase, Transaction, Account, Store, User, StockTransfer, ExpenseCategory, TaxSlab, PurchaseOrder, Commission, LoyaltyPoint, ItemKit, CustomField, ProductCustomValue, CustomerCustomValue, Supplier, SupplierCustomField, PaymentTerm, Receiving, Invoice, Category, UserPermission } from \'../types\';',
  'import { API_URL } from \'../config\';',
  'import { isElectron } from \'../electron-helper\';',
  'import { dbAdapter } from \'../db-adapter\';',
  'import { generateId } from \'../utils\';',
  'import { useStoreConfig } from \'../store-config\';',
  '',
  'export const createSystemSlice: StoreSlice<SystemState> = (set, get) => ({',
  '  isSyncing: false,',
  '  syncError: null,',
  '  testModeEnabled: false,',
  '  activityLogs: [],',
  '',
  '  ' + toggleTestModeContent.trim(),
  '',
  addLogContent,
  '',
  syncDataContent,
  '',
  resetSyncContent,
  '',
  loadDBContent,
  '',
  clearContent,
  '});'
].join('\n');

fs.writeFileSync('src/lib/store/modules/system.ts', finalSystem);
console.log('System slice created');
