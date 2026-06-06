// -----------------------------
// Tiny Handlebars-like engine
// -----------------------------

function render(template, ctx = {}) {
  return compile(template)(ctx);
}

function compile(template) {
  return function exec(ctx) {
    let out = template;

    // IF blocks
    out = out.replace(
      /{{#if\s+([^}]+)}}([\s\S]*?){{\/if}}/g,
      (_, expr, content) => {
        const val = resolve(expr, ctx);
        return val ? compile(content)(ctx) : "";
      }
    );

    // EACH blocks
    out = out.replace(
      /{{#each\s+([^}]+)}}([\s\S]*?){{\/each}}/g,
      (_, expr, content) => {
        const arr = resolve(expr, ctx);
        if (!Array.isArray(arr)) return "";

        return arr
          .map(item => {
            const childCtx = { ...ctx, this: item };
            return compile(content)(childCtx);
          })
          .join("");
      }
    );

    // variable interpolation (escaped)
    out = out.replace(
      /{{\s*([^}]+)\s*}}/g,
      (_, expr) => {
        const val = resolve(expr, ctx);

        if (val === undefined || val === null) return "";
        return escapeHtml(String(val));
      }
    );

    return out;
  };
}

// -----------------------------
// Expression resolver (dot paths only)
// -----------------------------

function resolve(expr, ctx) {
  expr = expr.trim();

  if (expr === "this") return ctx.this;

  return expr.split(".").reduce((acc, key) => {
    if (acc == null) return undefined;
    return acc[key];
  }, ctx);
}

// -----------------------------
// HTML escaping (always on)
// -----------------------------

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// -----------------------------
// Example usage
// -----------------------------

const template = `
<div id="id-{{someId}}"></div>

{{#if isHidden}}
  <div hidden>Hidden content</div>
{{/if}}

<ul>
{{#each items}}
  <li>{{this}}</li>
{{/each}}
</ul>

<p>User: {{user.name}}</p>
`;

const result = render(template, {
  someId: 42,
  isHidden: true,
  items: ["A", "B", "C"],
  user: {
    name: "Alice <admin>"
  }
});

console.log(result);