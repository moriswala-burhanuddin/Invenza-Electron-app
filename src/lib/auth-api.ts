import { API_URL } from './config';

export const authApi = {
    login: async (email, password, company_id?: string) => {
        try {
            // Using standard Django SimpleJWT endpoint
            const response = await fetch(`${API_URL}/auth/token/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, company_id })
            });

            const contentType = response.headers.get('content-type');
            let data;
            if (contentType && contentType.includes('application/json')) {
                try {
                    data = await response.json();
                } catch (jsonError) {
                    console.error("Auth API JSON Parse Error:", jsonError);
                }
            } else {
                console.warn("Auth API received non-JSON response:", contentType);
            }

            if (!response.ok) {
                // Return a structured error
                return {
                    success: false,
                    message: (data && (data.detail || data.message)) || `Login failed (Status: ${response.status})`,
                    status: response.status
                };
            }

            return { success: true, data };
        } catch (error) {
            console.error("Auth API Error:", error);
            return {
                success: false,
                message: error.message || 'Network error',
                isNetworkError: true
            };
        }
    },

    checkEmail: async (email: string) => {
        try {
            const response = await fetch(`${API_URL}/auth/check-email/?email=${encodeURIComponent(email)}`);
            return await response.json();
        } catch (e) {
            return { available: true }; // Fallback to allow if API is down
        }
    },

    refreshToken: async (refresh) => {
        try {
            const response = await fetch(`${API_URL}/auth/token/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh })
            });
            return await response.json();
        } catch (e) {
            return null;
        }
    }
};
