const fs = require('fs');

async function fix() {
    try {
        let data = fs.readFileSync('lint-results.json', 'utf16le');
        if (data.charCodeAt(0) === 0xFEFF) {
            data = data.slice(1);
        }
        const results = JSON.parse(data);
        
        for (const result of results) {
            const errors = result.messages.filter(m => m.ruleId === 'react/no-unescaped-entities');
            if (errors.length === 0) continue;
            
            let lines = fs.readFileSync(result.filePath, 'utf8').split('\n');
            
            for (const err of errors.sort((a,b) => b.line - a.line || b.column - a.column)) {
                const lineIdx = err.line - 1;
                const colIdx = err.column - 1;
                let char = lines[lineIdx][colIdx];
                let replacement = '';
                if (char === "'") replacement = "&apos;";
                else if (char === '"') replacement = "&quot;";
                else if (char === '>') replacement = "&gt;";
                else if (char === '}') replacement = "&#125;";
                
                if (replacement) {
                    lines[lineIdx] = lines[lineIdx].substring(0, colIdx) + replacement + lines[lineIdx].substring(colIdx + 1);
                }
            }
            
            fs.writeFileSync(result.filePath, lines.join('\n'), 'utf8');
            console.log("Fixed", result.filePath);
        }
    } catch (e) {
        console.error(e);
    }
}
fix();
