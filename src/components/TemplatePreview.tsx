import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Instagram, MessageCircle, Pin, Copy, Check, Download, Sparkles, Edit3, Save, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import { saveToHistory } from "@/lib/history";

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

type Platform = "instagram-post" | "instagram-feed" | "instagram-stories" | "whatsapp-status";

interface TemplatePreviewProps {
  product: ProductData;
  content: GeneratedContent;
  onBack: () => void;
}

const platforms: { id: Platform; label: string; icon: React.ReactNode; hint: string }[] = [
  { id: "instagram-post", label: "IG Post", icon: <ImageIcon className="w-4 h-4" />, hint: "Foco em imagem" },
  { id: "instagram-feed", label: "IG Feed", icon: <Instagram className="w-4 h-4" />, hint: "Imagem + texto" },
  { id: "instagram-stories", label: "Stories", icon: <Instagram className="w-4 h-4" />, hint: "Vertical + título forte" },
  { id: "whatsapp-status", label: "WhatsApp", icon: <MessageCircle className="w-4 h-4" />, hint: "Imagem inteira + título" },
];

const TemplatePreview = ({ product, content: initialContent, onBack }: TemplatePreviewProps) => {
  const [platform, setPlatform] = useState<Platform>("instagram-post");
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState<GeneratedContent>(initialContent);
  const [editTitle, setEditTitle] = useState(content.titles[0]);
  const [editDescription, setEditDescription] = useState(content.description);
  const [editCta, setEditCta] = useState(content.cta);
  const templateRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const toggleEdit = () => {
    if (isEditing) {
      setContent(prev => ({
        ...prev,
        titles: [editTitle, ...prev.titles.slice(1)],
        description: editDescription,
        cta: editCta,
      }));
      toast({ title: "✅ Alterações salvas!" });
    } else {
      setEditTitle(content.titles[0]);
      setEditDescription(content.description);
      setEditCta(content.cta);
    }
    setIsEditing(!isEditing);
  };

  const copyAll = () => {
    const text = `${content.titles[0]}\n\n${content.description}\n\n${content.cta}\n\n🔗 ${product.link}\n\n${content.hashtags.map((h) => `#${h}`).join(" ")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportImage = useCallback(async () => {
    if (!templateRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(templateRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `template-${platform}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      saveToHistory({
        product,
        content,
        platform,
        thumbnail: canvas.toDataURL("image/png", 0.3),
        createdAt: new Date().toISOString(),
      });

      toast({ title: "📸 Imagem exportada!", description: "Salvo no histórico também." });
    } catch (err) {
      console.error("Export error:", err);
      toast({ title: "Erro ao exportar", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  }, [platform, product, content, toast]);

  const title = isEditing ? editTitle : content.titles[0];
  const desc = isEditing ? editDescription : content.description;
  const cta = isEditing ? editCta : content.cta;
  const editableClass = isEditing ? "outline outline-2 outline-dashed outline-primary/40 rounded px-1 focus:outline-primary" : "";

  const renderTemplate = () => {
    switch (platform) {
      // Instagram Post: FOCO EM IMAGEM — imagem grande, texto mínimo sobreposto
      case "instagram-post":
        return (
          <div className="w-[320px] aspect-square rounded-2xl overflow-hidden relative shadow-2xl shadow-primary/10">
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(240,10%,4%,0.85)] via-transparent to-transparent" />
            {/* Minimal overlay — just price badge and small CTA */}
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1.5 rounded-full text-sm font-extrabold font-mono backdrop-blur-md" style={{ background: "hsl(160,84%,39%,0.9)", color: "hsl(240,10%,4%)" }}>
                {product.price}
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <p className={`text-xs font-semibold leading-tight mb-2 ${editableClass}`} style={{ color: "hsl(0,0%,90%)" }} contentEditable={isEditing} suppressContentEditableWarning onBlur={(e) => isEditing && setEditTitle(e.currentTarget.textContent || "")}>
                {title.substring(0, 60)}
              </p>
              <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold ${editableClass}`} style={{ background: "linear-gradient(135deg, hsl(263,70%,58%), hsl(263,70%,48%))", color: "white" }} contentEditable={isEditing} suppressContentEditableWarning onBlur={(e) => isEditing && setEditCta(e.currentTarget.textContent || "")}>
                {cta.replace(/[🛒🚀👇]/g, "").trim().substring(0, 18)}
              </span>
            </div>
          </div>
        );

      // Instagram Feed: imagem + texto equilibrado
      case "instagram-feed":
        return (
          <div className="w-[320px] aspect-square bg-gradient-to-br from-[hsl(263,70%,15%)] to-[hsl(240,10%,8%)] rounded-2xl overflow-hidden relative flex flex-col shadow-2xl shadow-primary/10">
            <div className="flex-1 relative">
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover opacity-80" crossOrigin="anonymous" />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(240,10%,4%)] via-[hsl(240,10%,4%,0.3)] to-transparent" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-5 space-y-2">
              <p className={`text-[13px] font-bold leading-tight ${editableClass}`} style={{ color: "hsl(0,0%,95%)" }} contentEditable={isEditing} suppressContentEditableWarning onBlur={(e) => isEditing && setEditTitle(e.currentTarget.textContent || "")}>{title}</p>
              <p className={`text-[10px] leading-relaxed ${editableClass}`} style={{ color: "hsl(0,0%,75%)" }} contentEditable={isEditing} suppressContentEditableWarning onBlur={(e) => isEditing && setEditDescription(e.currentTarget.textContent || "")}>{desc.substring(0, 90)}</p>
              <div className="flex items-center justify-between">
                <span className="text-xl font-extrabold font-mono" style={{ color: "hsl(160,84%,39%)" }}>{product.price}</span>
                <span className={`px-4 py-1.5 rounded-full text-[11px] font-bold ${editableClass}`} style={{ background: "linear-gradient(135deg, hsl(263,70%,58%), hsl(263,70%,48%))", color: "white" }} contentEditable={isEditing} suppressContentEditableWarning onBlur={(e) => isEditing && setEditCta(e.currentTarget.textContent || "")}>
                  {cta.replace(/[🛒🚀👇]/g, "").trim().substring(0, 20)}
                </span>
              </div>
            </div>
          </div>
        );

      // Instagram Stories: texto vertical + título forte
      case "instagram-stories":
        return (
          <div className="w-[240px] aspect-[9/16] bg-gradient-to-b from-[hsl(263,70%,20%)] to-[hsl(240,10%,6%)] rounded-2xl overflow-hidden relative flex flex-col items-center justify-between p-6 shadow-2xl shadow-primary/10">
            <div className="w-full space-y-1 text-center">
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "hsl(160,84%,39%)" }}>Oferta Imperdível</p>
              <p className={`text-base font-extrabold leading-tight ${editableClass}`} style={{ color: "hsl(0,0%,95%)" }} contentEditable={isEditing} suppressContentEditableWarning onBlur={(e) => isEditing && setEditTitle(e.currentTarget.textContent || "")}>{title}</p>
            </div>
            <div className="w-36 h-36 rounded-2xl overflow-hidden shadow-2xl ring-2 ring-primary/20">
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
            </div>
            <div className="space-y-3 text-center w-full">
              <p className={`text-[11px] px-2 ${editableClass}`} style={{ color: "hsl(0,0%,75%)" }} contentEditable={isEditing} suppressContentEditableWarning onBlur={(e) => isEditing && setEditDescription(e.currentTarget.textContent || "")}>{desc.substring(0, 70)}</p>
              <p className="text-2xl font-extrabold font-mono" style={{ color: "hsl(160,84%,39%)" }}>{product.price}</p>
              <div className={`w-full py-2.5 rounded-full text-center text-xs font-bold ${editableClass}`} style={{ background: "linear-gradient(135deg, hsl(263,70%,58%), hsl(263,70%,48%))", color: "white" }} contentEditable={isEditing} suppressContentEditableWarning onBlur={(e) => isEditing && setEditCta(e.currentTarget.textContent || "")}>
                ⬆️ {cta.replace(/[🛒🚀👇]/g, "").trim().substring(0, 22)}
              </div>
            </div>
          </div>
        );

      // WhatsApp Status: imagem inteira + título forte
      case "whatsapp-status":
        return (
          <div className="w-[240px] aspect-[9/16] rounded-2xl overflow-hidden relative shadow-2xl">
            <img src={product.imageUrl} alt={product.name} className="absolute inset-0 w-full h-full object-cover" crossOrigin="anonymous" />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(140,20%,8%,0.95)] via-[hsl(140,20%,8%,0.3)] to-[hsl(140,20%,8%,0.4)]" />
            {/* Top: brand / badge */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
              <span className="px-2 py-1 rounded-md text-[10px] font-bold backdrop-blur-sm" style={{ background: "hsl(160,84%,39%,0.2)", color: "hsl(160,84%,39%)", border: "1px solid hsl(160,84%,39%,0.3)" }}>
                OFERTA 🔥
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-extrabold font-mono backdrop-blur-sm" style={{ background: "hsl(160,84%,39%,0.9)", color: "hsl(240,10%,4%)" }}>
                {product.price}
              </span>
            </div>
            {/* Bottom: strong title + CTA */}
            <div className="absolute bottom-0 left-0 right-0 p-5 space-y-3">
              <p className={`text-lg font-extrabold leading-tight ${editableClass}`} style={{ color: "hsl(0,0%,100%)", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }} contentEditable={isEditing} suppressContentEditableWarning onBlur={(e) => isEditing && setEditTitle(e.currentTarget.textContent || "")}>{title}</p>
              <p className={`text-[11px] ${editableClass}`} style={{ color: "hsl(0,0%,80%)" }} contentEditable={isEditing} suppressContentEditableWarning onBlur={(e) => isEditing && setEditDescription(e.currentTarget.textContent || "")}>{desc.substring(0, 80)}</p>
              <div className={`w-full py-2.5 rounded-full text-center text-xs font-bold ${editableClass}`} style={{ background: "hsl(160,84%,39%)", color: "hsl(240,10%,4%)" }} contentEditable={isEditing} suppressContentEditableWarning onBlur={(e) => isEditing && setEditCta(e.currentTarget.textContent || "")}>
                {cta.replace(/[🛒🚀👇]/g, "").trim().substring(0, 25)}
              </div>
              <p className="text-[10px] text-center" style={{ color: "hsl(0,0%,60%)" }}>🔗 {product.link.substring(0, 35)}...</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-success/10 px-4 py-1.5 text-sm text-success font-medium border border-success/20">
          <Sparkles className="w-3.5 h-3.5" />
          Templates otimizados por plataforma
        </div>
        <h2 className="text-2xl font-display font-bold tracking-tight">Escolha a plataforma</h2>
        <p className="text-xs text-muted-foreground">Cada template é otimizado automaticamente para a plataforma</p>
      </div>

      {/* Platform tabs */}
      <div className="flex gap-2 justify-center flex-wrap">
        {platforms.map((p) => (
          <button
            key={p.id}
            onClick={() => setPlatform(p.id)}
            className={`flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.97] border ${
              platform === p.id
                ? "bg-primary/10 text-primary border-primary/30 ai-glow"
                : "bg-secondary/50 text-secondary-foreground border-transparent hover:bg-secondary hover:border-border"
            }`}
          >
            <span className="flex items-center gap-1.5">{p.icon} {p.label}</span>
            <span className="text-[10px] text-muted-foreground">{p.hint}</span>
          </button>
        ))}
      </div>

      {/* Template preview */}
      <div className="flex justify-center py-4">
        <div ref={templateRef} className="transition-all duration-300">{renderTemplate()}</div>
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
        <Button variant="outline" onClick={onBack} className="rounded-xl">
          ← Voltar
        </Button>
        <Button variant="outline" onClick={toggleEdit} className="rounded-xl">
          {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
          {isEditing ? "Salvar" : "Editar"}
        </Button>
        <Button variant="ai" onClick={copyAll} className="rounded-xl">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copiado!" : "Copiar tudo"}
        </Button>
        <Button variant="success" onClick={exportImage} disabled={isExporting} className="rounded-xl">
          <Download className="w-4 h-4" />
          {isExporting ? "Exportando..." : "Exportar"}
        </Button>
      </div>
    </div>
  );
};

export default TemplatePreview;
