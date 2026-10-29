import { Navigate, Route, Routes } from 'react-router';
import Header from './components/header';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import HomePage from './pages/Home';
import SignPage from './pages/Sign';
import AuthorizationPage from './pages/Authorization';
import FormsPage from './pages/Forms';

export default function App() {
  return (
    <AuthProvider>
      <Header />

      <main className="container page-container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/forms" element={<ProtectedRoute><FormsPage /></ProtectedRoute>} />
          <Route path="/createform" element={<Navigate to="/forms?create=1" replace />} />
          <Route path="/editform" element={<Navigate to="/forms?create=1" replace />} />
          <Route path="/sign" element={<SignPage />} />
          <Route path="/login" element={<AuthorizationPage />} />
          <Route path="*" element={<h1>Страница не найдена</h1>} />
        </Routes>
      </main>
    </AuthProvider>
  );
}
