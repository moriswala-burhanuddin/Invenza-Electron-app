import { useEffect, useState } from 'react';
import { eleganceApi } from '@/lib/elegance-api';

export interface Feedback {
    id: number;
    name: string;
    email: string;
    subject: string;
    message: string;
    rating: number;
    created_at: string;
}
import { Search, MessageSquare, Mail, Star } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminFeedback() {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchFeedback();
    }, []);

    const fetchFeedback = async () => {
        try {
            const res = await eleganceApi.getFeedback();
            setFeedbacks(res.results || res);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load feedback');
        } finally {
            setLoading(false);
        }
    };

    const filteredFeedback = feedbacks.filter(
        (item) =>
            item.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
                    <p className="text-gray-500 text-sm">User inquiries and messages</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search feedback..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 w-full md:w-64 text-sm"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading ? (
                    <div className="col-span-full text-center py-12 text-gray-400">Loading feedback...</div>
                ) : filteredFeedback.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-400">No feedback found</div>
                ) : filteredFeedback.map((item) => (
                    <div key={item.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                                    <MessageSquare size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{item.name}</h3>
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <Mail size={12} />
                                        {item.email}
                                    </div>
                                </div>
                            </div>
                            <span className="text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>

                        <div className="mb-3">
                            <h4 className="font-medium text-gray-900 mb-1">{item.subject}</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">{item.message}</p>
                        </div>

                        {item.rating > 0 && (
                            <div className="flex gap-1 mt-3 pt-3 border-t border-gray-50">
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        size={14}
                                        className={`${i < item.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
