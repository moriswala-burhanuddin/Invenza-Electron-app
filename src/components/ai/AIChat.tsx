import React, { useState, useRef, useEffect } from "react";
import { Sparkles, MessageSquare, X, Send, Loader2, Bot, User, Trash2 } from "lucide-react";
import { useERPStore } from "@/lib/store-data";
import { aiService } from "@/lib/ai-service";
import { isElectron } from "@/lib/electron-helper";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AIChat: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: "Hello! I'm your Invenza AI Analyst. How can I help you with your ERP data today?" }
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
        setQuery("");
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        try {
            const context = {
                productCount: products.length,
                salesCount: sales.length,
                customerCount: customers.length,
                transactionCount: transactions.length,
                recentProducts: products.slice(0, 10).map(p => ({ name: p.name, stock: p.quantity })),
                recentSales: sales.slice(0, 5).map(s => ({ id: s.invoiceNumber, total: s.totalAmount }))
            };

            let response;
            if (isElectron() && window.electronAPI.askAI) {
                response = await window.electronAPI.askAI(userMsg, context);
            } else {
                response = await aiService.askAI(userMsg, context);
            }
            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (error: any) {
            toast.error(error.message || "Failed to get AI response");
            setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const clearChat = () => {
        setMessages([{ role: 'assistant', content: "Chat cleared. How can I help you now?" }]);
    };

    return (
        <div className="fixed bottom-6 right-6 z-[1000]">
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 group overflow-hidden",
                    isOpen ? "bg-slate-900 rotate-90" : "bg-primary"
                )}
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                {isOpen ? <X className="w-6 h-6 text-white" /> : <Sparkles className="w-7 h-7 text-white fill-white/10" />}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="absolute bottom-20 right-0 w-[400px] h-[600px] bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 duration-300">
                    {/* Header */}
                    <div className="p-6 bg-slate-900 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/10 rounded-xl">
                                <Bot className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-black uppercase tracking-widest text-[10px]">AI Analyst</h3>
                                <p className="text-slate-400 font-bold text-[8px] uppercase tracking-tighter">Real-time ERP Context</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={clearChat}
                            className="p-2 hover:bg-white/10 rounded-lg text-slate-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div 
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50"
                    >
                        {messages.map((msg, idx) => (
                            <div 
                                key={idx}
                                className={cn(
                                    "flex gap-3",
                                    msg.role === 'user' ? "flex-row-reverse" : ""
                                )}
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
                                    msg.role === 'assistant' ? "bg-slate-900" : "bg-indigo-600"
                                )}>
                                    {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-white" />}
                                </div>
                                <div className={cn(
                                    "max-w-[80%] p-4 rounded-2xl text-[11px] font-bold leading-relaxed shadow-sm",
                                    msg.role === 'assistant' 
                                        ? "bg-white text-slate-700 rounded-tl-none border border-slate-100" 
                                        : "bg-indigo-600 text-white rounded-tr-none shadow-indigo-200"
                                )}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center">
                                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                                </div>
                                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-slate-200 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                        <div className="w-1.5 h-1.5 bg-slate-200 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                        <div className="w-1.5 h-1.5 bg-slate-200 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="p-6 bg-white border-t border-slate-50">
                        <div className="relative group">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Ask about sales trends..."
                                className="w-full bg-[#F2F2F7] border-none rounded-2xl py-4 pl-5 pr-12 text-[11px] font-bold outline-none focus:ring-2 focus:ring-primary transition-all"
                            />
                            <button 
                                onClick={handleSend}
                                disabled={!query.trim() || isLoading}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-white rounded-xl hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-primary transition-all"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-[8px] font-black uppercase text-slate-400 tracking-widest">
                          <span>Invenza AI v1.0</span>
                          {!isElectron() && (
                            <span>Credits Remaining: {aiService.getRemainingCredits()}</span>
                          )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
