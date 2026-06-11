const OpenAI = require('openai');
const path = require('path');
const appPath = process.resourcesPath ? process.resourcesPath : path.join(__dirname, '..');
require('dotenv').config({ path: path.join(appPath, '.env') });

// Fallback to hardcoded key for testing if environment variable is missing
const apiKey = process.env.OPENAI_API_KEY || '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';
const isOpenRouter = apiKey.startsWith('sk-or-v1');

const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: isOpenRouter ? "https://openrouter.ai/api/v1" : undefined,
});

/**
 * Truncate large data arrays to fit token limits
 */
function limitData(data, maxItems = 30) {
    if (!Array.isArray(data)) return data;
    if (data.length <= maxItems) return data;
    return data.slice(0, maxItems);
}

async function askAI(query, contextData) {
    const model = isOpenRouter ? "openai/gpt-4o-mini" : "gpt-4o-mini";
    try {
        const response = await openai.chat.completions.create({
            model: model,
            messages: [
                {
                    role: "system",
                    content: "You are a Business Analyst for StoreFlow ERP. You have access to the current snapshot of ERP data. Provide concise, helpful insights. If asked questions about sales, inventory, or customers, analyze the provided context data and give specific numbers or trends."
                },
                {
                    role: "user",
                    content: `Here is the current ERP context: ${JSON.stringify(contextData)}\n\nUser Question: ${query}`.slice(0, 5000) // Further truncation
                }
            ],
            max_tokens: 700,
            temperature: 0.7,
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error('AI Service Error Detail:', error);
        return `AI Error: ${error.message || 'Unknown error'}. Please check your API key and connection.`;
    }
}

async function getInventoryForecast(products, sales) {
    const model = isOpenRouter ? "openai/gpt-4o-mini" : "gpt-4o-mini";
    try {
        // Prepare a summary of sales velocity per product
        const salesSummary = {};
        sales.forEach(sale => {
            try {
                // Handle both stringified and already parsed items
                const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
                if (Array.isArray(items)) {
                    items.forEach(item => {
                        const pid = item.id || item.productId;
                        if (pid) {
                            if (!salesSummary[pid]) salesSummary[pid] = 0;
                            salesSummary[pid] += (item.quantity || 0);
                        }
                    });
                }
            } catch (e) {
                console.warn('[AI] Failed to parse items for sale:', sale.id, e.message);
            }
        });

        const forecastData = products.map(p => ({
            id: p.id,
            name: p.name,
            currentStock: p.quantity,
            soldLast30Days: salesSummary[p.id] || 0,
            minStock: p.minStock || 5
        }));

        const response = await openai.chat.completions.create({
            model: model,
            messages: [
                {
                    role: "system",
                    content: "You are an Inventory Specialist for StoreFlow ERP. Analyze the provided stock and sales data. Identify products at risk of running out of stock (stockouts) and recommend restock quantities. Provide your response as a concise list of recommendations."
                },
                {
                    role: "user",
                    content: `Analyze this data and predict stockouts for the next 14 days:\n${JSON.stringify(limitData(forecastData, 30))}`
                }
            ],
            max_tokens: 700,
            temperature: 0.5,
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error('AI Forecast Error Detail:', error);
        return `AI Error: ${error.message || 'Unknown error'}. Please check your API key and connection.`;
    }
}

async function suggestProductCategory(productName) {
    const model = isOpenRouter ? "openai/gpt-4o-mini" : "gpt-4o-mini";
    try {
        const response = await openai.chat.completions.create({
            model: model,
            messages: [
                {
                    role: "system",
                    content: `You are an expert Inventory Categorizer for a large Industrial & Hardware Store.
                    Your task is to analyze the product name and suggest the most appropriate Category, Brand, and Unit.
                    
                    AVAILABLE CATEGORIES: 
                    - Power Tools (e.g., Drills, Saws, Grinders)
                    - Hand Tools (e.g., Hammers, Screwdrivers, Wrenches)
                    - Plumbing (e.g., Pipes, Valves, Faucets, PVC)
                    - Electrical (e.g., Wires, Switches, Breakers, Lights)
                    - Painting (e.g., Brushes, Rollers, Paint Thinners, Sprays)
                    - Fasteners (e.g., Screws, Bolts, Nails, Anchors)
                    - Safety (e.g., Helmets, Gloves, Boots, Vest)
                    - Other (Use ONLY if it definitely doesn't fit above, e.g., Garden, Automotive)

                    INSTRUCTIONS:
                    1. Extract the Brand from the name if present (e.g., "Makita 18V Drill" -> Brand: "Makita").
                    2. If no brand is obvious, suggest a common manufacturer for that item or leave as "Generic".
                    3. Suggest a standard Unit (e.g., "Pcs", "Set", "Meters", "Box").
                    4. Choose the BEST Category from the list above. Be smart!

                    Respond ONLY with a JSON object: {"category": "...", "brand": "...", "unit": "..."}`
                },
                {
                    role: "user",
                    content: `Product Name: ${productName}`
                }
            ],
            temperature: 0.5,
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.choices[0].message.content);
        console.log('[AI Suggest] Result:', result);
        return result;
    } catch (error) {
        console.error('AI Suggest Error:', error);
        return { category: 'Other', brand: 'Generic', unit: 'Pcs' };
    }
}

async function processInvoiceOCR(imageBase64, existingProducts) {
    const model = isOpenRouter ? "openai/gpt-4o-mini" : "gpt-4o-mini";
    try {
        const response = await openai.chat.completions.create({
            model: model,
            messages: [
                {
                    role: "system",
                    content: `You are an expert Invoice OCR Assistant for a Hardware store.
                    Analyze the provided image of a receipt, handwritten bill, or printed invoice.
                    Your goal is to extract structured data even if the text is messy or handwritten.
                    
                    Extract the following details into a JSON object:
                    - supplier: The name of the vendor/store (look for header text).
                    - date: The date of purchase (YYYY-MM-DD). If year is missing, assume 2026.
                    - totalAmount: The grand total shown on the bill.
                    - items: An array of objects: {"name": "...", "quantity": 1, "price": 0.00}
                    
                    CRITICAL FILTERS: 
                    1. DO NOT include "TOTAL", "SUBTOTAL", "TAX", "VAT", "CASH", "CHANGE", or delivery charges as items. 
                    2. ONLY include actual physical products or services.
                    3. If a row looks like junk text or a header, SKIP IT.
                    
                    INSTRUCTIONS:
                    1. For handwritten items, do your best to decipher the product names.
                    2. If quantity is not specified, default to 1.
                    3. If 'price' is not clear, look for the 'total' or 'amount' per line.
                    4. BE PRECISE with numbers.
                    
                    MATCHING HINT:
                    Here is a list of existing product names in our system: ${existingProducts.map(p => p.name).join(', ')}.
                    If an item on the receipt matches an existing product, use the EXACT name from the list provided.
                    
                    Respond ONLY with the JSON object.`
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Carefully extract all data from this invoice image, especially focusing on legible handwritten parts:" },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${imageBase64}`,
                            },
                        },
                    ],
                },
            ],
            max_tokens: 700,
            temperature: 0,
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.choices[0].message.content);

        // Post-process: try to attach productId for matched items
        if (result.items && Array.isArray(result.items)) {
            result.items = result.items.map(scannedItem => {
                const match = existingProducts.find(p => p.name.toLowerCase() === scannedItem.name.toLowerCase());
                return {
                    ...scannedItem,
                    productId: match ? match.id : null
                };
            });
        }

        console.log('[AI OCR] Processed result:', result);
        return result;
    } catch (error) {
        console.error('AI OCR Error:', error);
        throw new Error('Failed to process invoice image. ' + error.message);
    }
}

async function optimizeReorderPoints(products, sales) {
    const model = isOpenRouter ? "openai/gpt-4o-mini" : "gpt-4o-mini";
    try {
        // Calculate velocity (quantity per day) over the last 30 days
        const salesSummary = {};
        sales.forEach(sale => {
            try {
                const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
                if (Array.isArray(items)) {
                    items.forEach(item => {
                        const pid = item.productId || item.id;
                        if (pid) {
                            if (!salesSummary[pid]) salesSummary[pid] = 0;
                            salesSummary[pid] += (item.quantity || 0);
                        }
                    });
                }
            } catch (e) { }
        });

        const analysisData = products.map(p => ({
            id: p.id,
            name: p.name,
            currentStock: p.quantity,
            soldLast30Days: salesSummary[p.id] || 0,
            currentMinStock: p.minStock || 0,
            currentReorderQty: p.reorderQuantity || 0
        }));

        const response = await openai.chat.completions.create({
            model: model,
            messages: [
                {
                    role: "system",
                    content: `You are an Inventory Optimization AI. 
                    Analyze the sales velocity (sales in last 30 days) and suggest:
                    - minStock: The safety stock level (reorder point).
                    - reorderQuantity: The ideal quantity to purchase when restocking.
                    
                    RULE OF THUMB:
                    - minStock should cover ~7 days of sales.
                    - reorderQuantity should cover ~14-30 days of sales.
                    - Low velocity items should have a minimum minStock of 2 and reorderQuantity of 5.
                    
                    Respond ONLY with a JSON object where keys are product IDs: {"prod-id": {"minStock": 5, "reorderQuantity": 20}, ...}`
                },
                {
                    role: "user",
                    content: `Optimize these products based on 30-day velocity:\n${JSON.stringify(limitData(analysisData, 30))}`
                }
            ],
            max_tokens: 700,
            temperature: 0.3,
            response_format: { type: "json_object" }
        });

        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        console.error('AI Reorder Error:', error);
        throw new Error('Failed to optimize reorder points. ' + error.message);
    }
}

async function analyzeAttendancePatterns(attendanceData, leaveData) {
    const model = isOpenRouter ? "openai/gpt-4o-mini" : "gpt-4o-mini";
    try {
        const response = await openai.chat.completions.create({
            model: model,
            messages: [
                {
                    role: "system",
                    content: `You are an AI HR Specialist for a retail store. 
                    Analyze the attendance and leave records to detect:
                    1. Late patterns (e.g., "Late 3 times this week").
                    2. Absenteeism risk (e.g., "Takes leave every Friday").
                    3. Consistency Score (0-100).
                    
                    Respond ONLY with a JSON object: 
                    { 
                      "employees": [
                        { "userId": "...", "name": "...", "riskScore": "High/Medium/Low", "insight": "...", "consistencyScore": 85 }
                      ],
                      "summary": "Overall attendance is good, but..."
                    }`
                },
                {
                    role: "user",
                    content: `Analyze this data:\nAttendance: ${JSON.stringify(attendanceData)}\nLeaves: ${JSON.stringify(leaveData)}`
                }
            ],
            temperature: 0.4,
            response_format: { type: "json_object" }
        });

        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        console.error('AI HR Error:', error);
        return { employees: [], summary: "Failed to analyze data." };
    }
}

async function optimizeShiftSchedule(salesHistory, staffList) {
    const model = isOpenRouter ? "openai/gpt-4o-mini" : "gpt-4o-mini";
    try {
        const response = await openai.chat.completions.create({
            model: model,
            messages: [
                {
                    role: "system",
                    content: `You are an AI Shift Planner for a retail store.
                    Analyze historical sales timestamps to identify "Peak Hours" (busy times).
                    suggest a shift schedule for the provided staff list to ensure coverage during peaks.
                    
                    Staff Shifts can be:
                    - Morning (08:00 - 16:00)
                    - Evening (12:00 - 20:00)
                    - Full (09:00 - 18:00)

                    Respond ONLY with a JSON object:
                    {
                      "recommendedShifts": [
                        { "userId": "...", "name": "...", "date": "YYYY-MM-DD", "startTime": "HH:mm", "endTime": "HH:mm", "type": "morning/evening/full", "reason": "Covering peak 2pm-4pm" }
                      ],
                      "insights": "Saturdays are busiest at 3 PM..."
                    }`
                },
                {
                    role: "user",
                    content: `Staff: ${JSON.stringify(staffList)}\nSales Samples (last 7 days): ${JSON.stringify(salesHistory.slice(0, 50))}` // Limiting sample size
                }
            ],
            temperature: 0.4,
            response_format: { type: "json_object" }
        });

        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        console.error('AI Schedule Error:', error);
        return { recommendedShifts: [], insights: "Failed to generate schedule." };
    }
}

async function analyzePerformanceAndRisk(performanceData, shrinkageData, shiftsData) {
    const model = isOpenRouter ? "openai/gpt-4o-mini" : "gpt-4o-mini";
    try {
        const response = await openai.chat.completions.create({
            model: model,
            messages: [
                {
                    role: "system",
                    content: `You are an AI Internal Auditor & HR Performance Analyst.
                    
                    Analyze the provided data:
                    1. **Performance**: Compare sales revenue/count per employee. Identify Top Performers.
                    2. **Risk/Theft**: Look for correlations between "High Shrinkage" (Inventory Loss in stock_logs) and employee shifts.
                    
                    **Rules**:
                    - Shrinkage (reason != 'SALE') usually means theft or damage.
                    - If a specific user is *often* on shift when high shrinkage happens, flag as "High Risk".
                    - Be fair: One incident is not a pattern.
                    
                    Respond ONLY with a JSON object:
                    {
                      "topPerformers": [ { "id": "...", "name": "...", "score": 95, "reason": "Highest revenue..." } ],
                      "riskAlerts": [ { "userId": "...", "name": "...", "riskLevel": "High/Medium/Low", "reason": "Associated with 3 shrinkage events..." } ],
                      "summary": "Overall store performance is..."
                    }`
                },
                {
                    role: "user",
                    content: `
                    Performance Data: ${JSON.stringify(performanceData)}
                    Shrinkage Logs: ${JSON.stringify(shrinkageData)}
                    Shifts: ${JSON.stringify(shiftsData)}
                    `
                }
            ],
            temperature: 0.3,
            response_format: { type: "json_object" }
        });

        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        console.error('AI Risk Analysis Error:', error);
        return { topPerformers: [], riskAlerts: [], summary: "Analysis failed." };
    }
}

async function parseResume(resumeText) {
    const model = isOpenRouter ? "openai/gpt-4o-mini" : "gpt-4o-mini";
    try {
        const response = await openai.chat.completions.create({
            model: model,
            messages: [
                {
                    role: "system",
                    content: `You are an expert HR Recruitment AI.
                    Extract candidate details from the Resume Text.
                    
                    Respond ONLY with a JSON object:
                    {
                      "name": "...", 
                      "email": "...", 
                      "phone": "...", 
                      "skills": ["..."], 
                      "experienceYears": 5,
                      "score": 85 (0-100 based on relevance to Retail/Sales roles),
                      "summary": "Strong finding..."
                    }`
                },
                {
                    role: "user",
                    content: `Resume Text: ${resumeText}`
                }
            ],
            temperature: 0.2,
            response_format: { type: "json_object" }
        });
        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        console.error('AI Resume Parse Error:', error);
        return { score: 0, skills: [], summary: "Failed to parse." };
    }
}

async function chatWithHR(query, context) {
    const model = isOpenRouter ? "openai/gpt-4o-mini" : "gpt-4o-mini";
    try {
        const response = await openai.chat.completions.create({
            model: model,
            messages: [
                {
                    role: "system",
                    content: `You are "StoreFlow HR", a helpful HR Assistant for employees.
                    Answer questions based on the provided policy context and user data.
                    
                    Context:
                    - Policies: Leave (12 days/yr), Sick (5 days/yr), Shift timings (9h).
                    - User Data: ${JSON.stringify(context)}
                    
                    Keep answers polite, concise, and helpful.`
                },
                { role: "user", content: query }
            ],
            temperature: 0.7,
        });
        return response.choices[0].message.content;
    } catch (error) {
        console.error('AI HR Chat Error:', error);
        return "I'm having trouble connecting to HR services right now.";
    }
}

module.exports = { askAI, getInventoryForecast, suggestProductCategory, processInvoiceOCR, optimizeReorderPoints, analyzeAttendancePatterns, optimizeShiftSchedule, analyzePerformanceAndRisk, parseResume, chatWithHR };
