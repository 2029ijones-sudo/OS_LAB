import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { method, body, query } = req;
  const { id, action } = query;

  if (method === 'GET') {
    if (id) {
      const { data, error } = await supabase
        .from('os_labs')
        .select('*, repositories(content)')
        .eq('id', id)
        .single();
      return error ? res.status(500).json(error) : res.json(data);
    }
    const { data } = await supabase
      .from('os_labs')
      .select('*')
      .eq('is_deployed', true);
    return res.json(data);
  }

  if (method === 'POST') {
    const { action, labId, ...labData } = body;
    
    if (action === 'fork') {
      // Get original lab + repo
      const { data: original } = await supabase
        .from('os_labs')
        .select('*, repositories(*)')
        .eq('id', labId)
        .single();
      
      // Create new repo
      const { data: newRepo } = await supabase
        .from('repositories')
        .insert({
          name: `${original.repositories.name}-fork`,
          description: original.repositories.description,
          user_id: req.headers['x-user-id'],
          content: original.repositories.content
        })
        .select()
        .single();

      // Create new lab
      const { data: newLab } = await supabase
        .from('os_labs')
        .insert({
          user_id: req.headers['x-user-id'],
          repo_id: newRepo.id,
          name: `${original.name} (fork)`,
          slug: `${original.slug}-fork-${Date.now()}`,
          package_json: original.package_json,
          is_deployed: true,
          forks: 0,
          stars: 0
        })
        .select()
        .single();
      
      return res.json(newLab);
    }

    // Create new lab from editor
    const { data, error } = await supabase
      .from('os_labs')
      .insert(labData)
      .select()
      .single();
    return error ? res.status(500).json(error) : res.json(data);
  }

  if (method === 'PUT') {
    const { data, error } = await supabase
      .from('os_labs')
      .update(body)
      .eq('id', id)
      .select()
      .single();
    return error ? res.status(500).json(error) : res.json(data);
  }

  if (method === 'DELETE') {
    const { error } = await supabase
      .from('os_labs')
      .delete()
      .eq('id', id);
    return error ? res.status(500).json(error) : res.status(204).end();
  }

  res.status(405).json({ error: 'Method not allowed' });
}
