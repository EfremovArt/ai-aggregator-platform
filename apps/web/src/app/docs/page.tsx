import { Header } from '@/components/site/header';
import { Footer } from '@/components/site/footer';

export const metadata = { title: 'Документация' };

export default function DocsPage() {
  return (
    <>
      <Header />
      <main className="container max-w-4xl py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Документация</h1>
        <p className="mt-3 text-muted-foreground">
          Краткий обзор API. Подробная документация — в репозитории.
        </p>
        <h2 className="mt-10 text-2xl font-semibold">Аутентификация</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Используйте API-ключ из панели управления:
        </p>
        <pre className="mt-3 rounded-md bg-black/40 p-4 text-xs">
          <code>{`Authorization: Bearer aix_live_...`}</code>
        </pre>
        <h2 className="mt-10 text-2xl font-semibold">Endpoints</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li><code>POST /api/v1/chat/completions</code> — chat (streaming опционально)</li>
          <li><code>GET /api/models</code> — список моделей</li>
          <li><code>GET /api/billing/balance</code> — текущий баланс</li>
        </ul>
        <h2 className="mt-10 text-2xl font-semibold">Совместимость</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          API совместим с OpenAI SDK — установите base URL и используйте свой ключ:
        </p>
        <pre className="mt-3 rounded-md bg-black/40 p-4 text-xs">
          <code>{`baseURL: "https://api.example.com/api/v1"
apiKey: "aix_live_..."`}</code>
        </pre>
      </main>
      <Footer />
    </>
  );
}
