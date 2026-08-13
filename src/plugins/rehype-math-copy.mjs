/**
 * Adds a small copy-as-text button to every display equation ($$...$$,
 * which rehype-katex renders into <span class="katex-display">). Inline
 * math ($...$) gets nothing: the button rides on that class distinction,
 * so it never has to guess which formulas are which.
 *
 * rehype-katex leaves the original LaTeX behind inside
 * <annotation encoding="application/x-tex">, deep in the MathML half of its
 * own output. That is read once, at build time, and turned into a small
 * ASCII rendering written to a data attribute, so the click handler in
 * MathCopy.astro does zero conversion work at runtime.
 *
 * latexToAscii only understands the LaTeX this blog actually writes (see
 * the self-check at the bottom, sourced from content/blog/lab/index.mdx and
 * content/blog/criptografia-assimetrica-com-rsa/index.mdx). Anything it
 * does not recognise is left exactly as written rather than mangled.
 */

const GREEK = {
  alpha: 'alpha',
  beta: 'beta',
  gamma: 'gamma',
  delta: 'delta',
  epsilon: 'epsilon',
  zeta: 'zeta',
  eta: 'eta',
  theta: 'theta',
  iota: 'iota',
  kappa: 'kappa',
  lambda: 'lambda',
  mu: 'mu',
  nu: 'nu',
  xi: 'xi',
  omicron: 'omicron',
  pi: 'pi',
  rho: 'rho',
  sigma: 'sigma',
  tau: 'tau',
  upsilon: 'upsilon',
  phi: 'phi',
  chi: 'chi',
  psi: 'psi',
  omega: 'omega',
  Gamma: 'Gamma',
  Delta: 'Delta',
  Theta: 'Theta',
  Lambda: 'Lambda',
  Xi: 'Xi',
  Pi: 'Pi',
  Sigma: 'Sigma',
  Upsilon: 'Upsilon',
  Phi: 'Phi',
  Psi: 'Psi',
  Omega: 'Omega',
}

// Commands that carry no ASCII meaning of their own: \left and \right only
// size a delimiter that is already there, and the three spacing macros only
// nudge KaTeX's layout.
const DROPPED = new Set(['left', 'right', ',', ';', '!', ' '])

// Commands with a direct plain-text equivalent, applied with padding so they
// never fuse with whatever character sits on either side of them.
const SYMBOLS = { times: '*', cdot: '*', equiv: '==', mid: '|' }

/** Reads a brace-delimited group starting at `str[start] === '{'`. */
function readGroup(str, start) {
  let depth = 0
  let i = start
  do {
    if (str[i] === '{') depth++
    else if (str[i] === '}') depth--
    i++
  } while (depth > 0 && i < str.length)
  return { content: str.slice(start + 1, i - 1), end: i }
}

/**
 * Reads one LaTeX argument at `i`: a brace group, a single backslash
 * command, or a single character. Used for \frac's two arguments, which are
 * not always braced in the wild even though every real formula here braces
 * them.
 */
function readArg(str, i) {
  let k = i
  while (str[k] === ' ') k++
  if (str[k] === '{') return readGroup(str, k)
  if (str[k] === '\\') {
    let j = k + 1
    if (/[a-zA-Z]/.test(str[j] ?? '')) {
      while (j < str.length && /[a-zA-Z]/.test(str[j])) j++
    } else {
      j++
    }
    return { content: str.slice(k, j), end: j }
  }
  if (k < str.length) return { content: str[k], end: k + 1 }
  return { content: '', end: k }
}

/** Reads an optional brace group at `i`, or returns null if there is none. */
function readOptionalGroup(str, i) {
  let k = i
  while (str[k] === ' ') k++
  if (str[k] !== '{') return null
  return readGroup(str, k)
}

function convert(str) {
  let out = ''
  let i = 0

  while (i < str.length) {
    const ch = str[i]

    if (ch === '{') {
      const group = readGroup(str, i)
      out += convert(group.content)
      i = group.end
      continue
    }

    if (ch !== '\\') {
      out += ch
      i++
      continue
    }

    const afterSlash = i + 1
    let name
    let next
    if (/[a-zA-Z]/.test(str[afterSlash] ?? '')) {
      let j = afterSlash
      while (j < str.length && /[a-zA-Z]/.test(str[j])) j++
      name = str.slice(afterSlash, j)
      next = j
    } else {
      // A one-character command, e.g. \, \; \!
      name = str[afterSlash] ?? ''
      next = afterSlash + 1
    }

    if (name === 'frac') {
      const a = readArg(str, next)
      const b = readArg(str, a.end)
      out += `(${convert(a.content)})/(${convert(b.content)})`
      i = b.end
      continue
    }

    // \pmod{n} becomes "mod n". The blog also writes bare \mod, sometimes
    // with a brace argument and sometimes without, so both are handled the
    // same way here.
    if (name === 'pmod' || name === 'mod') {
      const arg = readOptionalGroup(str, next)
      out += arg ? ` mod ${convert(arg.content)} ` : ' mod '
      i = arg ? arg.end : next
      continue
    }

    if (DROPPED.has(name)) {
      i = next
      continue
    }

    if (name in SYMBOLS) {
      out += ` ${SYMBOLS[name]} `
      i = next
      continue
    }

    if (name === 'newline') {
      out += '\n'
      i = next
      continue
    }

    if (name === 'therefore') {
      out += ' therefore '
      i = next
      continue
    }

    if (name in GREEK) {
      out += ` ${GREEK[name]} `
      i = next
      continue
    }

    // Unrecognised command: keep it, with a trailing space so it does not
    // fuse with whatever follows. A LaTeX-looking leftover is fine; a
    // mangled one is not.
    out += `\\${name} `
    i = next
  }

  return out
}

