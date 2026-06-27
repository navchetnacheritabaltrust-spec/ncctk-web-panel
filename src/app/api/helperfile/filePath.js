// app/api/helperfile/filePath.js
import path from 'path';

export function getHelperPath(relativePath) {
  return path.join(process.cwd(), 'app/api/helperfile', relativePath);
}
