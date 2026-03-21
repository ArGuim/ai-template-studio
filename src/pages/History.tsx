import { useState, useEffect } from "react";
import { getHistory, clearHistory, type HistoryItem } from "@/lib/history";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowLeft, Clock, Download, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HistoryPage = () => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    setItems(getHistory());
  }, []);

  const handleClear = () => {
    if (window.confirm("Tem certeza que deseja limpar todo o histórico?")) {
      clearHistory();
      setItems([]);
    }
  };

  const filtered = items.filter(
    (item) =>
      item.product.name.toLowerCase().includes(search.toLowerCase()) ||
      item.platform.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Agora mesmo";
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString("pt-BR");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 glass sticky top-0 z-50">
        <div className="container max-w-4xl flex items-center justify-between h-16 px-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="font-display font-semibold">Histórico</span>
            {items.length > 0 && (
              <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">{items.length}</span>
            )}
          </div>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClear} className="text-destructive gap-1.5">
              <Trash2 className="w-4 h-4" /> Limpar
            </Button>
          )}
        </div>
      </header>

      <main className="container max-w-4xl px-4 py-8 space-y-6">
        {items.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-secondary/50 flex items-center justify-center">
              <Clock className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <div className="space-y-1">
              <p className="font-display font-semibold text-foreground">Nenhum template ainda</p>
              <p className="text-sm text-muted-foreground">Seus templates exportados aparecerão aqui.</p>
            </div>
            <Button variant="outline" onClick={() => navigate("/")} className="rounded-xl">
              Criar primeiro template
            </Button>
          </div>
        ) : (
          <>
            {/* Search */}
            {items.length > 3 && (
              <div className="relative max-w-sm mx-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por produto ou plataforma..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filtered.map((item, i) => (
                <div
                  key={i}
                  className="rounded-xl overflow-hidden border border-border bg-card hover:border-primary/30 transition-all duration-200 group hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className="relative">
                    <img src={item.thumbnail} alt={item.product.name} className="w-full aspect-square object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                      <span className="text-xs font-medium text-foreground flex items-center gap-1">
                        <Download className="w-3 h-3" /> Exportado
                      </span>
                    </div>
                  </div>
                  <div className="p-3 space-y-1.5">
                    <p className="text-xs font-medium truncate">{item.product.name}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-success font-mono font-bold">{item.product.price}</span>
                      <span className="text-[10px] text-muted-foreground capitalize px-1.5 py-0.5 rounded bg-secondary">{item.platform.replace("-", " ")}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{formatDate(item.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>

            {filtered.length === 0 && search && (
              <p className="text-center text-sm text-muted-foreground py-8">Nenhum resultado para "{search}"</p>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default HistoryPage;
