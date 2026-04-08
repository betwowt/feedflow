import { useState, useEffect } from 'react';
import { useFeedStore } from '../store/feedStore';
import { fetchAndParseFeed } from '../lib/rssParser';

const PAGE_SIZE = 20; // 每次加载20条

export function ArticleList() {
  const { selectedFeed, articles, setArticles, isLoading, error, setLoading, setError } = useFeedStore();
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);

  // 重置显示数量当切换订阅源时
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [selectedFeed?.url]);

  useEffect(() => {
    if (selectedFeed) {
      setLoading(true);
      setError(null);
      fetchAndParseFeed(selectedFeed.url)
        .then(data => {
          setArticles(data.items);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [selectedFeed]);

  // 加载更多
  const loadMore = () => {
    if (loadingMore || displayCount >= articles.length) return;
    setLoadingMore(true);

    setTimeout(() => {
      setDisplayCount(prev => Math.min(prev + PAGE_SIZE, articles.length));
      setLoadingMore(false);
    }, 300);
  };

  const handleArticleClick = (article: { link: string }) => {
    window.open(article.link, '_blank');
  };

  if (!selectedFeed) {
    return (
      <div className="article-list">
        <div className="empty">请选择一个订阅源</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="article-list">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="article-list">
        <div className="error">{error}</div>
      </div>
    );
  }

  const displayedArticles = articles.slice(0, displayCount);
  const hasMore = displayCount < articles.length;

  return (
    <div className="article-list">
      <div className="article-header">
        <h2>{selectedFeed.title}</h2>
        {articles.length > 0 && (
          <span className="article-count">
            {displayCount} / {articles.length}
          </span>
        )}
      </div>

      {articles.length === 0 ? (
        <p className="empty">暂无文章</p>
      ) : (
        <>
          <ul className="article-items">
            {displayedArticles.map((article, index) => (
              <li key={index} className="article-item">
                <h3 className="article-title" onClick={() => handleArticleClick(article)}>
                  {article.title}
                </h3>
                <div className="article-meta">
                  {article.pubDate && (
                    <span className="article-date">
                      {new Date(article.pubDate).toLocaleDateString('zh-CN')}
                    </span>
                  )}
                  {article.creator && (
                    <span className="article-author">by {article.creator}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* 加载更多按钮 */}
          {hasMore && (
            <div className="load-more-trigger">
              <button
                className="load-more-btn"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? '加载中...' : '加载更多'}
              </button>
            </div>
          )}

          {/* 已显示全部 */}
          {!hasMore && articles.length > 0 && (
            <div className="all-loaded">
              — 已显示全部 {articles.length} 篇文章 —
            </div>
          )}
        </>
      )}
    </div>
  );
}
