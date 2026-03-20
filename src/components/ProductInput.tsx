import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link2, Sparkles, Loader2, Package, DollarSign, FileText, Image as ImageIcon } from "lucide-react";

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
  const [manual, setManual] = useState<ProductData>({
    name: "",
    price: "",
    description: "",
    imageUrl: "",
    link: "",
  });

  const extractFromLink = async () => {
    setIsExtracting(true);
    // Simulate AI extraction
    await new Promise((r) => setTimeout(r, 2000));
    const extracted: ProductData = {
      name: "Fone Bluetooth Premium TWS",
      price: "R$ 89,90",
      description: "Fone de ouvido sem fio com cancelamento de ruído ativo, bateria de 30h e resistência à água IPX5.",
      imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=400&h=400&fit=crop",
      link: link || "https://shopee.com.br/product/123",
    };
    setIsExtracting(false);
    onProductReady(extracted);
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
          Modo Rápido
        </div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>
          Cole o link e a IA faz o resto
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Extraímos dados do produto automaticamente e geramos templates prontos para divulgação.
        </p>
      </div>

      <div className="relative max-w-lg mx-auto">
        <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Cole o link do produto (Amazon, Shopee, Mercado Livre...)"
          className="pl-12 h-14 text-base bg-secondary border-border/50 focus:border-primary/50 rounded-xl"
        />
      </div>

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
              Extraindo dados...
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
