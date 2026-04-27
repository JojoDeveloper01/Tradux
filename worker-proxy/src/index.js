// ============================================================
// Shared: translation system prompt + JSON extraction
// ============================================================

function buildSystemPrompt(sourceLanguage, targetLanguage) {
	return [
		`You are a professional translator. Translate the JSON values from "${sourceLanguage}" to "${targetLanguage}".`,
		'Rules:',
		'- Keep ALL JSON keys exactly the same — never translate or modify keys.',
		'- Only translate the string values.',
		'- Preserve the JSON structure (arrays, nested objects) exactly.',
		'- Keep template variables like {{variable}} untouched.',
		'- Keep emojis in their original position.',
		'- Do NOT add any explanation, markdown fences, or extra text.',
		'- Return ONLY the translated JSON object.',
	].join('\n');
}

function buildReviewPrompt(sourceLanguage, targetLanguage) {
	return [
		`You are a professional translation reviewer. You will receive a JSON with two keys: "original" (the source text in "${sourceLanguage}") and "translation" (a machine translation to "${targetLanguage}").`,
		'Your task: review and improve the translation. Fix errors, unnatural phrasing, and inconsistencies.',
		'Rules:',
		'- Keep ALL JSON keys exactly the same — never modify keys.',
		'- Only improve the translated string values inside "translation".',
		'- Preserve the JSON structure exactly.',
		'- Keep template variables like {{variable}} untouched.',
		'- Keep emojis in their original position.',
		'- Do NOT add any explanation, markdown fences, or extra text.',
		'- Return ONLY the improved translation JSON (same structure as "translation", no wrapper).',
	].join('\n');
}

function extractJSON(text) {
	const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
	if (fenceMatch) return fenceMatch[1].trim();
	return text.trim();
}

function parseTranslation(content, reviewMode = false) {
	if (!content) throw new Error('LLM returned an empty response.');
	try {
		const parsed = JSON.parse(extractJSON(content));

		// Anti-wrapper safety net for Review Mode
		if (reviewMode && parsed && typeof parsed === 'object' && parsed.translation) {
			return parsed.translation;
		}

		return parsed;
	} catch {
		throw new Error('Failed to parse translated JSON from LLM response.');
	}
}

// ============================================================
// Provider: OpenAI-compatible (OpenRouter, OpenAI, Custom)
// ============================================================

const PROVIDER_BASE_URLS = {
	openrouter: 'https://openrouter.ai/api/v1',
	openai: 'https://api.openai.com/v1',
	copilot: 'https://api.githubcopilot.com',
};

// ============================================================
// Provider: OpenAI-compatible (OpenRouter, OpenAI, Custom)
// ============================================================

async function translateViaOpenAICompatible(obj, sourceLanguage, targetLanguage, apiKey, model, baseURL, systemPrompt, reviewMode) {
	// baseURL is always the API base (e.g. https://openrouter.ai/api/v1)
	// we always append /chat/completions to form the final endpoint
	const base = baseURL || PROVIDER_BASE_URLS.openrouter;
	const url = `${base.replace(/\/+$/, '')}/chat/completions`;

	// Copilot requires these editor identity headers or it returns a plain-text "Access to..." error
	const isCopilot = base === PROVIDER_BASE_URLS.copilot;
	const extraHeaders = isCopilot
		? { 'editor-version': 'vscode/1.98.0', 'editor-plugin-version': 'copilot-chat/0.26.0', 'openai-intent': 'conversation-panel' }
		: {};

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
			...extraHeaders,
		},
		body: JSON.stringify({
			model: model || 'gpt-3.5-turbo',
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: JSON.stringify(obj, null, 2) },
			],
			temperature: 0.2,
		}),
	});

	const rawText = await response.text();
	let result;
	try {
		result = JSON.parse(rawText);
	} catch {
		throw new Error(rawText.slice(0, 300) || 'Non-JSON response from provider');
	}
	if (!response.ok) {
		const detail = result.error?.metadata?.raw || result.error?.message || JSON.stringify(result.error);
		throw new Error(detail || 'Translation API call failed.');
	}

	// Agora sim, passa o reviewMode!
	return parseTranslation(result.choices?.[0]?.message?.content, reviewMode);
}

// ============================================================
// Provider: Anthropic (Claude) — native Messages API
// ============================================================

async function translateViaAnthropic(obj, sourceLanguage, targetLanguage, apiKey, model, systemPrompt, reviewMode) {
	const response = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model: model || 'claude-sonnet-4-20250514',
			max_tokens: 8192,
			system: systemPrompt,
			messages: [{ role: 'user', content: JSON.stringify(obj, null, 2) }],
			temperature: 0.2,
		}),
	});

	const result = await response.json();
	if (!response.ok) {
		throw new Error(result.error?.message || JSON.stringify(result.error) || 'Anthropic translation failed.');
	}
	const text = result.content?.[0]?.type === 'text' ? result.content[0].text : null;
	return parseTranslation(text, reviewMode);
}

// ============================================================
// Provider: Google Gemini — native generateContent API
// ============================================================

