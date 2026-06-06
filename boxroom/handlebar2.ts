// -----------------------------
// Types
// -----------------------------

type Context = {
  this?: any;
  '@index'?: number;
  [key: string]: any;
};

// -----------------------------
// Public API
// -----------------------------

export function render(template: string, ctx: Context = {}): string {
  return compile(template)(ctx);
}

// -----------------------------
// Compiler
// -----------------------------

function compile(template: string): (ctx: Context) => string {
  return function exec(ctx: Context): string {
    let out = template;

    // IF blocks
    out = out.replace(
      /{{#if\s+([^}]+)}}([\s\S]*?){{\/if}}/g,
      (_, expr: string, content: string) => {
        const val = resolve(expr, ctx);
        return val ? compile(content)(ctx) : '';
      }
    );

    // EACH blocks
    out = out.replace(
      /{{#each\s+([^}]+)}}([\s\S]*?){{\/each}}/g,
      (_, expr: string, content: string) => {
        const arr = resolve(expr, ctx);

        if (!Array.isArray(arr)) return '';

        return arr
          .map((item, index) => {
            const childCtx: Context = {
              ...ctx,
              this: item,
              '@index': index,
            };

            return compile(content)(childCtx);
          })
          .join('');
      }
    );

    // Variables
    out = out.replace(/{{\s*([^}]+)\s*}}/g, (_, expr: string) => {
      const val = resolve(expr, ctx);

      if (val === undefined || val === null) return '';
      return escapeHtml(String(val));
    });

    return out;
  };
}

// -----------------------------
// Resolver (dot-path only)
// -----------------------------

function resolve(expr: string, ctx: Context): any {
  expr = expr.trim();

  if (expr === 'this') return ctx.this;
  if (expr === '@index') return ctx['@index'];

  return expr.split('.').reduce<any>((acc, key) => {
    if (acc == null) return undefined;
    return acc[key];
  }, ctx);
}

// -----------------------------
// HTML escaping (always on)
// -----------------------------

function escapeHtml(str: string): string {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
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
  <li>{{@index}}: {{this}}</li>
{{/each}}
</ul>

<p>User: {{user.name}}</p>
`;

const result = render(template, {
  someId: 42,
  isHidden: true,
  items: ['A', 'B', 'C'],
  user: {
    name: 'Alice <admin>',
  },
});

console.log(result);
