interface HistoryItem {
  product: {
    name: string;
    price: string;
    description: string;
    imageUrl: string;
    link: string;
  };
  content: {
    titles: string[];
    description: string;
    cta: string;
    hashtags: string[];
    caption: string;
  };
  platform: string;
  thumbnail: string;
  createdAt: string;
}

const HISTORY_KEY = "templateai-history";
const MAX_ITEMS = 50;

export function saveToHistory(item: HistoryItem): void {
  try {
    const existing = getHistory();
    existing.unshift(item);
    if (existing.length > MAX_ITEMS) existing.length = MAX_ITEMS;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(existing));
  } catch (e) {
    console.error("Failed to save to history:", e);
  }
}

export function getHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

export type { HistoryItem };
