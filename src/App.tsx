import { Link, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { AppProvider } from './context/AppContext';
import HomePage from './pages/HomePage';
import FoodPage from './pages/FoodPage';
import CosmeticsPage from './pages/CosmeticsPage';
import ReportPage from './pages/ReportPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import MethodologyPage from './pages/MethodologyPage';
import SourcesPage from './pages/SourcesPage';
import AboutPage from './pages/AboutPage';
import ChangelogPage from './pages/ChangelogPage';

function NotFoundPage() {
  return (
    <div className="page">
      <div className="not-found">
        <span className="mono-label">404 / NOT FOUND</span>
        <h1>هذه الصفحة خارج الخريطة</h1>
        <p>الرابط الذي فتحته غير موجود. يمكنك العودة إلى الرئيسية أو بدء تحليل جديد.</p>
        <div className="not-found-actions">
          <Link to="/" className="button button-primary">
            الرئيسية
          </Link>
          <Link to="/food" className="button button-ghost">
            تحليل غذائي
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="food" element={<FoodPage />} />
          <Route path="cosmetics" element={<CosmeticsPage />} />
          <Route path="report" element={<ReportPage />} />
          <Route path="knowledge" element={<KnowledgeBasePage />} />
          <Route path="methodology" element={<MethodologyPage />} />
          <Route path="sources" element={<SourcesPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="changelog" element={<ChangelogPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AppProvider>
  );
}
