import { useState } from 'react';
import { Sparkles, Loader2, AlertTriangle, RefreshCcw, PackageCheck } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useERPStore } from '@/lib/store-data';
import { isElectron } from '@/lib/electron-helper';
import { aiService } from '@/lib/ai-service';

export function InventoryForecast() {
    const { products, sales } = useERPStore();
    const [forecast, setForecast] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const generateForecast = async () => {
        setIsLoading(true);
        try {
            // Get last 30 days of sales
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

            const recentSales = sales.filter(s => s.date >= dateStr);
            let result;

            if (isElectron() && window.electronAPI) {
                result = await window.electronAPI.getInventoryForecast(products, recentSales);
            } else {
                // Web Demo: Use our new aiService
                result = await aiService.getInventoryForecast(products, recentSales);
            }
            
            setForecast(result);
        } catch (error: any) {
            console.error('Forecast error:', error);
            setForecast(`AI Forecast Error: ${error.message || "Please check your connection."}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="erp-card bg-slate-900 border-slate-800 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Sparkles className="w-32 h-32 text-blue-400" />
            </div>

            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-none">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="font-black text-xs uppercase tracking-[0.2em]">Smart Inventory Prediction</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">AI-Powered Stockout Analysis</p>
                    </div>
                </div>
                <Button
                    onClick={generateForecast}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest rounded-none h-9 px-4"
                >
                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <RefreshCcw className="w-3 h-3 mr-2" />}
                    {forecast ? 'RE-ANALYZE' : 'GENERATE FORECAST'}
                </Button>
            </div>

            <div className="relative z-10">
                {!forecast && !isLoading && (
                    <div className="py-12 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-slate-800 flex items-center justify-center mb-4 border border-slate-700">
                            <PackageCheck className="w-8 h-8 text-slate-500" />
                        </div>
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-300">Predict Future Stock Needs</h4>
                        <p className="text-[10px] text-slate-500 mt-2 max-w-xs font-bold leading-relaxed uppercase">
                            Analyze your sales velocity and current stock levels to identify which products need restocking soon.
                        </p>
                    </div>
                )}

                {isLoading && (
                    <div className="py-12 flex flex-col items-center">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] animate-pulse">Running Neural Stock Analysis...</span>
                    </div>
                )}

                {forecast && !isLoading && (
                    <div className="bg-slate-950 border border-slate-800 p-6 min-h-[200px]">
                        <div className="flex items-center gap-2 mb-4 text-amber-500">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">AI Actionable Insights</span>
                        </div>
                        <div className="text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap erp-prose">
                            {forecast}
                        </div>
                        <div className="mt-8 flex justify-end">
                            <p className="text-[9px] text-slate-600 italic font-bold">Based on 30-day sales history • Predicted for 14-day window</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
