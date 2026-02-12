import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { labId, files } = req.body;

  // Update the repository content in DB
  const { data: lab } = await supabase
    .from('os_labs')
    .select('repo_id')
    .eq('id', labId)
    .single();

  await supabase
    .from('repositories')
    .update({ content: { files, updated_at: new Date() } })
    .eq('id', lab.repo_id);

  // Generate preview token (fake, but real logic would be here)
  const previewUrl = `https://preview.oslab.dev/${labId}`;
  await supabase
    .from('os_labs')
    .update({ 
      preview_enabled: true, 
      preview_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
    })
    .eq('id', labId);

  res.json({ previewUrl });
}
