const { supabaseAdmin } = require("../config/supabase");

function extractPath(url, bucket) {
  if (!url) return null;
  const marker = `${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

async function getSignedUrl(bucket, publicUrl, expiresInSeconds = 900) {
  const path = extractPath(publicUrl, bucket);
  if (!path) return null;
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

module.exports = { getSignedUrl, extractPath };
