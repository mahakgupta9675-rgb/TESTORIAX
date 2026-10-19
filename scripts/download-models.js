import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODELS_URL = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model/';
const MODELS_DIR = path.join(__dirname, '..', 'public', 'models');

const filesToDownload = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_expression_model-weights_manifest.json',
  'face_expression_model-shard1',
];

if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

const downloadFile = (fileName) => {
  return new Promise((resolve, reject) => {
    const dest = path.join(MODELS_DIR, fileName);
    if (fs.existsSync(dest)) {
      console.log(`[SKIP] ${fileName} already exists.`);
      return resolve();
    }
    
    const file = fs.createWriteStream(dest);
    https.get(MODELS_URL + fileName, (response) => {
      if (response.statusCode !== 200) {
        fs.unlink(dest, () => reject(new Error(`Failed to download ${fileName}: ${response.statusCode}`)));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`[OK] Downloaded ${fileName}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
};

async function run() {
  console.log('Downloading face-api models...');
  for (const file of filesToDownload) {
    await downloadFile(file);
  }
  console.log('All models downloaded successfully!');
}

run();
