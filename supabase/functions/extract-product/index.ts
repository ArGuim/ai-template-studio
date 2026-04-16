import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function isShopeeUrl(url: string): boolean {
  return /shopee\.|s\.shopee\.|shp\.ee/i.test(url);
}

function isLoginOrBlockedPage(markdown: string, title: string): boolean {
  const blockedPatterns = [
    /p[aá]gina de login/i,
    /fazer login/i,
    /sign in/i,
    /log in to/i,
    /captcha/i,
    /acesse sua conta/i,
    /entre na sua conta/i,
  ];
  const combined = `${title} ${markdown.slice(0, 1000)}`;
  return blockedPatterns.some(p => p.test(combined));
}

function decodeInlineJsString(value: string): string {
  try {
    return JSON.parse(`"${value.replace(/"/g, '\\"')}"`);
  } catch {
    return value
      .replace(/\\u0026/gi, '&')
      .replace(/\\\//g, '/');
  }
}

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function maskCredential(value: string): string {
  const normalized = value.trim();
  if (!normalized) return 'missing';
  if (normalized.length <= 6) return `${normalized.length} chars`;
  return `${normalized.slice(0, 3)}…${normalized.slice(-2)} (${normalized.length} chars)`;
}

function buildShopeeAffiliateAuthHeader(appId: string, timestamp: string, signature: string, withSpaces: boolean): string {
  return withSpaces
    ? `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`
    : `SHA256 Credential=${appId},Timestamp=${timestamp},Signature=${signature}`;
}

function extractShopeeRedirectUrl(html: string): string | null {
  const httpUrlMatch = html.match(/httpUrl\s*:\s*"([^"]+)"/i);
  if (httpUrlMatch?.[1]) {
    return decodeInlineJsString(httpUrlMatch[1]);
  }

  const deepLinkMatch = html.match(/deepLinkUrl\s*:\s*"([^"]+)"/i);
  if (deepLinkMatch?.[1]) {
    const deepLink = decodeInlineJsString(deepLinkMatch[1]);
    const navigateUrlMatch = deepLink.match(/[?&]navigate_url=([^&]+)/i);
    if (navigateUrlMatch?.[1]) {
      return decodeURIComponent(navigateUrlMatch[1]);
    }
  }

  return null;
}

async function resolveShortUrl(url: string): Promise<string> {
  for (const method of ['HEAD', 'GET']) {
    try {
      const resp = await fetch(url, {
        method,
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        },
      });
      const finalUrl = resp.url;
      if (finalUrl && finalUrl !== url) {
        console.log('Resolved short URL:', url, '->', finalUrl);
        return finalUrl;
      }

      if (method === 'GET') {
        const html = await resp.text();
        const extractedUrl = extractShopeeRedirectUrl(html);

        if (extractedUrl && extractedUrl !== url) {
          console.log('Resolved Shopee transfer page URL:', url, '->', extractedUrl);
          return extractedUrl;
        }
      }
    } catch (e) {
      console.log(`Could not resolve short URL with ${method}:`, e);
    }
  }
  return url;
}

function extractShopeeIdFromUrl(url: string): { shopId?: string; itemId?: string } {
  // Format: product-name-i.SHOP_ID.ITEM_ID
  const match1 = url.match(/i\.(\d+)\.(\d+)/);
  if (match1) {
    return { shopId: match1[1], itemId: match1[2] };
  }
  // Format: /product/SHOP_ID/ITEM_ID or /opaanlp/SHOP_ID/ITEM_ID or any /path/SHOP_ID/ITEM_ID
  const match2 = url.match(/shopee\.com\.br\/[^/]+\/(\d{5,})\/(\d{5,})/);
  if (match2) {
    return { shopId: match2[1], itemId: match2[2] };
  }
  return {};
}

async function scrapeWithFirecrawl(url: string, apiKey: string, waitFor = 3000): Promise<{ markdown: string; metadata: Record<string, string> }> {
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      onlyMainContent: true,
      waitFor,
    }),
  });

  if (!response.ok) {
    const errData = await response.text();
    console.error('Firecrawl error:', response.status, errData);
    if (response.status === 402) {
      throw { status: 402, message: 'Créditos do Firecrawl insuficientes. Atualize seu plano.' };
    }
    throw { status: 500, message: `Erro ao acessar a página (${response.status})` };
  }

  const data = await response.json();
  return {
    markdown: data.data?.markdown || data.markdown || '',
    metadata: data.data?.metadata || data.metadata || {},
  };
}

