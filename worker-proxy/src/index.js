// A sua função auxiliar para traduzir objetos
async function translateObject(obj, targetLanguage, apiToken, accountId) {
	if (typeof obj === 'string') {
		// Pular variáveis de template
		if (obj.includes('{{') && obj.includes('}}')) {
			return obj;
		}

		try {
			const aiApiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/m2m100-1.2b`;

			const response = await fetch(aiApiUrl, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${apiToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					text: obj,
					source_lang: "english",
					target_lang: targetLanguage,
				}),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.errors?.[0]?.message || 'Cloudflare AI translation failed.');
			}

			return result.result.translated_text || obj;
		} catch (error) {
			console.error('Translation error:', error);
			return obj;
		}
	} else if (Array.isArray(obj)) {
		const translatedArray = [];
		for (const item of obj) {
			translatedArray.push(await translateObject(item, targetLanguage, apiToken, accountId));
		}
		return translatedArray;
	} else if (obj && typeof obj === 'object') {
		const translatedObj = {};
		for (const [key, value] of Object.entries(obj)) {
			translatedObj[key] = await translateObject(value, targetLanguage, apiToken, accountId);
		}
		return translatedObj;
	}

	return obj;
}

// Headers CORS para permitir requisições de qualquer origem
const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
	async fetch(request) {
		// Lidar com CORS preflight requests
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 200,
				headers: corsHeaders
			});
		}

		const url = new URL(request.url);

		// O endpoint principal de tradução
		if (url.pathname === "/api/translate-json") {
			if (request.method !== 'POST') {
				return new Response(JSON.stringify({
					success: false,
					error: 'Method not allowed'
				}), {
					status: 405,
					headers: corsHeaders
				});
			}

			try {
				// Receber os dados e as credenciais do utilizador do corpo da requisição
				const { data, targetLanguage, apiToken, accountId } = await request.json();

				if (!data || !targetLanguage || !apiToken || !accountId) {
					return new Response(JSON.stringify({
						success: false,
						error: 'Missing required parameters: data, targetLanguage, apiToken, or accountId'
					}), {
						status: 400,
						headers: corsHeaders
					});
				}

				// Chamar a função de tradução usando as credenciais do utilizador
				const translatedData = await translateObject(data, targetLanguage, apiToken, accountId);

				return new Response(JSON.stringify({
					success: true,
					translatedData,
					originalLanguage: 'english',
					targetLanguage
				}), {
					headers: corsHeaders
				});
			} catch (error) {
				return new Response(JSON.stringify({
					success: false,
					error: error.message
				}), {
					status: 500,
					headers: corsHeaders
				});
			}
		}

		// Endpoint de teste ou informativo para a API
		if (url.pathname.startsWith("/api/")) {
			return new Response(JSON.stringify({
				name: "Cloudflare AI Translation Proxy API",
				endpoints: ["/api/translate-json"]
			}), {
				headers: corsHeaders
			});
		}

		// Resposta para rotas não encontradas
		return new Response(null, {
			status: 404,
			headers: corsHeaders
		});
	},
};