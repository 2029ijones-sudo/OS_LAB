import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Login from './Login';
import Explore from './Explore';
import Editor from './Editor';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="loading">OS_LAB starting...</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/explore" />} />
        <Route path="/explore" element={session ? <Explore /> : <Navigate to="/login" />} />
        <Route path="/editor/:labId?" element={session ? <Editor /> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to={session ? "/explore" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  );
}
