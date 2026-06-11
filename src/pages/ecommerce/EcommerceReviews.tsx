import { useEffect, useState } from 'react';
import { eleganceApi } from '@/lib/elegance-api';
import { Search, Trash2, Star, User } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminReviews() {
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            const res = await eleganceApi.getReviews();
            setReviews(res.results || res);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load reviews');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this review?")) return;
        try {
            await eleganceApi.deleteReview(id);
            setReviews(reviews.filter(r => r.id !== id));
            toast.success("Review deleted");
        } catch (err) {
            toast.error("Failed to delete review");
        }
    }

    const filteredReviews = reviews.filter(
        (review) =>
            review.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            review.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            review.project_title?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
                    <p className="text-gray-500 text-sm">Monitor user feedback and ratings</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search reviews..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full md:w-64 text-sm"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading ? (
                    <div className="col-span-full text-center py-12 text-gray-400">Loading reviews...</div>
                ) : filteredReviews.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-400">No reviews found</div>
                ) : filteredReviews.map((review) => (
                    <div key={review.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{review.user_name || 'Anonymous'}</h3>
                                    <p className="text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(review.id)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>

                        <div className="mb-3">
                            <div className="flex gap-1 mb-2">
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        size={16}
                                        className={`${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                                    />
                                ))}
                            </div>
                            <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
                        </div>

                        {review.project_title && (
                            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 text-xs text-gray-500">
                                <span>Project:</span>
                                <span className="font-medium text-blue-600">{review.project_title}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
