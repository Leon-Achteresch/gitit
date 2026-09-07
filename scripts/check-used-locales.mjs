import ts from 'typescript';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const locale = JSON.parse(readFileSync('src/locales/en.json', 'utf8'));
const exists = key => key.split('.').reduce((node, part) => node?.[part], locale) !== undefined;
const files = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(dir, entry.name)) : /\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name) ? [join(dir, entry.name)] : []);
let failed = false;
for (const file of files('src')) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (ts.isCallExpression(node) && (ts.isIdentifier(node.expression) && node.expression.text === 't' || ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 't')) {
      const key = node.arguments[0];
      if (key && ts.isStringLiteralLike(key) && !exists(key.text) && !exists(`${key.text}_one`) && !exists(`${key.text}_other`)) {
        const { line } = source.getLineAndCharacterOfPosition(key.getStart());
        console.error(`${file}:${line + 1}: missing translation ${key.text}`);
        failed = true;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
if (failed) process.exit(1);
console.log('All statically used translation keys exist; dynamic keys require separate runtime coverage.');
