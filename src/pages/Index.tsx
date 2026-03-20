import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ProductInput from "@/components/ProductInput";
import ContentGenerator from "@/components/ContentGenerator";
import TemplatePreview from "@/components/TemplatePreview";
import { Sparkles, Zap, History } from "lucide-react";

type Step = "input" | "content" | "template";

interface ProductData {
  name: string;
  price: string;
  description: string;
  imageUrl: string;
  link: string;
}

interface GeneratedContent {
  titles: string[];
  description: string;
  cta: string;
  hashtags: string[];
  caption: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("input");
  const [product, setProduct] = useState<ProductData | null>(null);
  const [content, setContent] = useState<GeneratedContent | null>(null);

  const handleProductReady = (data: ProductData) => {
    setProduct(data);
    setStep("content");
  };

  const handleContentReady = (gen: GeneratedContent) => {
    setContent(gen);
    setStep("template");
  };

  const stepIndex = step === "input" ? 0 : step === "content" ? 1 : 2;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container max-w-4xl flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center ai-glow">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">TemplateAI</span>
            <button onClick={() => navigate("/historico")} className="ml-3 p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="Histórico">
              <History className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            {["Produto", "Conteúdo", "Template"].map((label, i) => (
              <div key={label} className="flex items-center gap-1.5">
                {i > 0 && <div className="w-6 h-px bg-border" />}
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    i <= stepIndex
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    i < stepIndex ? "bg-success text-success-foreground" : i === stepIndex ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}>
                    {i < stepIndex ? "✓" : i + 1}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container max-w-4xl px-4 py-12">
        {step === "input" && <ProductInput onProductReady={handleProductReady} />}
        {step === "content" && product && (
          <ContentGenerator product={product} onContentReady={handleContentReady} />
        )}
        {step === "template" && product && content && (
          <TemplatePreview product={product} content={content} onBack={() => setStep("content")} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          Powered by IA — Templates otimizados para conversão
        </div>
      </footer>
    </div>
  );
};

export default Index;
