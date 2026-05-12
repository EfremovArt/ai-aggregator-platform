import { Header } from '@/components/site/header';
import { Footer } from '@/components/site/footer';

export const metadata = {
  title: 'Cookie Policy',
  description: 'Какие cookies мы используем и для чего.',
};

export default function CookiesPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16 prose prose-invert">
        <h1>Cookie Policy</h1>
        <p>Мы используем cookies трёх типов:</p>
        <h2>Необходимые</h2>
        <p>
          Сессионная аутентификация (HttpOnly Secure cookie с access/refresh JWT-токенами), CSRF-token,
          предпочтения интерфейса. Без них сервис не работает — отключение не предусмотрено.
        </p>
        <h2>Аналитические</h2>
        <p>
          Анонимная аналитика загрузки страниц и UX (без cross-site tracking). Отключаются при
          выборе «Только необходимые» в баннере.
        </p>
        <h2>Маркетинговые</h2>
        <p>Не используются.</p>
        <p>
          Срок жизни сессионных cookie — 30 дней. Refresh-токен ротируется при каждом обновлении
          access-токена с детектом повторного использования украденного refresh-токена.
        </p>
      </main>
      <Footer />
    </>
  );
}
