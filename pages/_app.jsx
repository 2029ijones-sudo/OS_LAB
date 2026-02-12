import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../lib/supabase';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Public routes
  const publicRoutes = ['/login', '/'];
  const isPublic = publicRoutes.includes(router.pathname);

  if (loading) {
    return (
      <div className="min-h-screen bg-os-dark flex items-center justify-center">
        <div className="text-white text-xl animate-pulse-slow">OS_LAB starting...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated and not on public route
  if (!session && !isPublic) {
    router.push('/login');
    return null;
  }

  // Redirect to explore if authenticated and on login or root
  if (session && (router.pathname === '/login' || router.pathname === '/')) {
    router.push('/explore');
    return null;
  }

  return (
    <>
      <Head>
        <title>OS_LAB – Electron in Browser</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <Component {...pageProps} session={session} />
    </>
  );
}
