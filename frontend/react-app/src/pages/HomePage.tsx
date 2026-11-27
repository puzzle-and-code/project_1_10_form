import { Link } from 'react-router';

export default function HomePage() {
  return (
    <div>
      <h1>Главная страница</h1>
      <Link to="/forms">Мои формы</Link>
    </div>
  );
}
