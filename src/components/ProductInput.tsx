import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link2, Sparkles, Loader2, Package, DollarSign, FileText, Image as ImageIcon, AlertCircle, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getApiConfig } from "@/components/ApiSettings";

interface ProductData {
  name: string;
  price: string;
  originalPrice?: string;
  description: string;
  imageUrl: string;
  link: string;
}

interface ProductInputProps {
  onProductReady: (data: ProductData) => void;
}

const ProductInput = ({ onProductReady }: ProductInputProps) => {
  const [link, setLink] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [manual, setManual] = useState<ProductData>({
    name: "",
    price: "",
    originalPrice: "",
    description: "",
    imageUrl: "",
    link: "",
  });
  const { toast } = useToast();

  const extractFromLink = async () => {
    if (!link.trim()) {
      toast({ title: "Cole um link", description: "Insira o link do produto para extrair.", variant: "destructive" });
      return;
    }

    setIsExtracting(true);
    setExtractError(null);

    try {
      const apiConfig = getApiConfig();
      const { data, error } = await supabase.functions.invoke("extract-product", {
        body: { 
          url: link.trim(),
          shopeeAppId: apiConfig.shopeeAppId,
          shopeeAppSecret: apiConfig.shopeeAppSecret,
        },
      });

      if (error) {
        let functionMessage = "Não foi possível extrair os dados. Preencha manualmente.";

        if ("context" in error && error.context instanceof Response) {
          const errorBody = await error.context.json().catch(() => null);
          if (errorBody?.error) {
            functionMessage = errorBody.error;
          }
        }

        throw new Error(functionMessage);
      }

      if (data?.error) {
        setExtractError(data.error);
        toast({ title: "Erro na extração", description: data.error, variant: "destructive" });
        setShowManual(true);
        return;
      }

      if (data?.success && data?.product) {
        const product = data.product;
        toast({ title: "✨ Dados extraídos!", description: `Produto: ${product.name}` });
        onProductReady({
          name: product.name,
          price: product.price,
          originalPrice: product.originalPrice || "",
          description: product.description,
          imageUrl: product.imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
          link: product.link || link.trim(),
        });
      }
    } catch (err) {
      console.error("Extract error:", err);
      const message = err instanceof Error ? err.message : "Não foi possível extrair os dados. Preencha manualmente.";
      setExtractError(message);
      setShowManual(true);
      toast({
        title: "Erro na extração",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const submitManual = () => {
    if (manual.name && manual.price) {
      onProductReady({
        ...manual,
        imageUrl: manual.imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center space-y-4 hero-glow">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary font-medium border border-primary/20">
          <Sparkles className="w-3.5 h-3.5" />
          Extração Real com IA
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight leading-[1.1]">
          Cole o link e a IA
          <br />
          <span className="gradient-text">faz o resto</span>
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto text-base">
          Extraímos dados do produto automaticamente e geramos templates prontos para divulgação.
        </p>
      </div>

      {/* Link input */}
      <div className="relative max-w-lg mx-auto group">
        <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Cole o link do produto..."
          className="pl-12 pr-14 h-14 text-base bg-secondary/50 border-border/50 focus:border-primary/50 rounded-xl"
          onKeyDown={(e) => e.key === "Enter" && extractFromLink()}
        />
        {link.trim() && (
          <button
            onClick={extractFromLink}
            disabled={isExtracting}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Extract error */}
      {extractError && (
        <div className="max-w-lg mx-auto flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{extractError}</span>
        </div>
      )}

      {/* Extract button */}
      <div className="flex flex-col items-center gap-4">
        <Button
          variant="ai"
          size="lg"
          onClick={extractFromLink}
          disabled={isExtracting}
          className="min-w-[240px] h-12 text-base"
        >
          {isExtracting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Extraindo dados reais...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Extrair com IA
            </>
          )}
        </Button>

        <button
          onClick={() => setShowManual(!showManual)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {showManual ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          ou preencher manualmente
        </button>
      </div>

      {/* Manual form */}
      {showManual && (
        <div className="max-w-lg mx-auto space-y-4 animate-fade-up rounded-xl bg-card border border-border p-6">
          <h3 className="text-sm font-display font-semibold text-muted-foreground uppercase tracking-wider">Dados do Produto</h3>
          <div className="space-y-3">
            {[
              { icon: Package, value: manual.name, key: "name" as const, placeholder: "Nome do produto" },
              { icon: DollarSign, value: manual.originalPrice || "", key: "originalPrice" as const, placeholder: "Preço original / antigo (opcional)" },
              { icon: DollarSign, value: manual.price, key: "price" as const, placeholder: "Preço promocional (ex: R$ 89,90)" },
              { icon: FileText, value: manual.description, key: "description" as const, placeholder: "Descrição curta" },
              { icon: ImageIcon, value: manual.imageUrl, key: "imageUrl" as const, placeholder: "URL da imagem (opcional)" },
              { icon: Link2, value: manual.link, key: "link" as const, placeholder: "Link de afiliado" },
            ].map(({ icon: Icon, value, key, placeholder }) => (
              <div key={key} className="relative">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={value}
                  onChange={(e) => setManual({ ...manual, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="pl-10 bg-secondary/50"
                />
              </div>
            ))}
          </div>
          <Button variant="success" onClick={submitManual} className="w-full" disabled={!manual.name || !manual.price}>
            Continuar <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Supported platforms hint */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground/50">
          Amazon • Shopee • Mercado Livre • Shein • AliExpress • Qualquer loja online
        </p>
      </div>
    </div>
  );
};

export default ProductInput;
