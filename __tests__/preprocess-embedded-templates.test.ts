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
    });

    expect(templates.output).toMatchInlineSnapshot(`
      "import { template } from "@ember/template-compiler";
      export default template("Hello!", {
        moduleName: "foo.gjs",
        scope: instance => {
          return {};
        }
      });"
    `);
  });

  it("<template></template> with backticks in content", function () {
    const input = "<template>Hello `world`!</template>";
    const templates = transform({
      content: input,
      getTemplateLocals,
      relativePath: "foo.gjs",
      templateTag: util.TEMPLATE_TAG_NAME,
      includeSourceMaps: false
    });

    expect(templates.output).toMatchInlineSnapshot(`
      "import { template } from "@ember/template-compiler";
      export default template("Hello \`world\`!", {
        moduleName: "foo.gjs",
        scope: instance => {
          return {};
        }
      });"
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
      includeSourceMaps: false
    });

    expect(templates.output).toMatchInlineSnapshot(`
      "import { template } from "@ember/template-compiler";
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
      }"
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
      includeSourceMaps: false
    });

    expect(templates.output).toMatchInlineSnapshot(`
      "import { template } from "@ember/template-compiler";
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
      }"
    `);
  });

  it("includes source maps", function () {
    const input = `<template>Hello!</template>`;
    const templates = transform({
      content: input,
      getTemplateLocals,
      relativePath: "foo.gjs",
      templateTag: util.TEMPLATE_TAG_NAME,
      includeSourceMaps: true
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
      includeSourceMaps: true
    });

    expect(templates.output).not.toContain("//# sourceMappingURL");
  });
});
