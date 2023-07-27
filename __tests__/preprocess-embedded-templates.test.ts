import { transform } from "../lib/transform-embedded-templates";
import { getTemplateLocals } from "@glimmer/syntax";
import * as util from "../lib/util";

describe("transform", function () {
  it("<template></template>", function () {
    const input = `<template>Hello!</template>`;
    const templates = transform({
      input: input,
      getTemplateLocals,
      relativePath: "foo.gjs",
      templateTag: util.TEMPLATE_TAG_NAME,
      includeSourceMaps: false,
    });

    expect(templates.output).toMatchInlineSnapshot(`
      "import { template } from "@ember/template-compiler";
      export default template(\`Hello!\`, {
        moduleName: "foo.gjs",
        scope: instance => ({})
      });"
    `);
  });

  it("<template></template> with backticks in content", function () {
    const input = "<template>Hello `world`!</template>";
    const templates = transform({
      input: input,
      getTemplateLocals,
      relativePath: "foo.gjs",
      templateTag: util.TEMPLATE_TAG_NAME,
      includeSourceMaps: false,
    });

    expect(templates.output).toMatchInlineSnapshot(`
      "import { template } from "@ember/template-compiler";
      export default template(\`Hello \`world\`!\`, {
        moduleName: "foo.gjs",
        scope: instance => ({})
      });"
    `);
  });

  it("<template></template> should not change spacing", function () {
    const input = `
      const template = '';
      <template>Hello \`world\`!</template>
      
      const template1 = <template>Hello \`world\`!</template>;
      const x = {
          b: <template>Hello \`world\`!</template>
      }
      
      class X {
          x: string;
          
          <template>
            <div>Hello \`world\`!</div>          
          </template>
      }
    `;
    const templates = transform({
      input: input,
      linterMode: true,
      getTemplateLocals,
      relativePath: "foo.gjs",
      templateTag: util.TEMPLATE_TAG_NAME,
      includeSourceMaps: false,
    });

    expect(templates.output!.split("\n").length === input.split("\n").length);

    expect(templates.output).toMatchInlineSnapshot(`
      "
            const template = '';
            \`Hello \`world\`!\`
            
            const template1 = \`Hello \`world\`!\`;
            const x = {
                b: \`Hello \`world\`!\`
            }
            
            class X {
                x: string;
                
                static{\`
                  <div>Hello \`world\`!</div>          
                \`;}
            }
          "
    `);
  });

  it("<template></template> with existing template var", function () {
    const input = `
      const template = '';
      <template>Hello \`world\`!</template>
      
      const template1 = '';
      const x = {
          b: <template>Hello \`world\`!</template>
      }
    `;
    const templates = transform({
      input: input,
      getTemplateLocals,
      relativePath: "foo.gjs",
      templateTag: util.TEMPLATE_TAG_NAME,
      includeSourceMaps: false,
    });

    expect(templates.output).toMatchInlineSnapshot(`
      "import { template as template2 } from "@ember/template-compiler";
      const template = '';
      export default template2(\`Hello \`world\`!\`, {
        moduleName: "foo.gjs",
        scope: instance => ({})
      });
      const template1 = '';
      const x = {
        b: template2(\`Hello \`world\`!\`, {
          moduleName: "foo.gjs",
          scope: instance => ({})
        })
      };"
    `);
  });

  it("<template></template> in class", function () {
    const input =
      "class X {message: string; <template>Hello {{this.message}}!</template>}";
    const templates = transform({
      input: input,
      getTemplateLocals,
      relativePath: "foo.gjs",
      templateTag: util.TEMPLATE_TAG_NAME,
      includeSourceMaps: false,
    });

    expect(templates.output).toMatchInlineSnapshot(`
      "import { template } from "@ember/template-compiler";
      class X {
        message: string;
        static {
          template(\`Hello {{this.message}}!\`, {
            component: this,
            moduleName: "foo.gjs",
            scope: instance => ({})
          });
        }
      }"
    `);
  });

  it("<template></template> in class with binding", function () {
    const input =
      "const message:string; class X {<template>Hello {{message.x}}!</template>}";
    const templates = transform({
      input: input,
      getTemplateLocals,
      relativePath: "foo.gjs",
      templateTag: util.TEMPLATE_TAG_NAME,
      includeSourceMaps: false,
    });

    expect(templates.output).toMatchInlineSnapshot(`
      "import { template } from "@ember/template-compiler";
      const message: string;
      class X {
        static {
          template(\`Hello {{message.x}}!\`, {
            component: this,
            moduleName: "foo.gjs",
            scope: instance => ({
              message
            })
          });
        }
      }"
    `);
  });

  it("<template></template> in class with html tag binding", function () {
    const input =
      "const message:string; class X {<template><message></message><div>{{x}}</div>!</template>}";
    const templates = transform({
      input: input,
      getTemplateLocals,
      relativePath: "foo.gjs",
      templateTag: util.TEMPLATE_TAG_NAME,
      includeSourceMaps: false,
    });

    expect(templates.output).toMatchInlineSnapshot(`
      "import { template } from "@ember/template-compiler";
      const message: string;
      class X {
        static {
          template(\`<message></message><div>{{x}}</div>!\`, {
            component: this,
            moduleName: "foo.gjs",
            scope: instance => ({
              x,
              message
            })
          });
        }
      }"
    `);
  });

  it("includes source maps", function () {
    const input = `<template>Hello!</template>`;
    const templates = transform({
      input: input,
      getTemplateLocals,
      relativePath: "foo.gjs",
      templateTag: util.TEMPLATE_TAG_NAME,
      includeSourceMaps: true,
    });

    expect(templates.output).toContain("//# sourceMappingURL");
  });
  it("doesn't include source maps if no templates", function () {
    const input = `const foo = "Hello!"`;
    const templates = transform({
      input: input,
      getTemplateLocals,
      relativePath: "foo.gjs",
      templateTag: util.TEMPLATE_TAG_NAME,
      includeSourceMaps: true,
    });

    expect(templates.output).not.toContain("//# sourceMappingURL");
  });
});
