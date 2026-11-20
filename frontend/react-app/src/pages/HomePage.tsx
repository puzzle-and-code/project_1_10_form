import { Link } from 'react-router';

export default function HomePage() {
  return (
    <div>
      <h1>Главная страница</h1>
      <ul style={{ marginTop: '1rem', listStyle: 'disc', paddingLeft: '1.5rem' }}>
        <li>
          <Link to="/forms/1">Обратная связь по курсу</Link>
        </li>
        <li>
          <Link to="/forms/2">Опрос команды</Link>
        </li>
        <li>
          <Link to="/forms/3">Новая анкета</Link>
        </li>
      </ul>
    </div>
  );
}
