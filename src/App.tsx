import { useEffect } from 'react';
import { FeedList } from './components/FeedList';
import { ArticleList } from './components/ArticleList';
import { AddFeedModal } from './components/AddFeedModal';
import { initializeFeedStore } from './store/feedStore';

function App() {
  // 初始化：从后端加载订阅源和代理状态
  useEffect(() => {
    initializeFeedStore();
  }, []);

  return (
    <div className="app">
      <header>
        <h1>RSS阅读器</h1>
        <AddFeedModal />
      </header>
      <main className="two-panel-layout">
        <aside className="sidebar-feeds">
          <FeedList />
        </aside>
        <section className="article-list-panel">
          <ArticleList />
        </section>
      </main>
    </div>
  );
}

export default App;