/** Converts a LaTeX string into a small, honest plain-text rendering. */
export function latexToAscii(tex) {
  return convert(tex)
    .replace(/\( +/g, '(')
    .replace(/ +\)/g, ')')
    .replace(/ *\n */g, '\n')
    .replace(/ {2,}/g, ' ')
    .trim()
}

function findAnnotationText(node) {
  if (node.type === 'element' && node.tagName === 'annotation') {
    if (node.properties?.encoding === 'application/x-tex') {
      return (node.children ?? []).map((child) => (child.type === 'text' ? child.value : '')).join('')
    }
    return null
  }

  if (!Array.isArray(node.children)) return null

  for (const child of node.children) {
    const found = findAnnotationText(child)
    if (found !== null) return found
  }

  return null
}

function isKatexDisplay(node) {
  if (node.type !== 'element' || node.tagName !== 'span') return false
  const classes = node.properties?.className
  return Array.isArray(classes) && classes.includes('katex-display')
}

function makeCopyButton(ascii) {
  return {
    type: 'element',
    tagName: 'button',
    properties: {
      type: 'button',
      className: ['math-copy'],
      'aria-label': 'copy formula as text',
      'data-math-copy': '',
      'data-ascii': ascii,
    },
    children: [{ type: 'text', value: 'copy' }],
  }
}

export function rehypeMathCopy() {
  return (tree) => {
    walk(tree)
  }
}

function walk(node) {
  if (Array.isArray(node.children)) {
    for (const child of node.children) walk(child)
  }

  if (!isKatexDisplay(node)) return

  const tex = findAnnotationText(node)
  if (tex === null || tex.trim() === '') return

  const ascii = latexToAscii(tex)
  if (ascii === '') return

  node.children.push(makeCopyButton(ascii))
}

/**
 * Self-check for latexToAscii, no test framework: `node
 * src/plugins/rehype-math-copy.mjs`. Covers every construct named in the
 * task plus the real formulas from the two posts that use LaTeX.
 */
function selfCheck() {
  const cases = [
    ['\\frac{a}{b}', '(a)/(b)', 'frac'],
    ['x^{n}', 'x^n', 'braced superscript'],
    ['x^n', 'x^n', 'bare superscript'],
    ['x_{i}', 'x_i', 'braced subscript'],
    ['a \\times b', 'a * b', 'times'],
    ['a \\cdot b', 'a * b', 'cdot'],
    ['a \\equiv b', 'a == b', 'equiv'],
    ['a \\pmod{n}', 'a mod n', 'pmod'],
    ['a \\mid b', 'a | b', 'mid'],
    ['a | b', 'a | b', 'bare pipe passes through'],
    ['\\lambda(n)', 'lambda (n)', 'greek letter'],
    ['\\left(a\\right)', '(a)', 'left/right dropped'],
    ['a\\,b\\;c\\!d', 'abcd', 'spacing macros dropped'],
    ['{a}', 'a', 'transparent grouping braces removed'],
    ['\\unknownmacro{x}', '\\unknownmacro x', 'unknown command passes through'],
    // content/blog/criptografia-assimetrica-com-rsa/index.mdx (currently
    // inline math, single $, so these do not get a button in the live
    // build; the transform is checked against them anyway).
    ['C = b^x\\mod{m}', 'C = b^x mod m', 'RSA: modular exponentiation'],
    ['encriptada = plano^e \\mod n', 'encriptada = plano^e mod n', 'RSA: encryption formula'],
    ['d \\equiv e^{-1}(\\mod(\\lambda{n}))', 'd == e^-1(mod (lambda n))', 'RSA: modular inverse'],
    // content/blog/lab/index.mdx, the one real $$ block on the site today.
    [
      '\\lambda(n) = \\frac{|(p-1)(q-1)|}{mdc((p-1),(q-1))}',
      'lambda (n) = (|(p-1)(q-1)|)/(mdc((p-1),(q-1)))',
      'lab page: Carmichael function',
    ],
  ]

  for (const [input, expected, label] of cases) {
    const actual = latexToAscii(input)
    if (actual !== expected) {
      throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    }
  }

  console.log(`rehype-math-copy: all ${cases.length} latexToAscii checks passed`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  selfCheck()
}
