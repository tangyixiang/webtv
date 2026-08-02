import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import PlayPage from './pages/PlayPage';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/play/:id" element={<PlayPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
