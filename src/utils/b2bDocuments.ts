import { supabase } from './supabase';

export const DOCUMENT_BUCKET = 'b2b-documents';
export async function downloadB2BDocument(doc: { storage_path?: string | null; file_url: string; title: string; file_type: string }) {
  if (!doc.storage_path) {
    // Historical external links remain supported; new files use private Storage.
    const url = new URL(doc.file_url);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Невалиден адрес на документа.');
    window.open(url.href, '_blank', 'noopener,noreferrer');
    return;
  }
  const { data, error } = await supabase.storage.from(DOCUMENT_BUCKET).download(doc.storage_path);
  if (error || !data) throw new Error('Документът не може да се изтегли. Проверете достъпа си и опитайте отново.');
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${doc.title.replace(/[^\p{L}\p{N} _-]/gu, '_')}.${doc.file_type.replace(/[^a-z0-9]/gi, '')}`;
  document.body.append(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
