/**
 * 持久化存储服务 - 使用 YAML 配置文件管理订阅源
 */
import { loadConfig, saveConfig, migrateFromJsonIfNeeded } from './config.js';

export interface ProxyConfig {
  enabled: boolean;
  type: 'http' | 'https' | 'socks4' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export interface StoredFeed {
  url: string;
  title: string;
  description?: string;
  addedAt: string;
  // 单独配置的代理（可选）
  proxy?: ProxyConfig;
}

// 初始化时迁移 JSON 到 YAML
let migrated = false;
async function ensureMigrated() {
  if (!migrated) {
    await migrateFromJsonIfNeeded();
    migrated = true;
  }
}

/**
 * 加载所有订阅源
 */
export async function loadFeeds(): Promise<StoredFeed[]> {
  await ensureMigrated();
  try {
    const config = await loadConfig();
    const feeds: StoredFeed[] = [];

    for (const feed of (config.feeds || [])) {
      if (feed.proxy?.enabled) {
        feeds.push({
          url: feed.url,
          title: feed.title,
          description: feed.description,
          addedAt: new Date().toISOString(), // YAML 配置没有 addedAt
          proxy: {
            enabled: true,
            type: feed.proxy.type || 'http',
            host: feed.proxy.host || '',
            port: feed.proxy.port || 0,
            username: feed.proxy.username,
            password: feed.proxy.password
          }
        });
      } else {
        feeds.push({
          url: feed.url,
          title: feed.title,
          description: feed.description,
          addedAt: new Date().toISOString()
        });
      }
    }

    return feeds;
  } catch (error) {
    console.error('Error loading feeds from YAML:', error);
    return [];
  }
}

/**
 * 保存所有订阅源
 */
export async function saveFeeds(feeds: StoredFeed[]): Promise<void> {
  await ensureMigrated();
  try {
    const config = await loadConfig();

    // 转换为 YAML 格式
    config.feeds = feeds.map(f => ({
      url: f.url,
      title: f.title,
      description: f.description,
      proxy: f.proxy ? {
        enabled: f.proxy.enabled,
        type: f.proxy.type,
        host: f.proxy.host,
        port: f.proxy.port,
        username: f.proxy.username,
        password: f.proxy.password
      } : undefined
    }));

    await saveConfig(config);
  } catch (error) {
    console.error('Error saving feeds to YAML:', error);
    throw error;
  }
}

/**
 * 添加订阅源
 */
export async function addFeed(feed: Omit<StoredFeed, 'addedAt'>): Promise<StoredFeed> {
  const feeds = await loadFeeds();

  // 检查是否已存在
  if (feeds.some(f => f.url === feed.url)) {
    throw new Error('Feed already exists');
  }

  const newFeed: StoredFeed = {
    ...feed,
    addedAt: new Date().toISOString()
  };

  feeds.push(newFeed);
  await saveFeeds(feeds);
  return newFeed;
}

/**
 * 更新订阅源
 */
export async function updateFeed(url: string, updates: Partial<Omit<StoredFeed, 'url' | 'addedAt'>>): Promise<StoredFeed | null> {
  const feeds = await loadFeeds();
  const index = feeds.findIndex(f => f.url === url);

  if (index === -1) {
    return null;
  }

  feeds[index] = { ...feeds[index], ...updates };
  await saveFeeds(feeds);
  return feeds[index];
}

/**
 * 删除订阅源
 */
export async function removeFeed(url: string): Promise<boolean> {
  const feeds = await loadFeeds();
  const filtered = feeds.filter(f => f.url !== url);

  if (filtered.length === feeds.length) {
    return false; // 没有找到
  }

  await saveFeeds(filtered);
  return true;
}

/**
 * 获取单个订阅源
 */
export async function getFeed(url: string): Promise<StoredFeed | null> {
  const feeds = await loadFeeds();
  return feeds.find(f => f.url === url) || null;
}
