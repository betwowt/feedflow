import { useState } from 'react';
import { useFeedStore } from '../store/feedStore';

export function FeedList() {
  const { feeds, selectedFeed, selectFeed, removeFeed, isLoading } = useFeedStore();
  const [removingUrl, setRemovingUrl] = useState<string | null>(null);

  const handleRemove = async (url: string) => {
    if (!confirm('确定要删除这个订阅源吗？')) return;

    setRemovingUrl(url);
    try {
      await removeFeed(url);
    } catch (error) {
      console.error('Failed to remove feed:', error);
    } finally {
      setRemovingUrl(null);
    }
  };

  return (
    <div className="feed-list">
      <h2>订阅源</h2>
      {feeds.length === 0 ? (
        <p className="empty">暂无订阅源</p>
      ) : (
        <ul>
          {feeds.map(feed => {
            const isRemoving = removingUrl === feed.url;
            return (
              <li key={feed.url} className={selectedFeed?.url === feed.url ? 'active' : ''}>
                <button
                  className="feed-item"
                  onClick={() => selectFeed(feed)}
                  title={feed.description}
                  disabled={isRemoving}
                >
                  <span className="feed-title">{feed.title}</span>
                </button>
                <button
                  className="remove-btn"
                  onClick={() => handleRemove(feed.url)}
                  title="删除订阅源"
                  disabled={isRemoving}
                >
                  {isRemoving ? '...' : '×'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {isLoading && <p className="loading">同步中...</p>}
    </div>
  );
}
