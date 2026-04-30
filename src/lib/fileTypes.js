// File-type hints shown to users in file URL inputs.
// The init upload accepts a wider set (analyzed via document understanding);
// per-turn chat attachments are limited to images + PDF until we add a
// unified attachment-to-PDF conversion path.

export const INIT_FILE_EXTENSIONS = [
  'pdf',
  'txt',
  'csv',
  'md',
  'docx',
  'pptx',
  'xlsx',
  'png',
  'jpeg',
  'jpg',
  'webp',
  'gif',
];

export const CHAT_FILE_EXTENSIONS = [
  'pdf',
  'png',
  'jpeg',
  'jpg',
  'webp',
];

export function formatExtensions(exts, { separator = ', ' } = {}) {
  return exts.map((e) => e.toUpperCase()).join(separator);
}
