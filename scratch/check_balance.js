import fs from 'fs';

const content = fs.readFileSync('src/app/dashboard/admin/cmv/invoices/[id]/page.tsx', 'utf8');

// Simple tag balancer for <div> and { }
let divStack = [];
let braceStack = [];
let lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Count opening <div
    let opens = (line.match(/<div/g) || []).length;
    for (let j = 0; j < opens; j++) divStack.push(i + 1);
    
    // Count closing </div>
    let closes = (line.match(/<\/div>/g) || []).length;
    for (let j = 0; j < closes; j++) {
        if (divStack.length === 0) {
            console.log(`Extra </div> on line ${i + 1}`);
        } else {
            divStack.pop();
        }
    }
}

console.log('Final div stack size:', divStack.length);
if (divStack.length > 0) {
    console.log('Unclosed divs opened on lines:', divStack.join(', '));
}
