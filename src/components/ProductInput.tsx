import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link2, Sparkles, Loader2, Package, DollarSign, FileText, Image as ImageIcon, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProductData {
  name: string;
  price: string;
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
      const { data, error } = await supabase.functions.invoke("extract-product", {
        body: { url: link.trim() },
      });

      if (error) throw error;

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
          description: product.description,
          imageUrl: product.imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
          link: product.link || link.trim(),
        });
      }
    } catch (err) {
      console.error("Extract error:", err);
      setExtractError("Não foi possível extrair os dados. Preencha manualmente.");
      setShowManual(true);
      toast({
        title: "Erro na extração",
        description: "Tente novamente ou preencha manualmente.",
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
    <div className="space-y-6 animate-fade-up">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary font-medium">
          <Sparkles className="w-4 h-4" />
          Extração Real com IA
        </div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>
          Cole o link e a IA faz o resto
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Extraímos dados do produto automaticamente via scraping + IA e geramos templates prontos.
        </p>
      </div>

      <div className="relative max-w-lg mx-auto">
        <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Cole o link do produto (Amazon, Shopee, Mercado Livre...)"
          className="pl-12 h-14 text-base bg-secondary border-border/50 focus:border-primary/50 rounded-xl"
          onKeyDown={(e) => e.key === "Enter" && extractFromLink()}
        />
      </div>

      {extractError && (
        <div className="max-w-lg mx-auto flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{extractError}</span>
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <Button
          variant="ai"
          size="lg"
          onClick={extractFromLink}
          disabled={isExtracting}
          className="min-w-[220px]"
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
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ou preencher manualmente
        </button>
      </div>

      {showManual && (
        <div className="max-w-lg mx-auto space-y-3 animate-fade-up rounded-xl bg-card border border-border p-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Dados do Produto</h3>
          <div className="space-y-3">
            <div className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} placeholder="Nome do produto" className="pl-10 bg-secondary" />
            </div>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={manual.price} onChange={(e) => setManual({ ...manual, price: e.target.value })} placeholder="Preço (ex: R$ 89,90)" className="pl-10 bg-secondary" />
            </div>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={manual.description} onChange={(e) => setManual({ ...manual, description: e.target.value })} placeholder="Descrição curta" className="pl-10 bg-secondary" />
            </div>
            <div className="relative">
              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={manual.imageUrl} onChange={(e) => setManual({ ...manual, imageUrl: e.target.value })} placeholder="URL da imagem (opcional)" className="pl-10 bg-secondary" />
            </div>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={manual.link} onChange={(e) => setManual({ ...manual, link: e.target.value })} placeholder="Link de afiliado" className="pl-10 bg-secondary" />
            </div>
          </div>
          <Button variant="success" onClick={submitManual} className="w-full">
            Continuar
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProductInput;
