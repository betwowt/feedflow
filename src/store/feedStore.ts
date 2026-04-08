import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  loadFeedsFromBackend,
  addFeedToBackend,
  removeFeedFromBackend,
  getProxyStatus
} from '../lib/rssParser';

export interface Feed {
  url: string;
  title: string;
  description?: string;
}

export interface Article {
  title: string;
  link: string;
  pubDate?: string;
  content?: string;
  creator?: string;
}

interface FeedStore {
  feeds: Feed[];
  articles: Article[];
  selectedFeed: Feed | null;
  isLoading: boolean;
  error: string | null;
  proxyEnabled: boolean;
  // Actions
  addFeed: (feed: Feed) => Promise<void>;
  removeFeed: (url: string) => Promise<void>;
  setArticles: (articles: Article[]) => void;
  selectFeed: (feed: Feed) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadFromBackend: () => Promise<void>;
  checkProxyStatus: () => Promise<void>;
}

export const useFeedStore = create<FeedStore>()(
  persist(
    (set) => ({
      feeds: [],
      articles: [],
      selectedFeed: null,
      isLoading: false,
      error: null,
      proxyEnabled: false,

      addFeed: async (feed) => {
        set({ isLoading: true, error: null });
        try {
          // 先添加到后端
          await addFeedToBackend(feed);
          // 再更新本地状态
          set((state) => {
            const exists = state.feeds.some(f => f.url === feed.url);
            if (exists) return state;
            return { feeds: [...state.feeds, feed] };
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : '添加订阅源失败';
          set({ error: message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      removeFeed: async (url) => {
        set({ isLoading: true, error: null });
        try {
          // 从后端删除
          await removeFeedFromBackend(url);
          // 更新本地状态
          set((state) => ({
            feeds: state.feeds.filter(f => f.url !== url),
            selectedFeed: state.selectedFeed?.url === url ? null : state.selectedFeed,
            articles: state.selectedFeed?.url === url ? [] : state.articles
          }));
        } catch (error) {
          const message = error instanceof Error ? error.message : '删除订阅源失败';
          set({ error: message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      setArticles: (articles) => set({ articles }),
      selectFeed: (feed) => set({ selectedFeed: feed, articles: [], error: null }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      // 从后端加载订阅源
      loadFromBackend: async () => {
        try {
          const backendFeeds = await loadFeedsFromBackend();
          const feeds: Feed[] = backendFeeds.map(f => ({
            url: f.url,
            title: f.title,
            description: f.description
          }));
          set({ feeds });
        } catch (error) {
          console.error('Failed to load feeds from backend:', error);
        }
      },

      // 检查代理状态
      checkProxyStatus: async () => {
        try {
          const status = await getProxyStatus();
          set({ proxyEnabled: status.enabled });
        } catch {
          set({ proxyEnabled: false });
        }
      }
    }),
    {
      name: 'rss-reader-storage',
      // 在应用启动时自动从后端加载数据
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.loadFromBackend();
          state.checkProxyStatus();
        }
      }
    }
  )
);

// 导出初始化函数
export function initializeFeedStore() {
  const store = useFeedStore.getState();
  store.loadFromBackend();
  store.checkProxyStatus();
}
