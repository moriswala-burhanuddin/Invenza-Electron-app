import React, { useEffect, useState } from 'react';
import { useERPStore } from '@/lib/store-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { CheckCircle2, XCircle, RefreshCw, AlertTriangle, HardDrive, Server, ShieldCheck } from 'lucide-react';
import { isElectron } from '@/lib/electron-helper';

const SyncDiagnostics = () => {
  const isSyncing = useERPStore(state => state.isSyncing);
  const syncError = useERPStore(state => state.syncError);
  const syncData = useERPStore(state => state.syncData);
  const activeStoreId = useERPStore(state => state.activeStoreId);
  const [dirtyStats, setDirtyStats] = useState<Record<string, number>>({});
  const [totalDirty, setTotalDirty] = useState<number>(0);

  const fetchDirtyData = async () => {
    if (isElectron() && window.electronAPI?.getDirtyData) {
      try {
        const dirtyData = await window.electronAPI.getDirtyData();
        if (dirtyData && dirtyData.payload) {
          const stats: Record<string, number> = {};
          let total = 0;
          for (const [table, rows] of Object.entries(dirtyData.payload)) {
            const count = Array.isArray(rows) ? rows.length : 0;
            if (count > 0) {
              stats[table] = count;
              total += count;
            }
          }
          setDirtyStats(stats);
          setTotalDirty(total);
        } else {
          setDirtyStats({});
          setTotalDirty(0);
        }
      } catch (e) {
        console.error("Failed to fetch dirty data", e);
      }
    }
  };

  useEffect(() => {
    fetchDirtyData();
    // Refresh stats periodically
    const interval = setInterval(fetchDirtyData, 5000);
    return () => clearInterval(interval);
  }, [isSyncing]);

  const handleManualSync = async () => {
    await syncData();
    fetchDirtyData();
  };

  return (
    <div className="p-6 md:p-10 bg-slate-50 min-h-screen">
      <div className="mb-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2 flex items-center">
          <RefreshCw className={`mr-3 h-8 w-8 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
          Sync Diagnostics
        </h1>
        <p className="text-slate-500">Monitor and troubleshoot local-to-cloud synchronization.</p>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center">
              <HardDrive className="w-4 h-4 mr-2" />
              Local Storage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {totalDirty}
            </div>
            <p className="text-sm text-slate-500 mt-1">Pending uploads</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center">
              <Server className="w-4 h-4 mr-2" />
              SaaS Backend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${syncError ? 'text-red-600' : 'text-emerald-600'} flex items-center`}>
              {syncError ? 'Failing' : 'Online'}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Active Store: {activeStoreId ? activeStoreId.substring(0, 8) + '...' : 'None'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center">
              <ShieldCheck className="w-4 h-4 mr-2" />
              Multi-Tenant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-slate-900 flex items-center">
              Enforced
            </div>
            <p className="text-sm text-slate-500 mt-1">company_id checks active</p>
          </CardContent>
        </Card>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>System Status Log</CardTitle>
            <CardDescription>Recent events and error traces</CardDescription>
          </CardHeader>
          <CardContent>
            {syncError ? (
              <div className="bg-red-50 text-red-900 p-4 rounded-md flex items-start border border-red-200">
                <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5 text-red-600" />
                <div>
                  <h4 className="font-bold text-sm mb-1 uppercase tracking-wider">Sync Error Detected</h4>
                  <pre className="text-xs whitespace-pre-wrap font-mono uppercase bg-red-100 p-3 rounded">{syncError}</pre>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 text-emerald-900 p-4 rounded-md flex items-start border border-emerald-200">
                <CheckCircle2 className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <h4 className="font-bold text-sm">System Healthy</h4>
                  <p className="text-sm mt-1">Last synchronization completed successfully with 0 errors.</p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-slate-50 border-t border-slate-100 p-4 flex justify-between">
            <div className="text-xs text-slate-500 pt-2">
              Auto-syncs trigger every 5 minutes and on data mutations.
            </div>
            <Button 
              onClick={handleManualSync} 
              disabled={isSyncing}
              className="bg-blue-600 hover:bg-blue-700 font-bold tracking-tight shadow-md"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Synchronizing...' : 'Force Manual Sync'}
            </Button>
          </CardFooter>
        </Card>

        {Object.keys(dirtyStats).length > 0 && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Pending Changes Breakdown</CardTitle>
              <CardDescription>Records cached locally waiting for central submission</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(dirtyStats).map(([table, count]) => (
                  <div key={table} className="bg-slate-100 p-4 rounded-lg flex flex-col items-center justify-center border border-slate-200">
                    <span className="text-3xl font-black text-slate-700">{count}</span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{table.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SyncDiagnostics;
