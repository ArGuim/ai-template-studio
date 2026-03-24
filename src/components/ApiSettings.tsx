import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Save, Check, Eye, EyeOff, Info } from "lucide-react";

interface ApiConfig {
  amazonTag?: string;
  shopeeAppId?: string;
  mercadoLivreToken?: string;
}

const API_STORAGE_KEY = "templateai-api-config";

export const getApiConfig = (): ApiConfig => {
  try {
    return JSON.parse(localStorage.getItem(API_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

const ApiSettings = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [config, setConfig] = useState<ApiConfig>(getApiConfig);

  const save = () => {
    localStorage.setItem(API_STORAGE_KEY, JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleShow = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        title="Configurar APIs de lojas"
      >
        <Settings className="w-3.5 h-3.5" />
        APIs de Lojas
      </button>
    );
  }

  const fields = [
    { key: "amazonTag" as const, label: "Amazon Associate Tag", placeholder: "seu-tag-20", help: "Tag de afiliado da Amazon para links otimizados" },
    { key: "shopeeAppId" as const, label: "Shopee App ID", placeholder: "ID da aplicação Shopee", help: "ID do programa de afiliados da Shopee" },
    { key: "mercadoLivreToken" as const, label: "Mercado Livre Token", placeholder: "Token de acesso ML", help: "Token do programa de desenvolvedores do Mercado Livre" },
  ];

  return (
    <div className="max-w-lg mx-auto rounded-xl bg-card border border-border p-5 space-y-4 animate-fade-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-display font-semibold">APIs de Lojas</h3>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">
          Fechar
        </button>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted-foreground">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
        <span>Opcional: Configure suas APIs de afiliados para melhorar a extração de dados e gerar links otimizados automaticamente.</span>
      </div>

      <div className="space-y-3">
        {fields.map(({ key, label, placeholder, help }) => (
          <div key={key} className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{label}</label>
            <div className="relative">
              <Input
                type={showKeys[key] ? "text" : "password"}
                value={config[key] || ""}
                onChange={(e) => setConfig(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                className="pr-10 bg-secondary/50 text-sm"
              />
              <button
                onClick={() => toggleShow(key)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKeys[key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground/70">{help}</p>
          </div>
        ))}
      </div>

      <Button variant="success" size="sm" onClick={save} className="w-full">
        {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saved ? "Salvo!" : "Salvar configurações"}
      </Button>
    </div>
  );
};

export default ApiSettings;
