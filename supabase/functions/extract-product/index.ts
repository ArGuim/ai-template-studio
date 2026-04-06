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

async function resolveShortUrl(url: string): Promise<string> {
  try {
    const resp = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    const finalUrl = resp.url;
    if (finalUrl && finalUrl !== url) {
      console.log('Resolved short URL:', url, '->', finalUrl);
      return finalUrl;
    }
  } catch (e) {
    console.log('Could not resolve short URL:', e);
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

async function tryShopeeAffiliateApi(shopId: string, itemId: string, appId: string, appSecret: string): Promise<Record<string, string> | null> {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/api/v2/product/get_item_detail';
    const baseString = `${appId}${path}${timestamp}`;
    
    // Generate HMAC-SHA256 signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(appSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(baseString));
    const signature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const apiUrl = `https://partner.shopeemobile.com${path}?partner_id=${appId}&timestamp=${timestamp}&sign=${signature}&shop_id=${shopId}&item_id=${itemId}`;
    
    console.log('Trying Shopee Affiliate API...');
    const resp = await fetch(apiUrl, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (resp.ok) {
      const data = await resp.json();
      if (data.response) {
        const item = data.response;
        const name = item.item_name || '';
        const price = item.price_info?.current_price 
          ? `R$ ${(item.price_info.current_price / 100000).toFixed(2).replace('.', ',')}`
          : '';
        const description = (item.description || '').slice(0, 150);
        const imageUrl = item.image?.image_url_list?.[0] || '';
        
        console.log('Shopee Affiliate API success:', name);
        return { name, price, description, imageUrl };
      }
    } else {
      const errText = await resp.text();
      console.log('Shopee Affiliate API error:', resp.status, errText);
    }
  } catch (e) {
    console.log('Shopee Affiliate API failed:', e);
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, shopeeAppId, shopeeAppSecret } = await req.json();

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'URL é obrigatória' }),
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
        // Try affiliate API first if credentials provided
        if (shopeeAppId && shopeeAppSecret) {
          const affiliateData = await tryShopeeAffiliateApi(shopId, itemId, shopeeAppId, shopeeAppSecret);
          if (affiliateData && affiliateData.name && affiliateData.name !== '') {
            return new Response(
              JSON.stringify({
                success: true,
                product: {
                  name: affiliateData.name,
                  price: affiliateData.price,
                  description: affiliateData.description,
                  imageUrl: affiliateData.imageUrl,
                  link: formattedUrl,
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
      }
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
      // For Shopee, try Google search as fallback
      if (isShopee) {
        console.log('Shopee login page detected, trying Google search fallback...');
        
        // Try scraping Google search for this product
        const searchQuery = formattedUrl.replace(/https?:\/\//g, '');
        try {
          const googleResult = await scrapeWithFirecrawl(
            `https://www.google.com/search?q=site:shopee.com.br+${encodeURIComponent(searchQuery)}`,
            FIRECRAWL_API_KEY,
            3000
          );
          
          if (googleResult.markdown) {
            // Extract basic info from Google snippet
            const aiResponse = await callAI(LOVABLE_API_KEY, formattedUrl, googleResult.markdown, googleResult.metadata);
            if (aiResponse) {
              return new Response(
                JSON.stringify({
                  success: true,
                  product: {
                    name: aiResponse.name || 'Produto Shopee',
                    price: aiResponse.price || '',
                    description: aiResponse.description || '',
                    imageUrl: aiResponse.imageUrl || '',
                    link: formattedUrl,
                  },
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
        } catch (e) {
          console.log('Google search fallback failed:', e);
        }
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
  "price": "preço com moeda (ex: R$ 89,90)",
  "description": "descrição curta do produto (máx 150 caracteres)",
  "imageUrl": "URL da imagem principal do produto (se encontrada no conteúdo)"
}

Se não encontrar algum campo, use string vazia "".
IMPORTANTE: Tente sempre encontrar a URL da imagem do produto. Procure por URLs de imagem nos formatos: ![](url), src="url", og:image, etc.`
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
                price: { type: "string", description: "Product price with currency" },
                description: { type: "string", description: "Short product description" },
                imageUrl: { type: "string", description: "Main product image URL" },
              },
              required: ["name", "price", "description", "imageUrl"],
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
