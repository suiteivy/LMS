const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

const appDir = path.join(process.cwd(), 'app');

walkDir(appDir, (filePath) => {
    if (filePath.endsWith('.tsx') && !filePath.includes('(teacher)')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let original = content;

        // Replace main backgrounds
        content = content.replace(/bg-white\s+dark:bg-(?:navy|\[#1a1a1a\]|\[#0F0B2E\])/g, 'bg-[#FFFFFF] dark:bg-navy');
        content = content.replace(/bg-\[\#f8fafc\]\s+dark:bg-\[\#0F0B2E\]/g, 'bg-[#FFFFFF] dark:bg-navy');

        // Replace card backgrounds
        content = content.replace(/bg-white\s+dark:bg-(?:navy-surface|\[#161B22\]|\[#1a1a1a\])/g, 'bg-[#F6F8FA] dark:bg-navy');

        // Replace border colors
        content = content.replace(/border-gray-[12]00\s+dark:border-gray-[78]00/g, 'border-[#D0D7DE] dark:border-[#21262D]');
        content = content.replace(/border-gray-50\s+dark:border-gray-800/g, 'border-[#D0D7DE] dark:border-[#21262D]');

        // Replace border radii
        content = content.replace(/rounded-(?:2xl|3xl|\[32px\]|\[40px\]|\[48px\])/g, 'rounded-xl');

        // Replace text colors
        content = content.replace(/text-gray-400\s+dark:text-gray-500/g, 'text-gray-500 dark:text-gray-400');
        content = content.replace(/text-gray-900\s+dark:text-gray-200/g, 'text-gray-900 dark:text-white');

        // Remove complex inline shadows
        content = content.replace(/style=\{\{\s*boxShadow:\s*\[[^\]]+\][^}]*\}\}/g, '');
        content = content.replace(/shadowColor:\s*\"[^\"]+\",?\s*/g, '');
        content = content.replace(/shadowOffset:\s*\{[^}]+\},?\s*/g, '');
        content = content.replace(/shadowOpacity:\s*[\d\.]+,?\s*/g, '');
        content = content.replace(/shadowRadius:\s*[\d\.]+,?\s*/g, '');
        content = content.replace(/elevation:\s*[\d\.]+,?\s*/g, '');

        if (content !== original) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Updated: ' + filePath);
        }
    }
});
