const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchAndParseFeed(feedUrl: string): Promise<{
  title: string;
  description?: string;
  link?: string;
  items: Array<{
    title: string;
    link: string;
    pubDate?: string;
    content?: string;
    creator?: string;
  }>;
}> {
  try {
    // 通过后端代理获取RSS内容
    const proxyUrl = `${API_BASE}/api/feed/fetch?url=${encodeURIComponent(feedUrl)}`;
    const response = await fetch(proxyUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xmlContent = await response.text();

    // 使用浏览器原生的 DOMParser 解析 XML
    return parseRSSXML(xmlContent);
  } catch (error) {
    throw new Error(`Failed to parse feed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function parseRSSXML(xmlContent: string): {
  title: string;
  description?: string;
  link?: string;
  items: Array<{
    title: string;
    link: string;
    pubDate?: string;
    content?: string;
    creator?: string;
  }>;
} {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

  // Check for parsing errors
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid XML format');
  }

  const rss = xmlDoc.querySelector('rss');
  if (!rss) {
    throw new Error('Not a valid RSS feed');
  }

  const channel = rss.querySelector('channel');
  if (!channel) {
    throw new Error('No channel found in RSS feed');
  }

  const title = channel.querySelector('title')?.textContent || 'Unknown Feed';
  const description = channel.querySelector('description')?.textContent || '';
  const link = channel.querySelector('link')?.textContent || '';

  const items: Array<{
    title: string;
    link: string;
    pubDate?: string;
    content?: string;
    creator?: string;
  }> = [];

  const itemElements = channel.querySelectorAll('item');
  for (const item of itemElements) {
    const itemTitle = item.querySelector('title')?.textContent || 'Untitled';
    const itemLink = item.querySelector('link')?.textContent || '';
    const itemPubDate = item.querySelector('pubDate')?.textContent || '';
    const itemDescription = item.querySelector('description')?.textContent || '';
    const itemCreator = item.querySelector('creator')?.textContent ||
                        item.querySelector('dc\\:creator')?.textContent || // Handle namespaced element
                        item.querySelector('author')?.textContent || '';

    items.push({
      title: itemTitle,
      link: itemLink,
      pubDate: itemPubDate || undefined,
      content: itemDescription || undefined,
      creator: itemCreator || undefined
    });
  }

  return {
    title,
    description: description || undefined,
    link: link || undefined,
    items
  };
}

// ============ 后端 API 同步 ============

export interface StoredFeed {
  url: string;
  title: string;
  description?: string;
  addedAt: string;
}

export interface ProxyStatus {
  enabled: boolean;
  config?: {
    enabled: boolean;
    type: 'http' | 'https' | 'socks4' | 'socks5';
    host: string;
    port: number;
    username?: string;
  };
}

/**
 * 从后端加载所有订阅源
 */
export async function loadFeedsFromBackend(): Promise<StoredFeed[]> {
  try {
    const response = await fetch(`${API_BASE}/api/feed/list`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.feeds || [];
  } catch (error) {
    console.error('Failed to load feeds from backend:', error);
    return [];
  }
}

/**
 * 添加订阅源到后端
 */
export async function addFeedToBackend(feed: { url: string; title: string; description?: string }): Promise<StoredFeed> {
  const response = await fetch(`${API_BASE}/api/feed/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(feed)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to add feed');
  }

  return response.json();
}

/**
 * 从后端删除订阅源
 */
export async function removeFeedFromBackend(url: string): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/feed/remove`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });

  if (!response.ok) {
    throw new Error('Failed to remove feed');
  }

  return true;
}

/**
 * 获取代理状态
 */
export async function getProxyStatus(): Promise<ProxyStatus> {
  try {
    const response = await fetch(`${API_BASE}/api/feed/proxy-status`);
    if (!response.ok) {
      return { enabled: false };
    }
    return response.json();
  } catch {
    return { enabled: false };
  }
}
