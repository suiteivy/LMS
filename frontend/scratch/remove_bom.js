const fs = require('fs');
const path = require('path');

function removeBOM(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== '.expo') {
                removeBOM(filePath);
            }
        } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js')) {
            let content = fs.readFileSync(filePath, 'utf8');
            if (content.charCodeAt(0) === 0xFEFF) {
                console.log(`Removing BOM from ${filePath}`);
                content = content.slice(1);
                fs.writeFileSync(filePath, content, 'utf8');
            }
        }
    });
}

removeBOM('c:\\Projects\\LMS\\frontend');
