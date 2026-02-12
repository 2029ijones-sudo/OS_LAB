import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export default function Explore() {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLabs();
  }, []);

  const fetchLabs = async () => {
    const { data } = await supabase
      .from('os_labs')
      .select(`
        id,
        name,
        slug,
        description,
        stars,
        forks,
        preview_enabled,
        created_at,
        profiles!user_id (
          username,
          avatar_url
        ),
        repositories (
          name,
          description
        )
      `)
      .eq('is_deployed', true)
      .eq('preview_enabled', true)
      .order('stars', { ascending: false });
    
    setLabs(data || []);
    setLoading(false);
  };

  const handleRun = (slug) => {
    window.open(`/api/exec?slug=${slug}`, '_blank');
  };

  const handleFork = async (labId) => {
    // API call to fork – uses /api/labs with method POST and fork action
    const res = await fetch('/api/labs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'fork', labId })
    });
    if (res.ok) {
      const { id } = await res.json();
      navigate(`/editor/${id}`);
    }
  };

  if (loading) return <div className="text-white p-8">Loading labs...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">OS_LAB</h1>
        <button 
          onClick={() => navigate('/editor/new')}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <span>+</span> New Electron App
        </button>
      </header>

      <main className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {labs.map(lab => (
            <div key={lab.id} className="bg-gray-800 rounded-lg border border-gray-700 p-5 hover:border-blue-500 transition">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{lab.name}</h2>
                  <p className="text-gray-400 text-sm mt-1">{lab.description || 'No description'}</p>
                </div>
                {lab.profiles?.avatar_url && (
                  <img src={lab.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                )}
              </div>
              
              <div className="flex items-center gap-4 mt-4 text-sm text-gray-400">
                <span>⭐ {lab.stars}</span>
                <span>⑂ {lab.forks}</span>
                <span>🕒 {formatDistanceToNow(new Date(lab.created_at))} ago</span>
              </div>

              <div className="flex gap-3 mt-5">
                <button 
                  onClick={() => handleRun(lab.slug)}
                  className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-md text-sm font-medium"
                >
                  ▶ Run
                </button>
                <button 
                  onClick={() => handleFork(lab.id)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-md text-sm font-medium"
                >
                  ⎇ Fork
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
