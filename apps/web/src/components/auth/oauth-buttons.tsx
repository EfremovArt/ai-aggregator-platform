'use client';

import { Button } from '@/components/ui/button';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function OauthButtons() {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <Button variant="outline" asChild>
        <a href={`${API}/api/auth/google`}>
          <GoogleIcon className="mr-2 h-4 w-4" /> Google
        </a>
      </Button>
      <Button variant="outline" asChild>
        <a href={`${API}/api/auth/github`}>
          <GitHubIcon className="mr-2 h-4 w-4" /> GitHub
        </a>
      </Button>
      <Button variant="outline" asChild>
        <a href={`${API}/api/auth/telegram`}>
          <TelegramIcon className="mr-2 h-4 w-4" /> Telegram
        </a>
      </Button>
    </div>
  );
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path fill="#FFC107" d="M21.8 10.2H12v3.7h5.6c-.5 2.4-2.6 4.1-5.6 4.1-3.4 0-6.1-2.7-6.1-6s2.7-6 6.1-6c1.5 0 2.9.6 4 1.5l2.6-2.6C16.7 3.5 14.5 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5 9.5-4.1 9.5-9.5c0-.6-.1-1.2-.2-1.8z"/>
    </svg>
  );
}
function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 1.7 2.7 1.2 3.4.9.1-.7.4-1.2.7-1.5-2.5-.3-5.2-1.3-5.2-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2 1-.3 2-.4 3-.4s2 .1 3 .4c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.1 0 4.4-2.7 5.4-5.2 5.7.4.4.8 1 .8 2.1v3.1c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z"/>
    </svg>
  );
}
function TelegramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M9.7 14.7l-.4 4.1c.6 0 .9-.3 1.2-.6l2.9-2.7 6 4.4c1.1.6 1.9.3 2.2-1L24.1 4.5c.4-1.6-.6-2.3-1.7-1.9L1.5 11.1c-1.6.6-1.6 1.5-.3 1.9l5.3 1.7L18.7 6c.6-.4 1.1-.2.6.3z"/>
    </svg>
  );
}
