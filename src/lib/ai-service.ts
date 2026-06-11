import { isElectron } from './electron-helper';

// API Configuration
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';
const BASE_URL = import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1';

// Usage Limits
const MAX_REQUESTS_PER_SESSION = 20;
const USAGE_KEY = 'inv_ai_usage_count';

const getUsageCount = (): number => {
  const count = localStorage.getItem(USAGE_KEY);
  return count ? parseInt(count, 10) : 0;
};

const incrementUsage = () => {
  const count = getUsageCount();
  localStorage.setItem(USAGE_KEY, (count + 1).toString());
};

const checkLimit = () => {
  // DONT LIMIT IN ERP: Only apply session limits to the web demo environment
  if (isElectron()) return;

  if (getUsageCount() >= MAX_REQUESTS_PER_SESSION) {
    throw new Error('AI usage limit reached for this session. Please contact support for more credits.');
  }
};

/**
 * Truncate large data arrays to fit token limits
 */
function limitData(data: any[], maxItems = 30) {
  if (!Array.isArray(data)) return data;
  if (data.length <= maxItems) return data;
  return data.slice(0, maxItems);
}

/**
 * Generic AI call function for the web
 */
async function callAI(messages: any[], temperature = 0.7, responseFormat?: string) {
  // 1. Detect Environment
  const isProdWeb = !isElectron() && import.meta.env.PROD;
  const proxyUrl = '/.netlify/functions/ai-proxy';

  // 2. Security Check: If on web, we use the proxy (No VITE_ key needed!)
  // If local dev, we still require the VITE_ key for convenience.
  if (!isProdWeb && !isElectron() && !API_KEY) {
    throw new Error('OpenAI API Key is missing for local development. Please set VITE_OPENAI_API_KEY in your .env file.');
  }

  checkLimit();

  // 3. Determine Endpoint & Headers
  const url = isProdWeb ? proxyUrl : `${BASE_URL}/chat/completions`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  if (!isProdWeb) {
    headers['Authorization'] = `Bearer ${API_KEY}`;
  }

  // 4. Send Request
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 1000,
      temperature,
      response_format: responseFormat ? { type: responseFormat } : undefined
    })
  });

  if (!response.ok) {
    const errorBody = await response.json();
    let message = errorBody.error?.message || 'Failed to call AI service';
    
    // REDACTION: Never allow sk- or "API key" to be displayed on the frontend
    if (message.includes('sk-') || message.includes('API key')) {
      message = 'AI Service Authentication Error. Please check your credentials in the Netlify settings.';
    }
    
    throw new Error(message);
  }

  const data = await response.json();
  incrementUsage();
  return data.choices[0].message.content;
}

export const aiService = {
  // In production web, we are always "configured" via the proxy
  isConfigured: () => (import.meta.env.PROD && !isElectron()) || !!API_KEY,
  getRemainingCredits: () => Math.max(0, MAX_REQUESTS_PER_SESSION - getUsageCount()),

  askAI: async (query: string, contextData: any) => {
    const messages = [
      {
        role: "system",
        content: "You are a Business Analyst for Invenza ERP. Analyze the data and provide concise insights. Focus on trends, low stock, and top customers."
      },
      {
        role: "user",
        content: `Context: ${JSON.stringify(contextData)}\n\nQuestion: ${query}`
      }
    ];
    return await callAI(messages);
  },

  getInventoryForecast: async (products: any[], sales: any[]) => {
    const salesSummary: Record<string, number> = {};
    sales.forEach(sale => {
      const items = Array.isArray(sale.items) ? sale.items : [];
      items.forEach((item: any) => {
        const pid = item.productId || item.id;
        if (pid) {
          salesSummary[pid] = (salesSummary[pid] || 0) + (item.quantity || 0);
        }
      });
    });

    const forecastData = products.map(p => ({
      name: p.name,
      stock: p.quantity,
      sold30d: salesSummary[p.id] || 0,
      min: p.minStock || 5
    }));

    const messages = [
      {
        role: "system",
        content: "You are an Inventory Specialist. Predict stockouts for the next 14 days and suggest restock quantities. Respond in a brief, professional list."
      },
      {
        role: "user",
        content: `Data: ${JSON.stringify(limitData(forecastData, 30))}`
      }
    ];
    return await callAI(messages, 0.5);
  },

  suggestProductCategory: async (productName: string) => {
    const messages = [
      {
        role: "system",
        content: `Suggest Category, Brand, and Unit for a hardware product. 
        Categories: Power Tools, Hand Tools, Plumbing, Electrical, Painting, Fasteners, Safety, Other.
        Respond ONLY with JSON: {"category": "...", "brand": "...", "unit": "..."}`
      },
      {
        role: "user",
        content: `Product: ${productName}`
      }
    ];
    const res = await callAI(messages, 0.5, 'json_object');
    return JSON.parse(res);
  },

  processInvoiceOCR: async (imageBase64: string, existingProducts: any[]) => {
    const messages = [
      {
        role: "system",
        content: `Extract structured data from invoice image. 
        JSON format: {"supplier": "...", "date": "...", "totalAmount": 0, "items": [{"name": "...", "quantity": 1, "price": 0}]}.
        Existing products: ${existingProducts.map(p => p.name).join(', ')}`
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Extract invoice data:" },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
        ]
      }
    ];
    // Note: GPT-4o-mini supports vision
    const res = await callAI(messages, 0, 'json_object');
    return JSON.parse(res);
  },

  optimizeReorderPoints: async (products: any[], sales: any[]) => {
    const salesSummary: Record<string, number> = {};
    sales.forEach(sale => {
      const items = Array.isArray(sale.items) ? sale.items : [];
      items.forEach((item: any) => {
        const pid = item.productId || item.id;
        if (pid) {
          salesSummary[pid] = (salesSummary[pid] || 0) + (item.quantity || 0);
        }
      });
    });

    const analysisData = products.slice(0, 50).map(p => ({
      id: p.id,
      name: p.name,
      stock: p.quantity,
      v30: salesSummary[p.id] || 0,
      min: p.minStock || 0,
      rq: p.reorderQuantity || 0
    }));

    const messages = [
      {
        role: "system",
        content: `Inventory Optimization AI. Suggest minStock (7 day coverage) and reorderQuantity (14-30 day coverage). 
        Respond ONLY with JSON: {"prod-id": {"minStock": 5, "reorderQuantity": 20}, ...}`
      },
      {
        role: "user",
        content: `Data: ${JSON.stringify(limitData(analysisData, 30))}`
      }
    ];
    const res = await callAI(messages, 0.3, 'json_object');
    return JSON.parse(res);
  }
};
