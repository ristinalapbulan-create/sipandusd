const fs = require('fs');
const file = 'src/components/features/admin/admin-dashboard.tsx';
let data = fs.readFileSync(file, 'utf8');

const lines = data.split('\n');
const newLines = [];
let skipAdminSettingsDup = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect the start of the duplicate block
    if (line.includes("// Note: Add logic for 'Manajemen Akun Korwil' in AdminSettings below")) {
        skipAdminSettingsDup = true;
        continue;
    }

    if (skipAdminSettingsDup) {
        // Look for the end of the duplicate block which is a lonely `}`
        // In the original file, it ended at `            );` then `}`.
        if (line.trim() === '}') {
            skipAdminSettingsDup = false; // end of block
        }
        continue; // skip the lines inside
    }

    // Fix the missing AdminSettings declaration
    if (line.includes("const {user, updateUser} = useAuth();")) {
        // check if previous line already has function declaration
        if (newLines.length > 0 && !newLines[newLines.length - 1].includes("function AdminSettings")) {
            newLines.push("function AdminSettings({ refresh }: { refresh?: () => void }) {");
        }
    }

    // Fix the indentation of the ternary in AdminArchive
    // wait, TypeScript formatter can fix that anyway.

    newLines.push(line);
}

fs.writeFileSync(file, newLines.join('\n'));
console.log('Fixed admin-dashboard.tsx');
