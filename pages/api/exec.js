import { WebContainer } from '@webcontainer/api';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { slug } = req.query;

  // Fetch lab files from DB
  const { data: lab } = await supabase
    .from('os_labs')
    .select('*, repositories(content)')
    .eq('slug', slug)
    .single();

  if (!lab) return res.status(404).json({ error: 'Lab not found' });

  // Boot WebContainer (this runs on serverless? Actually WebContainer needs browser.)
  // ⚠️ WebContainer API is browser-only. This API route cannot boot WebContainer.
  // Instead, this endpoint should return the lab's metadata, and the client will boot WebContainer.
  // That's the correct pattern. So this API becomes a metadata endpoint.

  res.json({
    id: lab.id,
    name: lab.name,
    files: lab.repositories.content.files,
    packageJson: lab.package_json
  });
}
