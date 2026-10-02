import { Route, Routes } from 'react-router'
import Header from './components/Header.jsx'

import HomePage from './pages/HomePage.jsx'
import EditformsPage from './pages/Editforms.jsx'
import SignPage from './pages/Sign.jsx'
import AuthorizationPage from './pages/Authorization.jsx'

import React, { useState, useEffect } from 'react'

export default function App() {

  const [data, setData] = useState({status:null})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/health');
        // http://localhost:5080/api/health
        
        if (!response.ok) {
          throw new Error('Ошибка подключения');
        }
        
        const objData = await response.json();
        setData(objData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [])

  if (loading) return <p>Loading data...</p>
  if (error) return <p>Error: {error}</p>

  return (
    <>
      <Header />

      <main className="container page-container">
        <p>
          Пришли данные с бэка. Статус: {data.status}
        </p>
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