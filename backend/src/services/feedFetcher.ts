/**
 * RSS Feed Fetcher Service
 * 支持直接获取、全局代理、单独源代理和备用 API
 */
import { ProxyConfig } from './storage.js';

// 创建代理 Agent
async function createProxyAgent(config: ProxyConfig) {
  const { HttpsProxyAgent } = await import('https-proxy-agent');
  const { SocksProxyAgent } = await import('socks-proxy-agent');

  const { type, host, port, username, password } = config;

  let proxyUrl: string;
  const auth = username && password ? `${username}:${password}@` : '';

  switch (type) {
    case 'http':
    case 'https':
      proxyUrl = `http://${auth}${host}:${port}`;
      return new HttpsProxyAgent(proxyUrl);
    case 'socks4':
      proxyUrl = `socks4://${auth}${host}:${port}`;
      return new SocksProxyAgent(proxyUrl);
    case 'socks5':
      proxyUrl = `socks5://${auth}${host}:${port}`;
      return new SocksProxyAgent(proxyUrl);
    default:
      throw new Error(`Unsupported proxy type: ${type}`);
  }
}

// 使用代理的 fetch
async function fetchWithProxy(url: string, proxyConfig: ProxyConfig, timeout = 10000): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const agent = await createProxyAgent(proxyConfig);

    const response = await fetch(url, {
      // @ts-ignore - agent is supported in node-fetch
      agent,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSS-Reader/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      },
      redirect: 'follow'
    } as RequestInit);

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const content = await response.text();

    // Validate content
    if (!content || content.trim().length === 0) {
      throw new Error('Received empty content');
    }

    const trimmed = content.trim().substring(0, 100);
    if (!trimmed.startsWith('<?xml') && !trimmed.startsWith('<rss') &&
        !trimmed.startsWith('<feed') && !trimmed.startsWith('<rdf:RDF')) {
      throw new Error('Response does not appear to be valid RSS/XML');
    }

    console.log(`Proxy fetch success: ${content.length} bytes from ${url}`);
    return content;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

// 直接获取
async function fetchDirect(url: string, timeout = 10000): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSS-Reader/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      },
      redirect: 'follow'
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const content = await response.text();

    if (!content || content.trim().length === 0) {
      throw new Error('Received empty content');
    }

    const trimmed = content.trim().substring(0, 100);
    if (!trimmed.startsWith('<?xml') && !trimmed.startsWith('<rss') &&
        !trimmed.startsWith('<feed') && !trimmed.startsWith('<rdf:RDF')) {
      throw new Error('Response does not appear to be valid RSS/XML');
    }

    console.log(`Direct fetch success: ${content.length} bytes from ${url}`);
    return content;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

// 备用：国内起零API
async function fetchWithAa1cn(url: string, timeout = 10000): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const apiUrl = `https://api.istero.com/resource/v1/rss/to/json?url=${encodeURIComponent(url)}`;

    const response = await fetch(apiUrl, {
      signal: controller.signal,
      redirect: 'follow'
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    if (result.code !== 200 || !result.data) {
      throw new Error(result.message || 'API returned error');
    }

    return jsonToRssXml(result.data);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

function jsonToRssXml(data: any): string {
  const escapeXml = (str: string): string => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(data.title || 'Unknown Feed')}</title>
    <link>${escapeXml(data.link || '')}</link>
    <description>${escapeXml(data.description || '')}</description>
`;

  for (const item of data.items || []) {
    rss += `    <item>
      <title>${escapeXml(item.title || 'Untitled')}</title>
      <link>${escapeXml(item.link || '')}</link>
      <guid>${escapeXml(item.link || '')}</guid>
`;
    if (item.pubDate) {
      rss += `      <pubDate>${escapeXml(item.pubDate)}</pubDate>\n`;
    }
    if (item.author) {
      rss += `      <dc:creator>${escapeXml(item.author)}</dc:creator>\n`;
    }
    if (item.description) {
      rss += `      <description>${escapeXml(item.description)}</description>\n`;
    }
    rss += `    </item>\n`;
  }

  rss += `  </channel>
</rss>`;

  return rss;
}

// 获取全局代理配置
function getGlobalProxyConfig(): ProxyConfig | null {
  const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || process.env.ALL_PROXY;

  if (!proxyUrl) {
    return null;
  }

  try {
    const url = new URL(proxyUrl);

    let type: ProxyConfig['type'] = 'http';
    if (url.protocol === 'https:') {
      type = 'https';
    } else if (url.protocol.startsWith('socks4')) {
      type = 'socks4';
    } else if (url.protocol.startsWith('socks')) {
      type = 'socks5';
    }

    return {
      enabled: true,
      type,
      host: url.hostname,
      port: parseInt(url.port) || (type === 'https' ? 443 : 1080),
      username: url.username || undefined,
      password: url.password || undefined
    };
  } catch {
    return null;
  }
}

/**
 * 获取 RSS 源
 * @param url RSS URL
 * @param feedProxy 可选的单独代理配置（会覆盖全局代理）
 */
export async function fetchFeed(url: string, feedProxy?: ProxyConfig): Promise<string> {
  // Validate URL
  try {
    new URL(url);
  } catch {
    throw new Error('Invalid URL');
  }

  const errors: string[] = [];

  // 确定使用的代理配置（单独配置优先于全局配置）
  const proxyConfig = feedProxy?.enabled ? feedProxy : getGlobalProxyConfig();

  // 1. 尝试使用代理（如果配置了）
  if (proxyConfig && proxyConfig.enabled) {
    try {
      const source = feedProxy?.enabled ? 'feed-specific' : 'global';
      console.log(`Fetching with ${source} proxy (${proxyConfig.type}://${proxyConfig.host}:${proxyConfig.port}): ${url}`);
      return await fetchWithProxy(url, proxyConfig, 15000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`Proxy fetch failed: ${msg}`);
      errors.push(`Proxy: ${msg}`);
    }
  }

  // 2. 尝试直接获取
  try {
    console.log(`Fetching directly: ${url}`);
    return await fetchDirect(url, 8000);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`Direct fetch failed: ${msg}`);
    errors.push(`Direct: ${msg}`);
  }

  // 3. 备用 API
  try {
    console.log(`Trying aa1.cn API for: ${url}`);
    return await fetchWithAa1cn(url, 10000);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`aa1.cn API failed: ${msg}`);
    errors.push(`aa1.cn: ${msg}`);
  }

  throw new Error(`Failed to fetch feed. Errors: ${errors.join('; ')}`);
}

/**
 * 获取当前全局代理配置状态
 */
export function getGlobalProxyStatus(): { enabled: boolean; config?: ProxyConfig } {
  const config = getGlobalProxyConfig();
  if (config && config.enabled) {
    return {
      enabled: true,
      config: {
        ...config,
        username: config.username ? '***' : undefined,
        password: undefined
      }
    };
  }
  return { enabled: false };
}
