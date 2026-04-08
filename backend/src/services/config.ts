/**
 * YAML 配置文件服务
 * 支持通过 YAML 文件管理订阅源和代理配置
 */
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

const CONFIG_FILE = path.join(process.cwd(), 'config', 'feeds.yaml');

export interface FeedConfig {
  url: string;
  title: string;
  description?: string;
  tags?: string[];
  // 单独配置的代理（可选）
  proxy?: {
    enabled?: boolean;
    type?: 'http' | 'https' | 'socks4' | 'socks5';
    host?: string;
    port?: number;
    username?: string;
    password?: string;
  };
}

export interface GlobalConfig {
  // 全局代理配置
  proxy?: {
    enabled?: boolean;
    type?: 'http' | 'https' | 'socks4' | 'socks5';
    host?: string;
    port?: number;
    username?: string;
    password?: string;
  };
  // 抓取间隔（秒）
  fetch_interval?: number;
  // 订阅源列表
  feeds?: FeedConfig[];
}

async function ensureConfigDir() {
  const dir = path.dirname(CONFIG_FILE);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * 加载 YAML 配置文件
 */
export async function loadConfig(): Promise<GlobalConfig> {
  try {
    await ensureConfigDir();
    const content = await fs.readFile(CONFIG_FILE, 'utf-8');
    const config = yaml.load(content) as GlobalConfig;
    return config || {};
  } catch (error) {
    // 文件不存在或解析失败，返回空配置
    return {};
  }
}

/**
 * 保存 YAML 配置文件
 */
export async function saveConfig(config: GlobalConfig): Promise<void> {
  await ensureConfigDir();
  const content = yaml.dump(config, {
    indent: 2,
    lineWidth: 100,
    noRefs: true
  });
  await fs.writeFile(CONFIG_FILE, content, 'utf-8');
}

/**
 * 从现有 JSON 数据迁移到 YAML
 */
export async function migrateFromJsonIfNeeded(): Promise<boolean> {
  const jsonFile = path.join(process.cwd(), 'data', 'feeds.json');
  const yamlFile = CONFIG_FILE;

  try {
    // 检查 YAML 是否已存在
    await fs.access(yamlFile);
    return false; // 已存在，不需要迁移
  } catch {
    // YAML 不存在，检查 JSON 是否存在
  }

  try {
    const jsonContent = await fs.readFile(jsonFile, 'utf-8');
    const data = JSON.parse(jsonContent);

    if (data.feeds && Array.isArray(data.feeds)) {
      // 转换为 YAML 格式
      const config: GlobalConfig = {
        feeds: data.feeds.map((f: any) => ({
          url: f.url,
          title: f.title,
          description: f.description,
          proxy: f.proxy
        }))
      };

      await saveConfig(config);
      console.log(`Migrated ${data.feeds.length} feeds from JSON to YAML`);
      return true;
    }
  } catch (error) {
    // JSON 不存在或无法读取，这是正常的（首次运行）
  }

  return false;
}

/**
 * 创建示例配置文件
 */
export async function createExampleConfig(): Promise<void> {
  const exampleConfig: GlobalConfig = {
    fetch_interval: 300, // 5分钟
    proxy: {
      enabled: false,
      // type: 'socks5',
      // host: '127.0.0.1',
      // port: 1080
    },
    feeds: [
      {
        url: 'https://sspai.com/feed',
        title: '少数派',
        description: '少数派致力于更好地运用数字产品或科学方法',
        tags: ['tech', 'productivity']
      },
      {
        url: 'https://www.phoronix.com/rss.php',
        title: 'Phoronix',
        description: 'Linux Hardware News',
        proxy: {
          enabled: false,
          // 单独为这个源配置代理（如果需要）
          // type: 'http',
          // host: '127.0.0.1',
          // port: 7890
        }
      }
    ]
  };

  await ensureConfigDir();
  const examplePath = path.join(path.dirname(CONFIG_FILE), 'feeds.example.yaml');
  const content = yaml.dump(exampleConfig, {
    indent: 2,
    lineWidth: 100
  });
  await fs.writeFile(examplePath, content, 'utf-8');
  console.log(`Created example config at: ${examplePath}`);
}
