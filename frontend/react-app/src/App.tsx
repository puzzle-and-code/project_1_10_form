import { Route, Routes } from 'react-router'
import Header from './components/header'

import HomePage from './pages/HomePage'
import EditformsPage from './pages/Editforms'
import SignPage from './pages/Sign'
import AuthorizationPage from './pages/Authorization'

export default function App() {
  return (
    <>
      <Header />

      <main className="container page-container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/editform" element={<EditformsPage />} />
          <Route path="/sign" element={<SignPage />} />
          <Route path="/login" element={<AuthorizationPage />} />
          <Route path="*" element={<h1>Страница не найдена</h1>} />
          
        </Routes>
      </main>
    </>
  )
}