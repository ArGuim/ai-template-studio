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
    const { productName, productPrice, productDescription, tone, productLink } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const toneInstructions: Record<string, string> = {
      urgente: "Use um tom URGENTE, com palavras como 'CORRE', 'ÚLTIMAS UNIDADES', 'NÃO PERCA'. Use emojis de fogo e raio. Crie senso de escassez.",
      casual: "Use um tom casual e amigável, como se estivesse indicando para um amigo. Use emojis fofos e linguagem informal.",
      profissional: "Use um tom profissional e analítico. Foque em custo-benefício, qualidade e dados objetivos. Seja formal mas acessível.",
      divertido: "Use um tom divertido e humorístico. Faça piadas, use memes e referências populares. Seja irreverente e engraçado.",
      luxo: "Use um tom PREMIUM e EXCLUSIVO. Palavras como 'sofisticado', 'exclusivo', 'selecionado'. Transmita elegância, qualidade superior e status. Use emojis dourados ✨💎👑.",
      informativo: "Use um tom EDUCATIVO e DETALHADO. Explique benefícios, funcionalidades e diferenciais. Use dados, comparações e fatos. Seja didático e informativo. Use emojis de livro 📖📊.",
      emocional: "Use um tom EMOCIONAL e de STORYTELLING. Conecte o produto a sentimentos, memórias e experiências. Crie uma narrativa envolvente. Use emojis de coração 💖🥺✨.",
      tecnico: "Use um tom TÉCNICO e de ESPECIFICAÇÕES. Liste specs, compare com concorrentes, destaque dados técnicos. Seja preciso e objetivo. Use emojis de engrenagem ⚙️📐🔧.",
    };

    const isAmazon = productLink && /amazon\.|amzn\./i.test(productLink);

    const amazonRule = isAmazon
      ? `\n\nREGRA CRÍTICA (PRODUTO DA AMAZON): NÃO mencione preços, valores, descontos, porcentagens de desconto, disponibilidade de estoque ou promoções específicas. Em vez disso, use frases como "Para saber mais, link na bio", "Confira todos os detalhes no link da bio", "Acesse o link na bio para ver mais". O CTA deve direcionar para o link na bio, NUNCA mencionar preço.`
      : '';

    const systemPrompt = `Você é um copywriter especialista em marketing de afiliados no Brasil. Gere conteúdo persuasivo para divulgação de produtos.

IMPORTANTE: Responda APENAS com JSON válido, sem markdown, sem código, sem explicação. Apenas o objeto JSON.

${toneInstructions[tone] || toneInstructions.casual}${amazonRule}

Gere o conteúdo no seguinte formato JSON:
{
  "titles": ["título 1", "título 2", "título 3"],
  "description": "descrição curta persuasiva",
  "cta": "call to action com emoji",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5", "hashtag6"],
  "caption": "legenda completa para post com quebras de linha"
}`;

    const userPrompt = `Produto: ${productName}
${isAmazon ? '' : `Preço: ${productPrice}\n`}${productDescription ? `Descrição: ${productDescription}` : ''}
Tom de voz: ${tone}

Gere conteúdo persuasivo para divulgação deste produto nas redes sociais.${isAmazon ? ' Lembre-se: NÃO mencione preços, descontos ou estoque. Use "link na bio" como direcionamento.' : ''}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos em Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error("No content returned from AI");
    }

    let content;
    try {
      const cleaned = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      content = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      throw new Error("Failed to parse AI response");
    }

    return new Response(JSON.stringify({ success: true, content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
