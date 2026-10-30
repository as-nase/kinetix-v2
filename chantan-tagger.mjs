// Chantan JSX source tagger — Babel plugin. v2 (2026-10-22): no props, ever.
//
// "Click to edit" in the preview needs, for a clicked element, the exact source
// position of the JSX that made it ("relPath:LINE:COL", 1-based line, 0-based
// col — the contract services/elementEdit.ts reads). v1 (2026-08-04) wrote it
// as a `data-chantan-src` PROP on every JSX element; props reach whatever the
// element is, and some libraries read them as instructions (react-three-fiber
// reads a dashed prop as a path → "Cannot read properties of undefined
// (reading 'chantan')" → the whole 3D view dies; 143 apps crashed in preview).
//
// v2 never touches props. Each JSX element `<X …/>` becomes
// `__chantanLoc(<X …/>, "src/…:LINE:COL")`, which returns the SAME element and
// writes its position into a page-wide notebook keyed by the element's props
// object (React keeps that exact object on the fiber as memoizedProps). The
// preview overlay reads the notebook; nothing else can see it.
//
// DEV ONLY — vite.config applies this plugin only when mode !== 'production',
// so published builds are untouched. Never fails a build (skips anything it
// can't place), project source under src/ only, idempotent.

import path from 'node:path'

const HELPER = '__chantanLoc'
const DONE = Symbol.for('chantan-tagger-v2')

export default function chantanTagger(babel) {
  const { types: t } = babel
  return {
    name: 'chantan-tagger',
    visitor: {
      Program: {
        enter(programPath, state) {
          const filename = state.filename || (state.file && state.file.opts && state.file.opts.filename) || ''
          const root = (state.opts && state.opts.root) || process.cwd()
          let rel = filename ? path.relative(root, filename) : ''
          rel = rel.split(path.sep).join('/')
          state.__chantanRel = (!rel || rel.startsWith('..') || !rel.startsWith('src/') || !/\.(jsx|tsx)$/.test(rel)) ? '' : rel
          state.__chantanUsed = false
        },
        exit(programPath, state) {
          if (!state.__chantanUsed) return
          // One tiny helper per module: notebook = WeakMap(props → "file:line:col") + a count for the
          // editor's "does this preview have editable elements?" probe.
          const helper = babel.template.statement.ast(`
            function ${HELPER}(e, l) {
              try {
                if (e && typeof e === "object" && e.props && typeof e.props === "object") {
                  var g = globalThis, m = g.__chantanLocs || (g.__chantanLocs = new WeakMap());
                  if (!m.has(e.props)) { m.set(e.props, l); g.__chantanLocCount = (g.__chantanLocCount || 0) + 1; }
                }
              } catch (_) {}
              return e;
            }
          `)
          programPath.unshiftContainer('body', helper)
        },
      },
      JSXElement(nodePath, state) {
        const rel = state.__chantanRel
        if (!rel) return
        const node = nodePath.node
        if (node[DONE] || !node.loc) return
        node[DONE] = true
        const opening = node.openingElement
        const nameNode = opening && opening.name
        if (t.isJSXIdentifier(nameNode) && nameNode.name === 'Fragment') return
        if (t.isJSXMemberExpression(nameNode) && t.isJSXIdentifier(nameNode.property) && nameNode.property.name === 'Fragment') return
        // Same position as v1 (the opening element's start), so locations are byte-identical.
        const loc = `${rel}:${opening.loc.start.line}:${opening.loc.start.column}`
        const call = t.callExpression(t.identifier(HELPER), [node, t.stringLiteral(loc)])
        const parent = nodePath.parentPath
        const inJsx = parent && (parent.isJSXElement() || parent.isJSXFragment() || parent.isJSXAttribute())
        nodePath.replaceWith(inJsx ? t.jsxExpressionContainer(call) : call)
        state.__chantanUsed = true
      },
    },
  }
}
