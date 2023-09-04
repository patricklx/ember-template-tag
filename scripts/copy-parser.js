const fs = require('fs');
const path = require('path');
const parserPath = require.resolve('@babel/parser');

let parserContent = fs.readFileSync(parserPath).toString().split('\n').slice(0, -5).join('\n');
parserContent = '// @ts-nocheck\n' + parserContent;
parserContent += '\n';
parserContent += 'export { Parser, mixinPlugins }\n';

fs.writeFileSync(path.join(__dirname, '..', 'lib/babel-parser.ts'), parserContent);
