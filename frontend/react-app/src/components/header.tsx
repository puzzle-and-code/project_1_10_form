import { Link } from 'react-router'

export default function Header() {
  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="logo">
          Конструктор форм
        </Link>

        <nav className="navigation">
          <Link to="/">Главная</Link>
          <Link to="/editform">Создать форму</Link>
          <Link to="/sign">Регистрация</Link>
          <Link to="/authorization">Вход</Link>
        </nav>
      </div>
    </header>
  )
}