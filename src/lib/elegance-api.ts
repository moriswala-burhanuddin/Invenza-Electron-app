import { API_URL } from './config';

/**
 * Service to interact with the Central ERP Backend for Online Store data.
 * All operations are now centralized in the ERP backend.
 */
export const eleganceApi = {
    /**
     * Helper to get the token from localStorage
     */
    getConfig() {
        // First check legacy/direct token key
        let token = localStorage.getItem('token');

        // Fallback: Extract from the persisted Zustand store if direct token is missing
        if (!token) {
            const persistedStore = localStorage.getItem('erp-store-v1');
            if (persistedStore) {
                try {
                    const parsed = JSON.parse(persistedStore);
                    token = parsed.state?.accessToken;
                } catch (e) {
                    // Silently fail if JSON is malformed
                }
            }
        }

        return {
            baseUrl: API_URL,
            token
        };
    },

    /**
     * Standard fetch wrapper with Auth headers
     */
    async request(endpoint: string, options: RequestInit = {}) {
        const { baseUrl, token } = this.getConfig();

        const url = `${baseUrl}/${endpoint.replace(/^\//, '')}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers,
        };

        try {
            const response = await fetch(url, { ...options, headers });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error("Authentication required or session expired.");
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || errorData.message || `Request failed: ${response.statusText} (${response.status})`);
            }

            return await response.json();
        } catch (err: any) {
            console.error(`API Error (${endpoint}):`, err);
            throw err;
        }
    },

    /**
     * Get store overview stats
     */
    async getStoreSummary() {
        return this.request('online-reports/stats/');
    },

    /**
     * Get list of products
     */
    async getProducts() {
        return this.request('products/');
    },

    /**
     * Get list of online orders
     */
    async getOrders() {
        return this.request('online-orders/');
    },

    /**
     * Update order status
     */
    async updateOrderStatus(id: number | string, status: string) {
        return this.request(`online-orders/${id}/update_status/`, {
            method: 'POST',
            body: JSON.stringify({ status })
        });
    },

    /**
     * Add tracking information
     */
    async addTrackingInfo(id: number | string, data: { courier_name: string; tracking_number: string; shipping_method?: string; estimated_delivery_date?: string }) {
        return this.request(`online-orders/${id}/add_tracking//`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    /**
     * Get detailed info for a single order
     */
    async getOrderDetails(id: number | string) {
        return this.request(`online-orders/${id}/`);
    },

    /**
     * Get list of registered customers
     */
    async getCustomers() {
        return this.request('customers/');
    },

    /**
     * Get reviews from the online store
     */
    async getReviews() {
        return this.request('reviews/');
    },

    /**
     * Delete a review
     */
    async deleteReview(id: number | string) {
        return this.request(`v1/reviews/${id}/`, { method: 'DELETE' });
    },

    /**
     * Get user feedback/contact submissions
     */
    async getFeedback() {
        return this.request('v1/feedback/');
    },

    /**
     * Login to get a new access key
     */
    async login(email, password) {
        const { baseUrl: rawBaseUrl } = this.getConfig();
        let baseUrl = rawBaseUrl;

        // Normalize URL
        baseUrl = baseUrl.replace(/\/$/, '');
        if (!baseUrl.startsWith('http')) {
            baseUrl = `http://${baseUrl}`;
        }

        const url = `${baseUrl}/api/auth/token/`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || "Login failed. Check your email and password.");
        }

        const data = await response.json();
        // Return the access token (JWT)
        return data.access;
    }
};
