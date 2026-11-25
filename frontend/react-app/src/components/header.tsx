import { Link } from 'react-router';
import { Button } from '@heroui/react';
import { useAuth } from '../context';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) return null;

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="logo">
          Конструктор форм
        </Link>

        <nav className="navigation flex items-center gap-4">
          <Link to="/forms">Мои формы</Link>
          <Link to="/forms?create=1">Создать форму</Link>

          <div className="flex items-center gap-3 ml-2">
            <span className="text-sm font-medium text-default-600">
              {user?.email}
            </span>
            <Button size="sm" variant="danger-soft" onPress={() => logout()}>
              Выйти
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
