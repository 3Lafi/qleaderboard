import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { routes } from '../js/application/navigation/routes.js';
import { BADGES } from '../js/domain/usecases/Badges.js';
const root = resolve(import.meta.dirname, '..');
const files = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(resolve(directory, entry.name)) : [resolve(directory, entry.name)]);
const modules = files(resolve(root, 'js')).filter(file => file.endsWith('.js'));
const errors = [], dependencies = new Map();
for (const file of modules) {
    try { execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' }); } catch (error) { errors.push(`${relative(root, file)}: ${error.stderr}`); }
    const source = readFileSync(file, 'utf8');
    const imports = [...source.matchAll(/(?:from\s*|import\s*\(\s*)['"]([^'"]+)['"]/g)].map(match => match[1]).filter(spec => spec.startsWith('.')).map(spec => resolve(dirname(file), spec));
    dependencies.set(file, imports);
    for (const dependency of imports) if (!existsSync(dependency)) errors.push(`Missing import: ${relative(root, file)} → ${relative(root, dependency)}`);
    const layer = relative(resolve(root, 'js'), file).split('/')[0];
    const permitted = { domain: ['domain', 'shared'], application: ['application', 'domain', 'shared'], shared: ['shared'], presentation: ['presentation', 'application', 'domain', 'shared'], data: ['data', 'domain', 'shared'] }[layer];
    if (permitted) for (const dependency of imports) {
        const targetLayer = relative(resolve(root, 'js'), dependency).split('/')[0];
        if (!permitted.includes(targetLayer)) errors.push(`Invalid layer dependency: ${relative(root, file)} → ${relative(root, dependency)}`);
    }
}
const roots = ['js/app.js', 'js/sw-register.js', ...new Set(routes.map(route => `js/presentation/pages/${route.page}.js`)), 'js/presentation/pages/NotFoundPage.js'].map(path => resolve(root, path));
const reachable = new Set();
function visit(file) { if (reachable.has(file)) return; reachable.add(file); (dependencies.get(file) || []).forEach(visit); }
roots.forEach(visit);
const unused = modules.filter(file => !reachable.has(file)).map(file => relative(root, file));
for (const file of unused) errors.push(`Unreachable runtime module: ${file}`);
for (const badge of BADGES) for (const value of [badge.art, badge.labelArt]) if (value?.startsWith('/') && !existsSync(resolve(root, '.' + value))) errors.push(`Missing badge artwork: ${value}`);
for (const file of ['index.html', 'tests/ui/preview.html', 'docs/badge-comparison.html', 'css/main.css', 'css/components.css', 'css/admin.css', 'css/wisam.css', 'css/navigation.css']) {
    const source = readFileSync(resolve(root, file), 'utf8');
    const resources = [...source.matchAll(/(?:src=|href=)["']([^"']+)["']|url\(['"]?([^'"\)]+)['"]?\)/g)].map(match => match[1] || match[2]);
    for (const resource of resources) {
        if (/^(?:https?:|data:|#)/.test(resource) || !/\.[a-z0-9]+(?:[?#].*)?$/i.test(resource)) continue;
        const target = resolve(resource.startsWith('/') ? root : dirname(resolve(root, file)), resource.replace(/^\//, '').split(/[?#]/)[0]);
        if (!existsSync(target)) errors.push(`Missing resource: ${file} → ${resource}`);
    }
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Checked ${modules.length} runtime modules: syntax, imports, layer boundaries, reachability, and static resources passed.`);
