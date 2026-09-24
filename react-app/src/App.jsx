import { Route, Routes } from 'react-router'
import Header from './components/Header.jsx'

import HomePage from './pages/HomePage.jsx'
import EditformsPage from './pages/Editforms.jsx'
import SignPage from './pages/Sign.jsx'
import AuthorizationPage from './pages/Authorization.jsx'

export default function App() {
  return (
    <>
      <Header />

      <main className="container page-container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/editform" element={<EditformsPage />} />
          <Route path="/sign" element={<SignPage />} />
          <Route
            path="/authorization"
            element={<AuthorizationPage />}
          />
          <Route
            path="*"
            element={<h1>Страница не найдена</h1>}
          />
        </Routes>
      </main>
    </>
  )
}