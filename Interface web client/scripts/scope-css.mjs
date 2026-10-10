#!/usr/bin/env node
/**
 * Scopes a global stylesheet under a wrapper class so that two independent
 * Figma Make app stylesheets can coexist in one document without colliding.
 *
 * - `:root`, `html`, `body` leading selectors are mapped to the scope class.
 * - Every other selector is prefixed with `.scope `.
 * - Rules inside `@keyframes` are left untouched (but the animation name is
 *   optionally renamed to avoid global clashes).
 *
 * Usage:
 *   node scripts/scope-css.mjs <in.css> <out.css> <scopeClass> [keyframePrefix]
 *
 * Self-contained (no PostCSS dependency) because this project does not hoist
 * a CSS parser to the top level.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const [input, output, scope, kfPrefix = ""] = process.argv.slice(2);

if (!input || !output || !scope) {
  console.error("usage: scope-css.mjs <in.css> <out.css> <scopeClass> [keyframePrefix]");
  process.exit(1);
}

const keyframeNames = [];

function splitTopLevel(value) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "(" || ch === "[") depth += 1;
    else if (ch === ")" || ch === "]") depth -= 1;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

function prefixOne(selector) {
  const s = selector.trim();
  if (!s) return s;
  if (/^:root\b/.test(s)) return s.replace(/^:root/, `.${scope}`);
  const leading = s.match(/^(html|body)\b/);
  if (leading) return `.${scope}${s.slice(leading[1].length)}`;
  return `.${scope} ${s}`;
}

function prefixSelector(prelude) {
  return splitTopLevel(prelude)
    .map(prefixOne)
    .join(", ");
}

function findStatementEnd(css, from) {
  let i = from;
  while (i < css.length) {
    const ch = css[i];
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i += 1;
      while (i < css.length && css[i] !== quote) {
        if (css[i] === "\\") i += 1;
        i += 1;
      }
      i += 1;
      continue;
    }
    if (ch === "{" || ch === ";") return { index: i, delim: ch };
    i += 1;
  }
  return { index: css.length, delim: "" };
}

function matchingBrace(css, openIndex) {
  let i = openIndex + 1;
  let depth = 1;
  while (i < css.length) {
    const ch = css[i];
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i += 1;
      while (i < css.length && css[i] !== quote) {
        if (css[i] === "\\") i += 1;
        i += 1;
      }
      i += 1;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
    i += 1;
  }
  return css.length;
}

function transform(css) {
  let out = "";
  let i = 0;
  while (i < css.length) {
    const { index, delim } = findStatementEnd(css, i);
    if (delim === "") {
      out += css.slice(i);
      break;
    }
    const prelude = css.slice(i, index);
    if (delim === ";") {
      out += `${prelude};`;
      i = index + 1;
      continue;
    }
    const close = matchingBrace(css, index);
    const body = css.slice(index + 1, close);
    const trimmed = prelude.trim();
    if (trimmed.startsWith("@")) {
      const atName = trimmed.slice(1).split(/[\s(]/)[0].toLowerCase();
      const nested = ["media", "supports", "layer", "container", "scope", "document"];
      if (nested.includes(atName)) {
        out += `${prelude}{${transform(body)}}`;
      } else if (atName === "keyframes" || atName === "-webkit-keyframes") {
        const name = trimmed.split(/\s+/)[1];
        if (name) keyframeNames.push(name);
        out += `${prelude}{${body}}`;
      } else {
        out += `${prelude}{${body}}`;
      }
    } else {
      out += `${prefixSelector(prelude)}{${body}}`;
    }
    i = close + 1;
  }
  return out;
}

let css = readFileSync(input, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
css = transform(css);

if (kfPrefix) {
  for (const name of keyframeNames) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    css = css.replace(new RegExp(`\\b${escaped}\\b`, "g"), `${kfPrefix}${name}`);
  }
}

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${css.trim()}\n`);
console.log(`scoped ${input} → ${output}  (scope .${scope}${kfPrefix ? `, keyframes ${kfPrefix}*` : ""})`);
