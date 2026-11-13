import { Link } from 'react-router';

export default function HomePage() {
  return (
    <div>
      <h1>Главная страница</h1>
      <ul style={{ marginTop: '1rem', listStyle: 'disc', paddingLeft: '1.5rem' }}>
        <li>
          <Link to="/forms/1">Форма 1 (демотест1)</Link>
        </li>
        <li>
          <Link to="/forms/2">Форма 2 (демотест2)</Link>
        </li>
        <li>
          <Link to="/forms/3">Форма 3 (черновик без вопросов — кнопка неактивна)</Link>
        </li>
        <li>
          <Link to="/forms/not-found">Форма 404 (тест)</Link>
        </li>
      </ul>
    </div>
  );
}