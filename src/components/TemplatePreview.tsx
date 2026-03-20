import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Instagram, MessageCircle, Pin, Copy, Check, Download, Sparkles } from "lucide-react";

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

type Platform = "instagram-feed" | "instagram-stories" | "tiktok" | "pinterest" | "whatsapp";

interface TemplatePreviewProps {
  product: ProductData;
  content: GeneratedContent;
  onBack: () => void;
}

const platforms: { id: Platform; label: string; icon: React.ReactNode }[] = [
  { id: "instagram-feed", label: "Feed", icon: <Instagram className="w-4 h-4" /> },
  { id: "instagram-stories", label: "Stories", icon: <Instagram className="w-4 h-4" /> },
  { id: "tiktok", label: "TikTok", icon: <span className="text-xs font-bold">TT</span> },
  { id: "pinterest", label: "Pinterest", icon: <Pin className="w-4 h-4" /> },
  { id: "whatsapp", label: "WhatsApp", icon: <MessageCircle className="w-4 h-4" /> },
];

const TemplatePreview = ({ product, content, onBack }: TemplatePreviewProps) => {
  const [platform, setPlatform] = useState<Platform>("instagram-feed");
  const [copied, setCopied] = useState(false);

  const copyAll = () => {
    const text = `${content.titles[0]}\n\n${content.description}\n\n${content.cta}\n\n🔗 ${product.link}\n\n${content.hashtags.map((h) => `#${h}`).join(" ")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderTemplate = () => {
    const title = content.titles[0];

    switch (platform) {
      case "instagram-feed":
        return (
          <div className="w-[320px] aspect-square bg-gradient-to-br from-[hsl(263,70%,15%)] to-[hsl(240,10%,8%)] rounded-2xl overflow-hidden relative flex flex-col">
            <div className="flex-1 relative">
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(240,10%,4%)] via-transparent to-transparent" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-5 space-y-2">
              <p className="text-[13px] font-bold leading-tight" style={{ color: "hsl(0,0%,95%)" }}>{title}</p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-extrabold font-mono" style={{ color: "hsl(160,84%,39%)" }}>{product.price}</span>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold" style={{ background: "hsl(263,70%,58%)", color: "white" }}>
                  {content.cta.replace(/[🛒🚀👇]/g, "").trim().substring(0, 20)}
                </span>
              </div>
            </div>
          </div>
        );
      case "instagram-stories":
        return (
          <div className="w-[240px] aspect-[9/16] bg-gradient-to-b from-[hsl(263,70%,20%)] to-[hsl(240,10%,6%)] rounded-2xl overflow-hidden relative flex flex-col items-center justify-between p-6">
            <div className="w-full space-y-1 text-center">
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "hsl(160,84%,39%)" }}>Oferta</p>
              <p className="text-sm font-bold leading-tight" style={{ color: "hsl(0,0%,95%)" }}>{product.name}</p>
            </div>
            <div className="w-32 h-32 rounded-2xl overflow-hidden shadow-2xl">
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            </div>
            <div className="space-y-3 text-center w-full">
              <p className="text-2xl font-extrabold font-mono" style={{ color: "hsl(160,84%,39%)" }}>{product.price}</p>
              <div className="w-full py-2.5 rounded-full text-center text-xs font-bold" style={{ background: "hsl(263,70%,58%)", color: "white" }}>
                ⬆️ Arraste para cima
              </div>
            </div>
          </div>
        );
      case "tiktok":
        return (
          <div className="w-[240px] aspect-[9/16] bg-[hsl(240,10%,4%)] rounded-2xl overflow-hidden relative flex flex-col justify-end">
            <img src={product.imageUrl} alt={product.name} className="absolute inset-0 w-full h-full object-cover opacity-50" />
            <div className="relative p-5 space-y-3">
              <p className="text-lg font-extrabold leading-tight" style={{ color: "hsl(0,0%,100%)", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>{product.name}</p>
              <p className="text-2xl font-black font-mono" style={{ color: "hsl(160,84%,39%)", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>{product.price}</p>
              <p className="text-xs" style={{ color: "hsl(0,0%,80%)" }}>{content.description.substring(0, 80)}...</p>
            </div>
          </div>
        );
      case "pinterest":
        return (
          <div className="w-[260px] bg-card rounded-2xl overflow-hidden border border-border">
            <img src={product.imageUrl} alt={product.name} className="w-full aspect-[4/5] object-cover" />
            <div className="p-4 space-y-2">
              <p className="text-sm font-bold leading-tight">{title.substring(0, 60)}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{content.description}</p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-base font-extrabold font-mono text-success">{product.price}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-bold">Ver oferta</span>
              </div>
            </div>
          </div>
        );
      case "whatsapp":
        return (
          <div className="w-[300px] bg-[hsl(140,20%,14%)] rounded-2xl p-4 space-y-3">
            <div className="rounded-xl overflow-hidden">
              <img src={product.imageUrl} alt={product.name} className="w-full aspect-video object-cover" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold" style={{ color: "hsl(0,0%,95%)" }}>{product.name}</p>
              <p className="text-xl font-extrabold font-mono" style={{ color: "hsl(160,84%,39%)" }}>{product.price}</p>
            </div>
            <p className="text-xs" style={{ color: "hsl(0,0%,75%)" }}>{content.description.substring(0, 100)}</p>
            <p className="text-[11px] font-medium" style={{ color: "hsl(200,80%,60%)" }}>🔗 {product.link.substring(0, 40)}...</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-success/10 px-4 py-1.5 text-sm text-success font-medium">
          <Sparkles className="w-4 h-4" />
          Templates prontos
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Escolha a plataforma</h2>
      </div>

      {/* Platform tabs */}
      <div className="flex gap-2 justify-center flex-wrap">
        {platforms.map((p) => (
          <button
            key={p.id}
            onClick={() => setPlatform(p.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.97] ${
              platform === p.id
                ? "bg-primary text-primary-foreground ai-glow"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* Template preview */}
      <div className="flex justify-center py-4">
        <div className="transition-all duration-300">{renderTemplate()}</div>
      </div>

      {/* Caption preview */}
      <div className="max-w-lg mx-auto space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Legenda gerada</h3>
        <div className="p-4 rounded-xl bg-card border border-border text-sm whitespace-pre-line leading-relaxed">
          {content.caption}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-center flex-wrap">
        <Button variant="outline" onClick={onBack}>
          ← Voltar
        </Button>
        <Button variant="ai" onClick={copyAll}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copiado!" : "Copiar tudo"}
        </Button>
        <Button variant="success">
          <Download className="w-4 h-4" />
          Exportar imagem
        </Button>
      </div>
    </div>
  );
};

export default TemplatePreview;