async function translateViaGoogle(obj, sourceLanguage, targetLanguage, apiKey, model, systemPrompt, reviewMode) {
	const modelId = model || 'gemini-2.0-flash';
	const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

	const response = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			system_instruction: { parts: [{ text: systemPrompt }] },
			contents: [{ parts: [{ text: JSON.stringify(obj, null, 2) }] }],
			generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
		}),
	});

	const result = await response.json();
	if (!response.ok) {
		throw new Error(result.error?.message || JSON.stringify(result.error) || 'Google Gemini translation failed.');
	}
	const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
	return parseTranslation(text, reviewMode);
}

// ============================================================
// Provider dispatcher — routes to the correct handler
// ============================================================

async function translateObject(data, sourceLanguage, targetLanguage, params) {
	const { provider, model, apiKey, apiToken, accountId, baseURL, reviewMode } = params;

	const systemPrompt = reviewMode ? buildReviewPrompt(sourceLanguage, targetLanguage) : buildSystemPrompt(sourceLanguage, targetLanguage);

	switch (provider) {
		case 'cloudflare':
			if (!accountId) throw new Error('Cloudflare provider requires an accountId.');
			return translateViaOpenAICompatible(
				data,
				sourceLanguage,
				targetLanguage,
				apiToken,
				model || '@cf/minimax/m2.7',
				`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`,
				systemPrompt,
				reviewMode,
			);
		case 'openai':
			return translateViaOpenAICompatible(
				data,
				sourceLanguage,
				targetLanguage,
				apiKey,
				model,
				PROVIDER_BASE_URLS.openai,
				systemPrompt,
				reviewMode,
			);

		case 'copilot':
			return translateViaOpenAICompatible(
				data,
				sourceLanguage,
				targetLanguage,
				apiKey,
				model,
				PROVIDER_BASE_URLS.copilot,
				systemPrompt,
				reviewMode,
			);

		case 'anthropic':
			return translateViaAnthropic(data, sourceLanguage, targetLanguage, apiKey, model, systemPrompt, reviewMode);

		case 'google':
			return translateViaGoogle(data, sourceLanguage, targetLanguage, apiKey, model, systemPrompt, reviewMode);

		case 'custom':
			if (!baseURL) throw new Error('Custom provider requires a baseURL.');
			return translateViaOpenAICompatible(data, sourceLanguage, targetLanguage, apiKey, model, baseURL, systemPrompt, reviewMode);

		case 'openrouter':
		default:
			return translateViaOpenAICompatible(
				data,
				sourceLanguage,
				targetLanguage,
				apiKey || apiToken,
				model,
				PROVIDER_BASE_URLS.openrouter,
				systemPrompt,
				reviewMode,
			);
	}
}

// Headers CORS para permitir requisições de qualquer origem
const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
	async fetch(request) {
		// Handle CORS preflight requests
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 200,
				headers: corsHeaders,
			});
		}

		const url = new URL(request.url);

		// The main translation endpoint
		if (url.pathname === '/api/translate-json') {
			if (request.method !== 'POST') {
				return new Response(
					JSON.stringify({
						success: false,
						error: 'Method not allowed',
					}),
					{
						status: 405,
						headers: corsHeaders,
					},
				);
			}

			try {
				const body = await request.json();
				const { data, targetLanguage, sourceLanguage } = body;

				if (!data || !targetLanguage) {
					return new Response(
						JSON.stringify({
							success: false,
							error: 'Missing required parameters: data and targetLanguage are required.',
						}),
						{ status: 400, headers: corsHeaders },
					);
				}

				// Validate that at least one credential is present
				const { provider, apiKey, apiToken, accountId } = body;

				if (!provider || provider === 'provider_code') {
					return new Response(JSON.stringify({ success: false, error: 'A valid translation provider is required.' }), {
						status: 400,
						headers: corsHeaders,
					});
				}
				if (provider === 'cloudflare' && (!apiToken || !accountId)) {
					return new Response(JSON.stringify({ success: false, error: 'Cloudflare provider requires apiToken and accountId.' }), {
						status: 400,
						headers: corsHeaders,
					});
				}
				if (provider !== 'cloudflare' && !apiKey && !apiToken) {
					return new Response(
						JSON.stringify({ success: false, error: `Provider "${provider}" requires an apiKey (or GITHUB_TOKEN for copilot).` }),
						{ status: 400, headers: corsHeaders },
					);
				}

				const translatedData = await translateObject(data, sourceLanguage || 'en', targetLanguage, body);

				return new Response(
					JSON.stringify({
						success: true,
						translatedData,
						originalLanguage: sourceLanguage || 'en',
						targetLanguage,
					}),
					{
						headers: corsHeaders,
					},
				);
			} catch (error) {
				return new Response(
					JSON.stringify({
						success: false,
						error: error.message,
					}),
					{
						status: 500,
						headers: corsHeaders,
					},
				);
			}
		}

		// Test or informational endpoint for the API
		if (url.pathname.startsWith('/api/')) {
			return new Response(
				JSON.stringify({
					name: 'Tradux Translation Proxy API',
					endpoints: ['/api/translate-json'],
					providers: ['openrouter', 'openai', 'anthropic', 'google', 'cloudflare', 'custom'],
				}),
				{
					headers: corsHeaders,
				},
			);
		}

		return new Response(null, {
			status: 404,
			headers: corsHeaders,
		});
	},
};
