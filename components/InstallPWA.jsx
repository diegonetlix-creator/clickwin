import { useEffect, useState } from 'react';

export default function InstallPWA() {
  const [prompt, setPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!prompt) return;

    prompt.prompt();
    const result = await prompt.userChoice;
    console.log('PWA installation choice:', result);
    if (result.outcome === 'accepted') {
      setPrompt(null);
    }
  };

  if (!prompt) return null;

  return (
    <button
      onClick={install}
      className="fixed bottom-24 right-4 z-[999] px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold shadow-[0_10px_30px_rgba(124,58,237,0.5)] border border-white/20 animate-bounce active:scale-95 transition-all"
    >
      📲 Instalar App
    </button>
  );
}
