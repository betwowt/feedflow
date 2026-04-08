import { Router } from 'express';
import { fetchFeed, getGlobalProxyStatus } from '../services/feedFetcher.js';
import { loadFeeds, addFeed as saveFeed, updateFeed, removeFeed as deleteFeed, getFeed } from '../services/storage.js';

export const feedRouter = Router();

// 获取 RSS 内容（可选：使用订阅源的代理配置）
feedRouter.get('/fetch', async (_req, res) => {
  const { url } = _req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    // 获取该源的代理配置（如果存在）
    const feed = await getFeed(url);
    const content = await fetchFeed(url, feed?.proxy);

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.send(content);
  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).json({
      error: 'Failed to fetch RSS feed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 获取所有订阅源
feedRouter.get('/list', async (_req, res) => {
  try {
    const feeds = await loadFeeds();
    // 隐藏代理密码
    const sanitizedFeeds = feeds.map(f => ({
      ...f,
      proxy: f.proxy ? {
        ...f.proxy,
        password: undefined
      } : undefined
    }));
    res.json({ feeds: sanitizedFeeds });
  } catch (error) {
    console.error('Error loading feeds:', error);
    res.status(500).json({ error: 'Failed to load feeds' });
  }
});

// 添加订阅源
feedRouter.post('/add', async (_req, res) => {
  const { url, title, description, proxy } = _req.body;

  if (!url || !title) {
    return res.status(400).json({ error: 'URL and title are required' });
  }

  try {
    // 先验证能否获取（使用提供的代理配置）
    await fetchFeed(url, proxy);

    const feed = await saveFeed({ url, title, description, proxy });
    res.status(201).json(feed);
  } catch (error) {
    console.error('Error adding feed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: 'Failed to add feed', message });
  }
});

// 更新订阅源（包括代理配置）
feedRouter.put('/update', async (_req, res) => {
  const { url, title, description, proxy } = _req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const updates: { title?: string; description?: string; proxy?: any } = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (proxy !== undefined) updates.proxy = proxy;

    const feed = await updateFeed(url, updates);
    if (!feed) {
      return res.status(404).json({ error: 'Feed not found' });
    }

    res.json(feed);
  } catch (error) {
    console.error('Error updating feed:', error);
    res.status(500).json({ error: 'Failed to update feed' });
  }
});

// 删除订阅源
feedRouter.delete('/remove', async (_req, res) => {
  const { url } = _req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const removed = await deleteFeed(url);
    if (!removed) {
      return res.status(404).json({ error: 'Feed not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing feed:', error);
    res.status(500).json({ error: 'Failed to remove feed' });
  }
});

// 获取全局代理状态
feedRouter.get('/proxy-status', (_req, res) => {
  const status = getGlobalProxyStatus();
  res.json(status);
});
