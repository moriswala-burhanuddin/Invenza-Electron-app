/**
 * Netlify Function: AI Proxy
 * Acts as a secure bridge to hide API keys and avoid CORS issues.
 */
exports.handler = async (event) => {
  // 1. Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  // 2. Get environment variables (Private)
  const API_KEY = process.env.OPENAI_API_KEY;
  const BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'OpenAI API Key is not configured on Netlify.' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    
    // 3. Forward the request to OpenAI / OpenRouter
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    
    // 4. Sanitize the response to avoid leaking API keys (Security Fix)
    // AI providers like OpenAI/OpenRouter sometimes include the key in error messages.
    let responseBody = JSON.stringify(data);
    const sensitiveFound = responseBody.includes('sk-') || responseBody.includes('API key');
    
    if (sensitiveFound) {
      console.warn('[AI Proxy Security]: Sensitive data detected in provider response. Redacting...');
      if (data.error && data.error.message) {
        // Log the REAL error for the developer in Netlify logs, but don't send it to the browser.
        console.error('[AI Proxy REAL ERROR]:', data.error.message);
        data.error.message = 'Authentication failed or AI service is currently unavailable. Please check your API configuration in Netlify.';
      } else {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'AI provider returned a sensitive error message. Check server logs.' })
        };
      }
    }

    // 5. Return the sanitized response back to the browser
    return {
      statusCode: response.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTION"
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('[AI Proxy SYSTEM Error]:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An internal error occurred while processing your AI request.' })
    };
  }
};
