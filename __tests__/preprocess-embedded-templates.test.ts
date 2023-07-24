import { transform } from "../lib/transform-embedded-templates";
import { getTemplateLocals } from "@glimmer/syntax";
import * as util from "../lib/util";

describe("transform", function () {
  it("<template></template>", function () {
    const input = `<template>Hello!</template>`;
    const templates = transform({
      content: input,
      getTemplateLocals,
      relativePath: "foo.gjs",
      templateTag: util.TEMPLATE_TAG_NAME,
      includeSourceMaps: false,
      includeTemplateTokens: false,
    });

    expect(templates).toMatchInlineSnapshot(`
      {
        "output": "import { template } from "@ember/template-compiler";
      export default template("Hello!", {
        moduleName: "foo.gjs",
        scope: instance => {
          return {};
        }
      });",
      }
    `);
  });

  it("<template></template> with backticks in content", function () {
    const input = "<template>Hello `world`!</template>";
    const templates = transform({
      content: input,
      getTemplateLocals,
      relativePath: "foo.gjs",
      templateTag: util.TEMPLATE_TAG_NAME,
      includeSourceMaps: false,
      includeTemplateTokens: false,
    });

    expect(templates).toMatchInlineSnapshot(`
      {
        "output": "import { template } from "@ember/template-compiler";
      export default template("Hello \`world\`!", {
        moduleName: "foo.gjs",
        scope: instance => {
          return {};
        }
      });",
      }
    `);
  });

  it("<template></template> in class", function () {
    const input =
      "class X {message: string; <template>Hello {{this.message}}!</template>}";
    const templates = transform({
      content: input,
      getTemplateLocals,
      relativePath: "foo.gjs",
      templateTag: util.TEMPLATE_TAG_NAME,
      includeSourceMaps: false,
      includeTemplateTokens: false,
    });

    expect(templates).toMatchInlineSnapshot(`
      {
        "output": "import { template } from "@ember/template-compiler";
      class X {
        message: string;
        static {
          {
            template("Hello {{this.message}}!", {
              component: this,
              moduleName: "foo.gjs",
              scope: instance => {
                return {};
              }
            });
          }
        }
      }",
      }
    `);
  });

  it("<template></template> in class with binding", function () {
    const input =
      "const message:string; class X {<template>Hello {{message.x}}!</template>}";
    const templates = transform({
      content: input,
      getTemplateLocals,
      relativePath: "foo.gjs",
      templateTag: util.TEMPLATE_TAG_NAME,
      includeSourceMaps: false,
      includeTemplateTokens: false,
    });

    expect(templates).toMatchInlineSnapshot(`
      {
        "output": "import { template } from "@ember/template-compiler";
      const message: string;
      class X {
        static {
          {
            template("Hello {{message.x}}!", {
              component: this,
              moduleName: "foo.gjs",
              scope: instance => {
                return {
                  message
                };
              }
            });
          }
        }
      }",
      }
    `);
  });

  it("hbs`Hello`", function () {
    const input = `hbs\`Hello!\``;
    const templates = transform({
      content: input,
      getTemplateLocals,
      relativePath: "foo.gjs",
      templateTag: util.TEMPLATE_TAG_NAME,
      includeSourceMaps: false,
      includeTemplateTokens: false,
    });

    expect(templates).toMatchInlineSnapshot(`
      {
        "output": "hbs\`Hello!\`",
      }
    `);
  });

  it("hbs`Hello \\`world\\``", function () {
    const input = `hbs\`Hello \\\`world\\\`!\``; // template tag with escaped backticks in content
    const templates = transform({
      content: input,
      getTemplateLocals,
      relativePath: "foo.gjs",
      templateTag: util.TEMPLATE_TAG_NAME,
      includeSourceMaps: false,
      includeTemplateTokens: false,
    });

    expect(templates).toMatchInlineSnapshot(`
      {
        "output": "hbs\`Hello \\\`world\\\`!\`",
      }
    `);
  });

  it("hbs`Hello` with import statement", function () {
    const input =
      `import { hbs } from 'ember-template-imports'\n` +
      "const Greeting = hbs`Hello!`\n";
    const templates = transform({
      content: input,
      getTemplateLocals,
      relativePath: "foo.gjs",
      templateTag: util.TEMPLATE_TAG_NAME,
      includeSourceMaps: false,
      includeTemplateTokens: false,
    });

    const expected = {
      output:
        "import { hbs } from 'ember-template-imports'\nconst Greeting = hbs(`Hello!`, { strictMode: true })\n",
      replacements: [
        {
          type: "start",
          index: 62,
          oldLength: 4,
          newLength: 11,
          originalCol: 18,
          originalLine: 2,
        },
        {
          type: "end",
          index: 72,
          oldLength: 1,
          newLength: 24,
          originalCol: 28,
          originalLine: 2,
        },
      ],
    };

    expect(templates).toMatchInlineSnapshot(`
      {
        "output": "import { hbs } from 'ember-template-imports'
      const Greeting = hbs\`Hello!\`
      ",
      }
    `);
  });

  it("includes source maps", function () {
    const input = `<template>Hello!</template>`;
    const templates = transform({
      content: input,
      getTemplateLocals,
      relativePath: "foo.gjs",
      templateTag: util.TEMPLATE_TAG_NAME,
      includeSourceMaps: true,
      includeTemplateTokens: false,
    });

    expect(templates.output).toContain("//# sourceMappingURL");
  });
  it("doesn't include source maps if no templates", function () {
    const input = `const foo = "Hello!"`;
    const templates = transform({
      content: input,
      getTemplateLocals,
      relativePath: "foo.gjs",
      templateTag: util.TEMPLATE_TAG_NAME,
      includeSourceMaps: true,
      includeTemplateTokens: false,
    });

    expect(templates.output).not.toContain("//# sourceMappingURL");
  });
});
