import axios from 'axios';
import extract from 'extract-zip';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

// Hàm tải xuống và giải nén file từ URL
export async function downloadAndExtract(url: string): Promise<string> {
    try {
        // Tải file từ URL
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream'
        });

        // Tạo thư mục temp để lưu file tạm thời
        const tempDir = path.join(app.getPath('userData'), 'temp');
        const decenxDir = path.join(app.getPath('userData'), 'decenx-files');

        if (fs.existsSync(path.join(decenxDir, '120'))) {
            return decenxDir;
        }

        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Tạo đường dẫn tạm thời cho file zip
        const tempZipFilePath = path.join(tempDir, 'temp.zip');

        // Tạo một promise để việc giải nén sau khi tải xuống đã hoàn tất
        const extractionPromise = new Promise<string>((resolve, reject) => {
            const writeStream = fs.createWriteStream(tempZipFilePath);
            response.data.pipe(writeStream);
            writeStream.on('finish', () => {
                extract(tempZipFilePath, { dir: decenxDir }).then(() => { resolve(decenxDir); }).catch(reject);
            });
            writeStream.on('error', (err) => {
                reject(err);
            });
        });

        return extractionPromise;
    } catch (error) {
        console.error('Error downloading and extracting:', error);
        throw error;
    }
}
