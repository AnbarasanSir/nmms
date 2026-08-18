const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// Fix admin password syntax 2
const badText = `    .catch(e => console.error('Failed to persist admin password:', e));
},
        null,
        2
      )
    );`;
const goodText = `    .catch(e => console.error('Failed to persist admin password:', e));
}`;

code = code.replace(badText, goodText);
fs.writeFileSync('server.ts', code);
console.log('Fixed admin password syntax again');
