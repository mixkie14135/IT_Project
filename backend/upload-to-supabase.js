import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = process.env.STORAGE_PUBLIC_BUCKET;

if (!supabaseUrl || !supabaseKey || !bucketName) {
  console.error("โปรดตั้ง environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STORAGE_PUBLIC_BUCKET");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const uploadFolder = './uploads';

// ลบไฟล์ทั้งหมดใน bucket
async function clearBucket() {
  console.log("ลบไฟล์เก่าใน bucket...");
  const { data: files, error } = await supabase.storage.from(bucketName).list('', { limit: 1000, recursive: true });
  if (error) {
    console.error("Failed to list files:", error);
    return;
  }
  if (files.length > 0) {
    const pathsToDelete = files.map(f => f.name);
    const { error: delError } = await supabase.storage.from(bucketName).remove(pathsToDelete);
    if (delError) console.error("Failed to delete files:", delError);
    else console.log(`ลบ ${pathsToDelete.length} ไฟล์เรียบร้อย.`);
  } else {
    console.log("ไม่มีไฟล์เก่าใน bucket");
  }
}

// อัปโหลดไฟล์แบบ recursive
async function uploadRecursive(folder, prefix = '') {
  const entries = fs.readdirSync(folder);

  for (const entry of entries) {
    const fullPath = path.join(folder, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      await uploadRecursive(fullPath, path.join(prefix, entry));
    } else if (stat.isFile()) {
      const fileStream = fs.createReadStream(fullPath);

      let contentType = 'application/octet-stream';
      if (entry.endsWith('.pdf')) contentType = 'application/pdf';
      else if (entry.endsWith('.jpg') || entry.endsWith('.jpeg')) contentType = 'image/jpeg';
      else if (entry.endsWith('.png')) contentType = 'image/png';

      const { data, error } = await supabase
        .storage
        .from(bucketName)
        .upload(path.join(prefix, entry), fileStream, { upsert: true, contentType });

      if (error) {
        console.error(`Failed to upload ${path.join(prefix, entry)}:`, error);
      } else {
        console.log(`Uploaded ${path.join(prefix, entry)} successfully.`);
      }
    }
  }
}

// เรียกใช้งาน
(async () => {
  await clearBucket();
  await uploadRecursive(uploadFolder);
  console.log("อัปโหลดเรียบร้อยทั้งหมด!");
})();
