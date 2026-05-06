import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../src';

const allowedEnv = { ...env, ALLOWED_ORIGINS: 'https://app.tradux.dev, https://tradux.dev' };

async function fetchUnit(request: Request, testEnv = allowedEnv) {
	const ctx = createExecutionContext();
	const response = await worker.fetch(request, testEnv, ctx);
	await waitOnExecutionContext(ctx);
	return response;
}

describe('Tradux worker proxy API contract', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('returns API metadata for /api/* informational routes', async () => {
		const response = await fetchUnit(new Request('http://example.com/api/status'));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.endpoints).toContain('/api/translate-json');
		expect(body.providers).toContain('openrouter');
	});

	it('rejects unsupported methods on /api/translate-json', async () => {
		const response = await fetchUnit(new Request('http://example.com/api/translate-json', { method: 'GET' }));
		const body = await response.json();

		expect(response.status).toBe(405);
		expect(body).toEqual({ success: false, error: 'Method not allowed' });
	});

	it('validates required translation parameters before calling providers', async () => {
		const response = await fetchUnit(
			new Request('http://example.com/api/translate-json', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ provider: 'openai', apiKey: 'test-key' }),
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.error).toContain('data and targetLanguage');
	});

	it('requires provider credentials for non-cloudflare providers', async () => {
		const response = await fetchUnit(
			new Request('http://example.com/api/translate-json', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ provider: 'openai', data: { hello: 'world' }, targetLanguage: 'pt' }),
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.error).toContain('requires an apiKey');
	});

	it('translates through the declared /api/translate-json contract', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () =>
				new Response(JSON.stringify({ choices: [{ message: { content: '{"hello":"olá"}' } }] }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				}),
			),
		);

		const response = await fetchUnit(
			new Request('http://example.com/api/translate-json', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ provider: 'openai', apiKey: 'test-key', data: { hello: 'world' }, sourceLanguage: 'en', targetLanguage: 'pt' }),
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual({ success: true, translatedData: { hello: 'olá' }, originalLanguage: 'en', targetLanguage: 'pt' });
	});

	it('allows configured browser origins and echoes the allowed origin', async () => {
		const response = await fetchUnit(
			new Request('http://example.com/api/translate-json', {
				method: 'OPTIONS',
				headers: { Origin: 'https://app.tradux.dev' },
			}),
		);

		expect(response.status).toBe(204);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://app.tradux.dev');
		expect(response.headers.get('Vary')).toBe('Origin');
	});

	it('rejects browser origins that are not explicitly configured', async () => {
		const response = await fetchUnit(
			new Request('http://example.com/api/translate-json', {
				method: 'OPTIONS',
				headers: { Origin: 'https://evil.example' },
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(403);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
		expect(body).toEqual({ success: false, error: 'Origin is not allowed.' });
	});

	it('keeps server-to-server requests without Origin usable', async () => {
		const response = await fetchUnit(new Request('http://example.com/api/status'), { ...env, ALLOWED_ORIGINS: '' });

		expect(response.status).toBe(200);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
	});

	it('serves the same contract through the integration worker binding', async () => {
		const response = await SELF.fetch('http://example.com/api/status');
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.name).toBe('Tradux Translation Proxy API');
	});
});
