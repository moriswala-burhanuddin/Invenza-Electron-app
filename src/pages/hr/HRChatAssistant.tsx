import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Lock } from "lucide-react";
import { useLicense } from "@/contexts/LicenseContext";

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const HRChatAssistant = () => {
    const { hasFeature } = useLicense();
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Hi! I am Invenza HR. Ask me about policies, leave balance, or your shifts.' }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || !window.electronAPI) return;

        const userMsg = input.trim();
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setInput("");
        setLoading(true);

        try {
            // Fetch context (User profile, Attendance summary)
            // For now, we simulate context fetching or fetch basic self-info
            // Ideally we should pass relevant context like "My Leave Balance" if we had a quick API for it.
            // Let's pass a placeholder context that the backend can expand or ignored.
            // Actually, let's fetch basic user info if possible, but the backend `chatWithHR` expects "User Data".
            // We can fetch "My Profile" here.

            const context = {
                user: "Current User", // In a real app, fetch from store/auth
                date: new Date().toISOString().split('T')[0]
            };

            const response = await window.electronAPI.hrChat(userMsg, context);
            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I can't connect to HR right now." }]);
        } finally {
            setLoading(false);
        }
    };

    if (!hasFeature('HR Assistant')) {
        return (
            <Card className="h-[600px] flex flex-col items-center justify-center bg-slate-50 border-dashed">
                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Feature Disabled</h2>
                <p className="text-slate-500 text-sm max-w-sm text-center">
                    The AI HR Assistant is not enabled for your current license. Please contact your system administrator to upgrade your plan.
                </p>
            </Card>
        );
    }

    return (
        <Card className="h-[600px] flex flex-col">
            <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-indigo-600" />
                    HR Assistant
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg p-3 ${m.role === 'user'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-800'
                            }`}>
                            {m.content}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-100 text-slate-500 rounded-lg p-3 text-sm italic">
                            Typing...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </CardContent>
            <div className="p-4 border-t flex gap-2">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask about leaves, shifts..."
                />
                <Button onClick={handleSend} disabled={loading}>
                    <Send className="w-4 h-4" />
                </Button>
            </div>
        </Card>
    );
};

export default HRChatAssistant;
