import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../src';

const browserOrigin = 'https://app.example';
const browserUnsupportedError = 'Browser requests are not supported. Use Tradux CLI or a trusted server.';

async function fetchWorker(request: Request, envOverrides: Partial<Env> = {}) {
	const ctx = createExecutionContext();
	const response = await worker.fetch(request, { ...env, ...envOverrides }, ctx);
	await waitOnExecutionContext(ctx);
	return response;
}

function jsonRequest(path: string, body: unknown, init: RequestInit = {}) {
	return new Request(`http://example.com${path}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...init.headers },
		body: JSON.stringify(body),
		...init,
	});
}

describe('worker-proxy API contract', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('rejects Origin preflight requests before CORS negotiation', async () => {
		const response = await fetchWorker(
			new Request('http://example.com/api/translate-json', {
				method: 'OPTIONS',
				headers: {
					Origin: browserOrigin,
					'Access-Control-Request-Method': 'POST',
				},
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(403);
		expect(body).toEqual({ success: false, error: browserUnsupportedError });
		expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
		expect(response.headers.get('Access-Control-Allow-Methods')).toBeNull();
		expect(response.headers.get('Access-Control-Allow-Headers')).toBeNull();
	});

	it('returns 204 for non-browser OPTIONS requests', async () => {
		const response = await fetchWorker(
			new Request('http://example.com/api/translate-json', {
				method: 'OPTIONS',
			}),
		);

		expect(response.status).toBe(204);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
	});

	it('rejects browser requests to API metadata routes', async () => {
		const response = await fetchWorker(
			new Request('http://example.com/api/status', {
				headers: { Origin: browserOrigin },
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(403);
		expect(body).toEqual({ success: false, error: browserUnsupportedError });
		expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
	});

	it('rejects unsupported methods for /api/translate-json', async () => {
		const response = await fetchWorker(new Request('http://example.com/api/translate-json'));
		const body = await response.json();

		expect(response.status).toBe(405);
		expect(body).toEqual({ success: false, error: 'Method not allowed' });
		expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
	});

	it('rejects requests missing required translation parameters', async () => {
		const response = await fetchWorker(jsonRequest('/api/translate-json', { data: { hello: 'Hello' } }));
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body).toEqual({
			success: false,
			error: 'Missing required parameters: data and targetLanguage are required.',
		});
	});

	it('rejects requests without provider credentials', async () => {
		const response = await fetchWorker(
			jsonRequest('/api/translate-json', {
				provider: 'openai',
				data: { hello: 'Hello' },
				targetLanguage: 'es',
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body).toEqual({
			success: false,
			error: 'Provider "openai" requires an apiKey (or GITHUB_TOKEN for copilot).',
		});
	});

	it('returns translated data from a successful OpenAI-compatible provider response', async () => {
		const providerFetch = vi.fn(async () =>
			new Response(
				JSON.stringify({
					choices: [{ message: { content: JSON.stringify({ hello: 'Hola' }) } }],
				}),
				{ status: 200, headers: { 'Content-Type': 'application/json' } },
			),
		);
		vi.stubGlobal('fetch', providerFetch);

		const response = await fetchWorker(
			jsonRequest('/api/translate-json', {
				provider: 'openai',
				apiKey: 'test-key',
				model: 'gpt-test',
				data: { hello: 'Hello' },
				sourceLanguage: 'en',
				targetLanguage: 'es',
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual({
			success: true,
			translatedData: { hello: 'Hola' },
			originalLanguage: 'en',
			targetLanguage: 'es',
		});
		expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
		expect(response.headers.get('Vary')).toBeNull();
		expect(providerFetch).toHaveBeenCalledWith(
			'https://api.openai.com/v1/chat/completions',
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({
					Authorization: 'Bearer test-key',
					'Content-Type': 'application/json',
				}),
			}),
		);
	});

	it('rejects Origin POST requests before parsing body or calling providers', async () => {
		const providerFetch = vi.fn();
		vi.stubGlobal('fetch', providerFetch);

		const response = await fetchWorker(
			new Request('http://example.com/api/translate-json', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: browserOrigin,
				},
				body: '{not valid json',
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(403);
		expect(body).toEqual({ success: false, error: browserUnsupportedError });
		expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
		expect(providerFetch).not.toHaveBeenCalled();
	});

	it('rejects Codex provider on the remote worker because it is local-only', async () => {
		const providerFetch = vi.fn();
		vi.stubGlobal('fetch', providerFetch);

		const response = await fetchWorker(
			new Request('http://example.com/api/translate-json', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					provider: 'codex',
					data: { greeting: 'Hello' },
					targetLanguage: 'es',
					sourceLanguage: 'en',
				}),
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.success).toBe(false);
		expect(body.error).toContain('local-only');
		expect(providerFetch).not.toHaveBeenCalled();
	});

	it('returns API metadata for no-Origin server-to-server status-style API routes', async () => {
		const response = await fetchWorker(new Request('http://example.com/api/status'));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual({
			name: 'Tradux Translation Proxy API',
			endpoints: ['/api/translate-json'],
			providers: ['openrouter', 'openai', 'anthropic', 'google', 'cloudflare', 'copilot', 'custom'],
		});
		expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
	});
});
