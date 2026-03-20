import { useState, useEffect } from "react";
import { getHistory, clearHistory, type HistoryItem } from "@/lib/history";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowLeft, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HistoryPage = () => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setItems(getHistory());
  }, []);

  const handleClear = () => {
    clearHistory();
    setItems([]);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container max-w-4xl flex items-center justify-between h-16 px-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold">Histórico</span>
          </div>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClear} className="text-destructive">
              <Trash2 className="w-4 h-4" /> Limpar
            </Button>
          )}
        </div>
      </header>

      <main className="container max-w-4xl px-4 py-8">
        {items.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <Clock className="w-12 h-12 mx-auto text-muted-foreground/30" />
            <p className="text-muted-foreground">Nenhum template exportado ainda.</p>
            <Button variant="outline" onClick={() => navigate("/")}>Criar primeiro template</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {items.map((item, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-border bg-card hover:border-primary/30 transition-colors">
                <img src={item.thumbnail} alt={item.product.name} className="w-full aspect-square object-cover" />
                <div className="p-3 space-y-1">
                  <p className="text-xs font-medium truncate">{item.product.name}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-success font-mono font-bold">{item.product.price}</span>
                    <span className="text-[10px] text-muted-foreground capitalize">{item.platform.replace("-", " ")}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{new Date(item.createdAt).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default HistoryPage;
