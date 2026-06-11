import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, MessageSquare, Loader2, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useERPStore } from '@/lib/store-data';
import { useLicense } from '@/contexts/LicenseContext';

export function AIChatSidebar() {
    const { hasFeature } = useLicense();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([
        { role: 'ai', content: 'Hi! I am your Invenza AI Analyst. Ask me anything about your sales, stock, or customers.' }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { products, sales, customers, transactions } = useERPStore();

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!query.trim() || isLoading) return;

        const userMsg = query.trim();
        setQuery('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        try {
            const productsArray = products || [];
            const salesArray = sales || [];
            const customersArray = customers || [];

            // Provide context data to AI with safety
            const contextData = {
                productCount: productsArray.length,
                totalSalesCount: salesArray.length,
                totalCustomers: customersArray.length,
                recentSales: salesArray.slice(0, 5),
                lowStockCount: productsArray.filter(p => p && (Number(p.quantity) || 0) < 10).length,
                inventoryValue: productsArray.reduce((acc, p) => acc + (Number(p.quantity || 0) * Number(p.purchasePrice || 0)), 0)
            };

            const response = await window.electronAPI.askAI(userMsg, contextData);
            setMessages(prev => [...prev, { role: 'ai', content: response }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I encountered an error connecting to the AI brain.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!hasFeature('Business Analyst')) {
        return null;
    }

    return (
        <>
            {/* Floating Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl z-50 transition-all hover:scale-110 active:scale-95 flex items-center gap-2 group"
            >
                {isOpen ? <X className="w-6 h-6" /> : (
                    <>
                        <Sparkles className="w-6 h-6 animate-pulse" />
                        <span className="max-w-0 overflow-hidden group-hover:max-w-[100px] transition-all duration-300 font-bold uppercase text-[10px] tracking-widest">Ask AI</span>
                    </>
                )}
            </button>

            {/* Sidebar Drawer */}
            <div className={`fixed top-0 right-0 h-full w-80 bg-slate-900 border-l border-slate-800 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}>
                {/* Header */}
                <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-600 text-white">
                            <Bot className="w-4 h-4" />
                        </div>
                        <h3 className="text-xs font-black text-white uppercase tracking-widest">AI Analyst</h3>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8 text-slate-500 hover:text-white">
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Messages Area */}
                <ScrollArea className="flex-1 p-4 bg-slate-900/50">
                    <div ref={scrollRef} className="space-y-4">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 text-[11px] leading-relaxed ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white border-l-2 border-blue-400'
                                    : 'bg-slate-800 text-slate-300 border-l-2 border-slate-600'}`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-slate-800 p-3 rounded-none flex items-center gap-2">
                                    <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Analyzing Data...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="p-4 border-t border-slate-800 bg-slate-950">
                    <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex flex-col gap-2">
                        <Input
                            placeholder="Ask me anything..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="bg-slate-800 border-slate-700 text-white text-xs rounded-none focus-visible:ring-blue-600"
                        />
                        <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest rounded-none">
                            <Send className="w-3 h-3 mr-2" /> SEND QUERY
                        </Button>
                    </form>
                    <p className="text-[9px] text-slate-600 mt-2 text-center uppercase font-bold tracking-tight">Invenza AI v1.2 • GPT-4o-mini</p>
                </div>
            </div>
        </>
    );
}