async function tryShopeeApi(shopId: string, itemId: string): Promise<Record<string, string> | null> {
  try {
    const apiUrl = `https://shopee.com.br/api/v4/item/get?shopid=${shopId}&itemid=${itemId}`;
    const resp = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://shopee.com.br/',
      },
    });
    
    if (resp.ok) {
      const data = await resp.json();
      const item = data.data;
      if (item) {
        const name = item.name || '';
        const price = item.price ? `R$ ${(item.price / 100000).toFixed(2).replace('.', ',')}` : '';
        const description = (item.description || '').slice(0, 150);
        const imageUrl = item.image ? `https://down-br.img.susercontent.com/file/${item.image}` : '';
        
        console.log('Shopee API success:', name);
        return { name, price, description, imageUrl };
      }
    }
  } catch (e) {
    console.log('Shopee API fallback failed:', e);
  }
  return null;
}

interface ShopeeAffiliateLookupResult {
  product: Record<string, string> | null;
  error?: string;
}

async function tryShopeeAffiliateApi(shopId: string, itemId: string, appId: string, appSecret: string): Promise<ShopeeAffiliateLookupResult> {
  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payload = JSON.stringify({
      operationName: 'ProductOfferV2',
      query: compactWhitespace(`
        query ProductOfferV2($itemId: Int64!, $shopId: Int64!) {
          productOfferV2(itemId: $itemId, shopId: $shopId, page: 1, limit: 5) {
            nodes {
              itemId
              shopId
              productName
              productLink
              offerLink
              imageUrl
              priceMin
              priceMax
            }
          }
        }
      `),
      variables: {
        itemId: itemId,
        shopId: shopId,
      },
    });

    const encoder = new TextEncoder();
    const signatureBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(`${appId}${timestamp}${payload}${appSecret}`));
    const signature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    console.log('Trying Shopee Affiliate API...', {
      shopId,
      itemId,
      appId: maskCredential(appId),
      appSecret: maskCredential(appSecret),
    });

    let lastError = 'Não foi possível consultar a API de afiliados da Shopee.';

    for (const withSpaces of [false, true]) {
      const resp = await fetch('https://open-api.affiliate.shopee.com.br/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': buildShopeeAffiliateAuthHeader(appId, timestamp, signature, withSpaces),
        },
        body: payload,
      });

      const responseText = await resp.text();
      let data: any = null;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch {
        data = null;
      }

      if (resp.ok) {
        const nodes = data?.data?.productOfferV2?.nodes || [];
        const item = nodes.find((node: any) => String(node.itemId) === itemId && String(node.shopId) === shopId) || nodes[0];
        if (item) {
          console.log('Shopee Affiliate raw item:', JSON.stringify(item));
          const name = item.productName || '';
          const priceMin = Number(item.priceMin || 0);
          const priceMax = Number(item.priceMax || 0);
          // Try to detect price format: could be cents (divide by 100) or micro-units (divide by 100000)
          const formatPrice = (v: number) => {
            if (v <= 0) return '';
            if (v > 100000) return `R$ ${(v / 100000).toFixed(2).replace('.', ',')}`;
            if (v > 1000) return `R$ ${(v / 100).toFixed(2).replace('.', ',')}`;
            return `R$ ${v.toFixed(2).replace('.', ',')}`;
          };
          const price = formatPrice(priceMin) || formatPrice(priceMax);
          const originalPrice = priceMax > priceMin && priceMin > 0 ? formatPrice(priceMax) : '';
          const imageUrl = item.imageUrl || '';
          const link = item.offerLink || item.productLink || '';

          console.log('Shopee Affiliate API success:', name, { price, originalPrice });
          return { product: { name, price, originalPrice, description: '', imageUrl, link } };
        }

        if (nodes.length > 0) {
          lastError = 'A Shopee respondeu, mas não encontrou esse produto nessas credenciais de afiliado.';
          console.log('Shopee Affiliate API returned nodes, but no exact item match', { requestedShopId: shopId, requestedItemId: itemId, returnedCount: nodes.length });
          continue;
        }

        const graphQLError = data?.errors?.[0]?.message || data?.error || data?.message;
        if (graphQLError) {
          lastError = `Shopee API: ${graphQLError}`;
          console.log('Shopee Affiliate API GraphQL error:', graphQLError);
          continue;
        }

        lastError = 'A Shopee respondeu sem dados para esse produto.';
        continue;
      }

      const graphQLError = data?.errors?.[0]?.message || data?.error || data?.message;
      lastError = graphQLError
        ? `Shopee API: ${graphQLError}`
        : `Shopee API respondeu com status ${resp.status}.`;
      console.log('Shopee Affiliate API error:', {
        status: resp.status,
        withSpaces,
        error: graphQLError || responseText,
      });
    }
  } catch (e) {
    console.log('Shopee Affiliate API failed:', e);
    return { product: null, error: 'Falha ao autenticar na API da Shopee. Confira App ID/App Secret e tente novamente.' };
  }
  return { product: null, error: 'Falha ao autenticar na API da Shopee. Confira App ID/App Secret e tente novamente.' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Corpo da requisição inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { url, shopeeAppId, shopeeAppSecret } = body as { url?: string; shopeeAppId?: string; shopeeAppSecret?: string };
    const HARDCODED_SHOPEE_APP_ID = '18393900790';
    const HARDCODED_SHOPEE_APP_SECRET = 'IH2LRVG3OVQYFIFMU6R2772QQAY6XURW';
    const normalizedShopeeAppId = (typeof shopeeAppId === 'string' && shopeeAppId.trim()) ? shopeeAppId.trim() : HARDCODED_SHOPEE_APP_ID;
    const normalizedShopeeAppSecret = (typeof shopeeAppSecret === 'string' && shopeeAppSecret.trim()) ? shopeeAppSecret.trim() : HARDCODED_SHOPEE_APP_SECRET;

    if (!url || typeof url !== 'string' || url.trim().length === 0 || url.trim().length > 2048) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL é obrigatória e deve ter no máximo 2048 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL format
    try {
      const parsed = new URL(url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'URL inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'LOVABLE_API_KEY não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping product URL:', formattedUrl);

    const isShopee = isShopeeUrl(formattedUrl);

    // For Shopee short links, resolve to full URL first
    if (isShopee && (formattedUrl.includes('s.shopee') || formattedUrl.includes('shp.ee'))) {
      formattedUrl = await resolveShortUrl(formattedUrl);
    }

    // Try Shopee APIs if we can extract IDs
    if (isShopee) {
      const { shopId, itemId } = extractShopeeIdFromUrl(formattedUrl);
      if (shopId && itemId) {
        let affiliateApiError = '';

        // Try affiliate API first if credentials provided
        if (true) { // Always try affiliate API (hardcoded fallback)
          const affiliateResult = await tryShopeeAffiliateApi(shopId, itemId, normalizedShopeeAppId, normalizedShopeeAppSecret);
          affiliateApiError = affiliateResult.error || '';
          const affiliateData = affiliateResult.product;
          if (affiliateData && affiliateData.name && affiliateData.name !== '') {
            return new Response(
              JSON.stringify({
                success: true,
                product: {
                  name: affiliateData.name,
                  price: affiliateData.price,
                  description: affiliateData.description,
                  imageUrl: affiliateData.imageUrl,
                  link: affiliateData.link || formattedUrl,
                },
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // Fallback to public API
        const shopeeData = await tryShopeeApi(shopId, itemId);
        if (shopeeData && shopeeData.name && shopeeData.name !== '') {
          return new Response(
            JSON.stringify({
              success: true,
              product: {
                name: shopeeData.name,
                price: shopeeData.price,
                description: shopeeData.description,
                imageUrl: shopeeData.imageUrl,
                link: formattedUrl,
              },
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: false,
            error: normalizedShopeeAppId && normalizedShopeeAppSecret
              ? affiliateApiError || 'Não foi possível consultar a Shopee pela API oficial. Verifique suas credenciais ou tente o link completo do produto.'
              : 'Para extrair produtos da Shopee, configure seu App ID e App Secret em APIs de Lojas.',
          }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Não consegui identificar o produto da Shopee pelo link. Use o link completo do produto.',
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Scrape with Firecrawl (longer wait for Shopee)
    let scrapeResult;
    try {
      scrapeResult = await scrapeWithFirecrawl(formattedUrl, FIRECRAWL_API_KEY, isShopee ? 8000 : 3000);
    } catch (e: any) {
      return new Response(
        JSON.stringify({ success: false, error: e.message }),
        { status: e.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { markdown, metadata } = scrapeResult;

    // Check if we got a login/blocked page
    if (!markdown || isLoginOrBlockedPage(markdown, metadata.title || '')) {
      if (isShopee) {
        console.log('Shopee blocked after short-link resolution; skipping Google AI fallback to avoid wrong products.');
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: isShopee 
            ? 'A Shopee bloqueou a extração automática. Por favor, preencha os dados manualmente.'
            : 'Não foi possível extrair conteúdo da página',
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scrape successful, extracting product data with AI...');

    const product = await callAI(LOVABLE_API_KEY, formattedUrl, markdown, metadata);
    if (!product) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não foi possível processar os dados do produto' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Product extracted:', product.name);

    return new Response(
      JSON.stringify({
        success: true,
        product: {
          name: product.name || metadata.title || '',
          price: product.price || '',
          originalPrice: product.originalPrice || '',
          description: product.description || metadata.description || '',
          imageUrl: product.imageUrl || '',
          link: formattedUrl,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('extract-product error:', e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function callAI(apiKey: string, url: string, markdown: string, metadata: Record<string, string>): Promise<Record<string, string> | null> {
  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: `Você é um extrator de dados de produtos. A partir do conteúdo de uma página de produto, extraia as informações principais.

Responda APENAS com JSON válido, sem markdown, sem explicação:
{
  "name": "nome do produto",
  "price": "preço atual/promocional com moeda (ex: R$ 89,90)",
  "originalPrice": "preço original/antigo com moeda, se houver desconto (ex: R$ 129,90). Se não houver preço antigo, use string vazia",
  "description": "descrição curta do produto (máx 150 caracteres)",
  "imageUrl": "URL da imagem principal do produto (se encontrada no conteúdo)"
}

Se não encontrar algum campo, use string vazia "".
IMPORTANTE: Tente sempre encontrar a URL da imagem do produto. Procure por URLs de imagem nos formatos: ![](url), src="url", og:image, etc.
IMPORTANTE: Se a página mostrar preço com desconto (de/por, preço riscado, etc), extraia o preço original em "originalPrice" e o preço atual em "price".`
        },
        {
          role: "user",
          content: `URL: ${url}
Título da página: ${metadata.title || ''}
Descrição meta: ${metadata.description || ''}

Conteúdo da página:
${markdown.slice(0, 4000)}`
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_product",
            description: "Extract product data from page content",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "Product name" },
                price: { type: "string", description: "Current/promotional price with currency" },
                originalPrice: { type: "string", description: "Original price before discount, empty string if no discount" },
                description: { type: "string", description: "Short product description" },
                imageUrl: { type: "string", description: "Main product image URL" },
              },
              required: ["name", "price", "originalPrice", "description", "imageUrl"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_product" } },
    }),
  });

  if (!aiResponse.ok) {
    if (aiResponse.status === 429) {
      throw new Error('Limite de requisições atingido. Tente novamente em alguns segundos.');
    }
    const errText = await aiResponse.text();
    console.error('AI gateway error:', aiResponse.status, errText);
    return null;
  }

  const aiData = await aiResponse.json();

  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    try {
      return JSON.parse(toolCall.function.arguments);
    } catch {
      console.error('Failed to parse tool call:', toolCall.function.arguments);
    }
  }

  const rawContent = aiData.choices?.[0]?.message?.content || '';
  try {
    const cleaned = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    console.error('Failed to parse AI content:', rawContent);
  }

  return null;
}
