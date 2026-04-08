import { useState } from 'react';
import { useFeedStore } from '../store/feedStore';
import { fetchAndParseFeed } from '../lib/rssParser';

export function AddFeedModal() {
  const [url, setUrl] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const { addFeed, isLoading, setError: setStoreError } = useFeedStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // 验证 RSS 源
      const feed = await fetchAndParseFeed(url);

      // 添加到后端和本地
      await addFeed({ url, title: feed.title, description: feed.description });

      setUrl('');
      setIsOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : '无法加载此RSS源';
      setError(message);
      // 同时更新 store 的 error 以便显示
      setStoreError(message);
    }
  };

  if (!isOpen) {
    return (
      <button className="add-feed-btn" onClick={() => setIsOpen(true)}>
        + 添加订阅源
      </button>
    );
  }

  return (
    <div className="modal-overlay" onClick={() => !isLoading && setIsOpen(false)}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>添加RSS订阅源</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="输入RSS URL (例如: https://example.com/feed.xml)"
            required
            disabled={isLoading}
          />
          {error && <p className="error">{error}</p>}
          <div className="modal-actions">
            <button type="submit" disabled={isLoading}>
              {isLoading ? '添加中...' : '添加'}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
              className="cancel-btn"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
