import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Copy, Check, Hash, MessageSquare, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProductData {
  name: string;
  price: string;
  description: string;
  imageUrl: string;
  link: string;
}

type ToneOfVoice = "urgente" | "casual" | "profissional" | "divertido";

interface GeneratedContent {
  titles: string[];
  description: string;
  cta: string;
  hashtags: string[];
  caption: string;
}

interface ContentGeneratorProps {
  product: ProductData;
  onContentReady: (content: GeneratedContent, tone: ToneOfVoice) => void;
}

const toneOptions: { value: ToneOfVoice; label: string; emoji: string }[] = [
  { value: "urgente", label: "Urgente", emoji: "🔥" },
  { value: "casual", label: "Casual", emoji: "😊" },
  { value: "profissional", label: "Profissional", emoji: "💼" },
  { value: "divertido", label: "Divertido", emoji: "🎉" },
];

const ContentGenerator = ({ product, onContentReady }: ContentGeneratorProps) => {
  const [tone, setTone] = useState<ToneOfVoice>("casual");
  const [selectedTitle, setSelectedTitle] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  const generate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: {
          productName: product.name,
          productPrice: product.price,
          productDescription: product.description,
          tone,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
        return;
      }

      if (data?.content) {
        setContent(data.content);
        setSelectedTitle(0);
        toast({ title: "✨ Conteúdo gerado!", description: "A IA criou seu conteúdo com sucesso." });
      }
    } catch (err) {
      console.error("Error generating content:", err);
      toast({
        title: "Erro ao gerar conteúdo",
        description: "Não foi possível conectar à IA. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyBtn = ({ text, field }: { text: string; field: string }) => (
    <button
      onClick={() => copyToClipboard(text, field)}
      className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
    >
      {copiedField === field ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Product preview */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
        <img src={product.imageUrl} alt={product.name} className="w-16 h-16 rounded-lg object-cover" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{product.name}</h3>
          <p className="text-success font-bold font-mono">{product.price}</p>
        </div>
      </div>

      {/* Tone selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Tom de voz</label>
        <div className="flex gap-2 flex-wrap">
          {toneOptions.map((t) => (
            <button
              key={t.value}
              onClick={() => setTone(t.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.97] ${
                tone === t.value
                  ? "bg-primary text-primary-foreground ai-glow"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      <Button variant="ai" size="lg" onClick={generate} disabled={isGenerating} className="w-full">
        {isGenerating ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            Gerando com IA real...
          </>
        ) : content ? (
          <>
            <RefreshCw className="w-5 h-5" />
            Regenerar com tom "{tone}"
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Gerar Conteúdo com IA
          </>
        )}
      </Button>

      {content && (
        <div className="space-y-5 animate-fade-up">
          {/* Titles */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Megaphone className="w-4 h-4" />
              Títulos (clique para selecionar)
            </div>
            <div className="space-y-2">
              {content.titles.map((title, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedTitle(i)}
                  className={`flex items-center justify-between gap-2 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedTitle === i
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-secondary border border-transparent hover:border-border"
                  }`}
                >
                  <span className="text-sm">{title}</span>
                  <CopyBtn text={title} field={`title-${i}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MessageSquare className="w-4 h-4" />
                Descrição
              </div>
              <CopyBtn text={content.description} field="desc" />
            </div>
            <p className="text-sm p-3 rounded-lg bg-secondary">{content.description}</p>
          </div>

          {/* CTA */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">CTA</span>
              <CopyBtn text={content.cta} field="cta" />
            </div>
            <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-success font-semibold text-sm">
              {content.cta}
            </div>
          </div>

          {/* Hashtags */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Hash className="w-4 h-4" />
                Hashtags
              </div>
              <CopyBtn text={content.hashtags.map((h) => `#${h}`).join(" ")} field="hashtags" />
            </div>
            <div className="flex flex-wrap gap-2">
              {content.hashtags.map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <Button
            variant="success"
            size="lg"
            onClick={() => onContentReady(content, tone)}
            className="w-full"
          >
            Continuar para Templates →
          </Button>
        </div>
      )}
    </div>
  );
};

export default ContentGenerator;
