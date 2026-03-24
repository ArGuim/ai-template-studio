import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ProductInput from "@/components/ProductInput";
import ContentGenerator from "@/components/ContentGenerator";
import TemplatePreview from "@/components/TemplatePreview";
import ApiSettings from "@/components/ApiSettings";
import { Sparkles, Zap, History, RotateCcw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  const resetFlow = () => {
    setStep("input");
    setProduct(null);
    setContent(null);
  };

  const stepIndex = step === "input" ? 0 : step === "content" ? 1 : 2;
  const stepLabels = ["Produto", "Conteúdo", "Template"];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 glass sticky top-0 z-50">
        <div className="container max-w-4xl flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center ai-glow">
              <Zap className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">TemplateAI</span>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1">
            {stepLabels.map((label, i) => (
              <div key={label} className="flex items-center gap-1">
                {i > 0 && (
                  <div className={`w-5 h-px transition-colors duration-500 ${i <= stepIndex ? "bg-primary/50" : "bg-border"}`} />
                )}
                <button
                  onClick={() => {
                    if (i < stepIndex) {
                      if (i === 0) setStep("input");
                      if (i === 1 && product) setStep("content");
                    }
                  }}
                  disabled={i > stepIndex}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                    i <= stepIndex
                      ? "text-primary"
                      : "text-muted-foreground"
                  } ${i < stepIndex ? "cursor-pointer hover:bg-primary/5" : ""}`}
                >
                  <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-all duration-300 ${
                    i < stepIndex
                      ? "bg-success text-success-foreground"
                      : i === stepIndex
                      ? "bg-primary text-primary-foreground ai-glow"
                      : "bg-secondary text-muted-foreground"
                  }`}>
                    {i < stepIndex ? "✓" : i + 1}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1">
            {step !== "input" && (
              <Button variant="ghost" size="icon" onClick={resetFlow} title="Novo template" className="text-muted-foreground hover:text-foreground">
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => navigate("/historico")} title="Histórico" className="text-muted-foreground hover:text-foreground">
              <History className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container max-w-4xl px-4 py-10 flex-1">
        <div className="animate-fade-up" key={step}>
          {step === "input" && <ProductInput onProductReady={handleProductReady} />}
          {step === "content" && product && (
            <ContentGenerator product={product} onContentReady={handleContentReady} />
          )}
          {step === "template" && product && content && (
            <TemplatePreview product={product} content={content} onBack={() => setStep("content")} />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 py-5 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-1.5">
          <Sparkles className="w-3 h-3 text-primary/60" />
          <span className="opacity-70">Powered by IA — Templates otimizados para conversão</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
