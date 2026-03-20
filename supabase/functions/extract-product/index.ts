import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

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

    // Step 1: Scrape with Firecrawl
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    if (!scrapeResponse.ok) {
      const errData = await scrapeResponse.text();
      console.error('Firecrawl error:', scrapeResponse.status, errData);

      if (scrapeResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Créditos do Firecrawl insuficientes. Atualize seu plano.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: `Erro ao acessar a página (${scrapeResponse.status})` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scrapeData = await scrapeResponse.json();
    const markdown = scrapeData.data?.markdown || scrapeData.markdown || '';
    const metadata = scrapeData.data?.metadata || scrapeData.metadata || {};

    if (!markdown) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não foi possível extrair conteúdo da página' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scrape successful, extracting product data with AI...');

    // Step 2: Use Lovable AI to structure the scraped data
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
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

Se não encontrar algum campo, use string vazia "".`
          },
          {
            role: "user",
            content: `URL: ${formattedUrl}
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
        return new Response(
          JSON.stringify({ success: false, error: 'Limite de requisições atingido. Tente novamente em alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errText);
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    
    // Parse tool call response
    let product;
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        product = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error('Failed to parse tool call:', toolCall.function.arguments);
        throw new Error('Failed to parse AI response');
      }
    } else {
      // Fallback: try parsing from content
      const rawContent = aiData.choices?.[0]?.message?.content || '';
      try {
        const cleaned = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        product = JSON.parse(cleaned);
      } catch {
        console.error('Failed to parse AI content:', rawContent);
        throw new Error('Failed to parse AI response');
      }
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
