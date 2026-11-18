import { Navigate, Route, Routes } from 'react-router';
import Header from './components/header';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import FormsPage from './pages/Forms';
import SignPage from './pages/Sign';
import AuthorizationPage from './pages/Authorization';
import FormDetailsPage from './pages/FormDetails';
import PublicFormPage from './pages/PublicForm';

export default function App() {
  return (
    <Routes>
      <Route path="/f/:id" element={<PublicFormPage />} />
      <Route path="/*" element={<OwnerApp />} />
    </Routes>
  );
}

function OwnerApp() {
  return (
    <AuthProvider>
      <Header />

      <main className="container page-container">
        <Routes>
          <Route path="/" element={<Navigate to="/forms" replace />} />
          <Route
            path="/forms"
            element={
              <ProtectedRoute>
                <FormsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/createform" element={<Navigate to="/forms?create=1" replace />} />
          <Route path="/editform" element={<Navigate to="/forms?create=1" replace />} />
          <Route
            path="/forms/:id"
            element={
              <ProtectedRoute>
                <FormDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/sign" element={<SignPage />} />
          <Route path="/login" element={<AuthorizationPage />} />
          <Route path="*" element={<h1>Страница не найдена</h1>} />
        </Routes>
      </main>
    </AuthProvider>
  );
}
