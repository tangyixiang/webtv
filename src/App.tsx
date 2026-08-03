import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import PlayPage from './pages/PlayPage';
import LoginPage from './pages/LoginPage';

function LayoutWithNavbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 flex flex-col">
      <Navbar />
      <div className="flex-1">{children}</div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* 1. 公开的登录路由 */}
        <Route path="/login" element={<LoginPage />} />

        {/* 2. 需要登录受保护的业务路由 */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <LayoutWithNavbar>
                <HomePage />
              </LayoutWithNavbar>
            </ProtectedRoute>
          }
        />
        <Route
          path="/play/:id"
          element={
            <ProtectedRoute>
              <LayoutWithNavbar>
                <PlayPage />
              </LayoutWithNavbar>
            </ProtectedRoute>
          }
        />

        {/* 3. 兜底匹配重定向至首页 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
