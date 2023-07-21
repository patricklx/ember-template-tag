import {
  parseTemplates as _parseTemplates,
  ParseTemplatesOptions,
  DEFAULT_PARSE_TEMPLATES_OPTIONS,
} from "../parse-templates";

describe("parseTemplates", function () {
  /*
      This is just to make snapshot testing a bit easier, since the real `parseTemplates`
      returns `RegExpMatchArray` instances as `start`/`end` the snapshots only display a
      small number of the fields that are available.

      This transforms the `start`/`end` properties into simpler objects with the properties that
      most consumers will be using, so that we can test the function easier.
    */
  function parseTemplates(
    source: string,
    relativePath: string,
    options?: ParseTemplatesOptions
  ) {
    const results = _parseTemplates(source, relativePath, options);

    return results.map((result) => {
      const start = { ...result.start };
      const end = { ...result.end };

      return {
        ...result,

        start,
        end,
      };
    });
  }

  it("<template><template>", function () {
    const input = `<template>Hello!</template>`;

    const templates = parseTemplates(input, "foo.gjs", {
      templateTag: "template",
    });

    expect(templates).toMatchInlineSnapshot(`
      [
        {
          "contents": "Hello!",
          "end": {
            "0": "</template>",
            "index": 16,
          },
          "endRange": {
            "end": 27,
            "start": 16,
          },
          "start": {
            "0": "Hello!",
            "index": 0,
          },
          "startRange": {
            "end": 10,
            "start": 0,
          },
          "tagName": "template",
          "type": "template-tag",
        },
      ]
    `);
  });

  it("<template></template> as assignment", function () {
    const input = `
      const tpl = <template>Hello!</template>
    `;

    const templates = parseTemplates(input, "foo.gjs", {
      templateTag: "template",
    });

    expect(templates).toMatchInlineSnapshot(`
      [
        {
          "contents": "Hello!",
          "end": {
            "0": "</template>",
            "index": 35,
          },
          "endRange": {
            "end": 46,
            "start": 35,
          },
          "start": {
            "0": "Hello!",
            "index": 19,
          },
          "startRange": {
            "end": 29,
            "start": 19,
          },
          "tagName": "template",
          "type": "template-tag",
        },
      ]
    `);
  });

  it("<template></template> in class", function () {
    const input = `
      class A {
        <template>Hello!</template>
      }     
    `;

    const templates = parseTemplates(input, "foo.gjs", {
      templateTag: "template",
    });

    expect(templates).toMatchInlineSnapshot(`
      [
        {
          "contents": "Hello!",
          "end": {
            "0": "</template>",
            "index": 41,
          },
          "endRange": {
            "end": 52,
            "start": 41,
          },
          "start": {
            "0": "Hello!",
            "index": 25,
          },
          "startRange": {
            "end": 35,
            "start": 25,
          },
          "tagName": "template",
          "type": "template-tag",
        },
      ]
    `);
  });

  it("<template></template> preceded by a slash character", function () {
    const input = `
      const divide = () => 4 / 2;
      <template>Hello!</template>
    `;

    const templates = parseTemplates(input, "foo.gjs", {
      templateTag: "template",
    });

    expect(templates).toMatchInlineSnapshot(`
      [
        {
          "contents": "Hello!",
          "end": {
            "0": "</template>",
            "index": 57,
          },
          "endRange": {
            "end": 68,
            "start": 57,
          },
          "start": {
            "0": "Hello!",
            "index": 41,
          },
          "startRange": {
            "end": 51,
            "start": 41,
          },
          "tagName": "template",
          "type": "template-tag",
        },
      ]
    `);
  });

  it("<template></template> with <template> inside of a regexp", function () {
    const input = `
      const myregex = /<template>/;
      <template>Hello!</template>
    `;

    const templates = parseTemplates(input, "foo.gjs", {
      templateTag: "template",
    });

    expect(templates).toMatchInlineSnapshot(`
      [
        {
          "contents": "Hello!",
          "end": {
            "0": "</template>",
            "index": 59,
          },
          "endRange": {
            "end": 70,
            "start": 59,
          },
          "start": {
            "0": "Hello!",
            "index": 43,
          },
          "startRange": {
            "end": 53,
            "start": 43,
          },
          "tagName": "template",
          "type": "template-tag",
        },
      ]
    `);
  });

  it("hbs`Hello!` when only matching <template>", function () {
    const input = "hbs`Hello!`";

    const templates = parseTemplates(input, "foo.js", {
      templateTag: "template",
    });

    expect(templates).toMatchInlineSnapshot(`[]`);
  });

  it("hbs`Hello!` with imports ember-cli-htmlbars", function () {
    const input = "import { hbs } from 'ember-cli-htmlbars'; hbs`Hello!`";

    const templates = parseTemplates(input, "foo.js", {
      templateTag: "template",
      templateLiteral: [
        {
          importPath: "ember-cli-htmlbars",
          importIdentifier: "hbs",
        },
      ],
    });

    expect(templates).toMatchInlineSnapshot(`
      [
        {
          "contents": "Hello!",
          "end": {
            "0": "\`",
            "index": 52,
          },
          "endRange": {
            "end": 53,
            "start": 52,
          },
          "importIdentifier": "hbs",
          "importPath": "ember-cli-htmlbars",
          "start": {
            "0": "Hello!",
            "index": 42,
          },
          "startRange": {
            "end": 46,
            "start": 42,
          },
          "tagName": "hbs",
          "type": "template-literal",
        },
      ]
    `);
  });

  it("hbs`Hello!` with imports @ember/template-compilation", function () {
    const input =
      "import { hbs } from '@ember/template-compilation'; hbs`Hello!`";

    const templates = parseTemplates(input, "foo.js", {
      templateTag: "template",
      templateLiteral: [
        {
          importPath: "@ember/template-compilation",
          importIdentifier: "precompileTemplate",
        },
        {
          importPath: "@ember/template-compilation",
          importIdentifier: "hbs",
        },
      ],
    });

    expect(templates).toMatchInlineSnapshot(`
      [
        {
          "contents": "Hello!",
          "end": {
            "0": "\`",
            "index": 61,
          },
          "endRange": {
            "end": 62,
            "start": 61,
          },
          "importIdentifier": "hbs",
          "importPath": "@ember/template-compilation",
          "start": {
            "0": "Hello!",
            "index": 51,
          },
          "startRange": {
            "end": 55,
            "start": 51,
          },
          "tagName": "hbs",
          "type": "template-literal",
        },
      ]
    `);
  });

  it("hbs`Hello!` with imports ember-template-imports", function () {
    const input = "import { hbs } from 'ember-template-imports'; hbs`Hello!`";

    const templates = parseTemplates(input, "foo.js", {
      templateTag: "template",
      templateLiteral: [
        {
          importPath: "ember-template-imports",
          importIdentifier: "hbs",
        },
      ],
    });

    expect(templates).toMatchInlineSnapshot(`
      [
        {
          "contents": "Hello!",
          "end": {
            "0": "\`",
            "index": 56,
          },
          "endRange": {
            "end": 57,
            "start": 56,
          },
          "importIdentifier": "hbs",
          "importPath": "ember-template-imports",
          "start": {
            "0": "Hello!",
            "index": 46,
          },
          "startRange": {
            "end": 50,
            "start": 46,
          },
          "tagName": "hbs",
          "type": "template-literal",
        },
      ]
    `);
  });

  it("renamed hbs`Hello!` with (default) import ember-cli-htmlbars-inline-precompile", function () {
    const input =
      "import theHbs from 'ember-cli-htmlbars-inline-precompile'; theHbs`Hello!`";

    const templates = parseTemplates(input, "foo.js", {
      templateTag: "template",
      templateLiteral: [
        {
          importPath: "ember-cli-htmlbars-inline-precompile",
          importIdentifier: "default",
        },
      ],
    });

    expect(templates).toMatchInlineSnapshot(`
      [
        {
          "contents": "Hello!",
          "end": {
            "0": "\`",
            "index": 72,
          },
          "endRange": {
            "end": 73,
            "start": 72,
          },
          "importIdentifier": "default",
          "importPath": "ember-cli-htmlbars-inline-precompile",
          "start": {
            "0": "Hello!",
            "index": 59,
          },
          "startRange": {
            "end": 66,
            "start": 59,
          },
          "tagName": "theHbs",
          "type": "template-literal",
        },
      ]
    `);
  });

  it("hbs`Hello!` with (default) import htmlbars-inline-precompile", function () {
    const input = "import hbs from 'htmlbars-inline-precompile'; hbs`Hello!`";

    const templates = parseTemplates(input, "foo.js", {
      templateTag: "template",
      templateLiteral: [
        {
          importPath: "htmlbars-inline-precompile",
          importIdentifier: "default",
        },
      ],
    });

    expect(templates).toMatchInlineSnapshot(`
      [
        {
          "contents": "Hello!",
          "end": {
            "0": "\`",
            "index": 56,
          },
          "endRange": {
            "end": 57,
            "start": 56,
          },
          "importIdentifier": "default",
          "importPath": "htmlbars-inline-precompile",
          "start": {
            "0": "Hello!",
            "index": 46,
          },
          "startRange": {
            "end": 50,
            "start": 46,
          },
          "tagName": "hbs",
          "type": "template-literal",
        },
      ]
    `);
  });

  it("precompileTemplate`Hello!` with import @ember/template-compilation", function () {
    const input =
      "import { precompileTemplate } from '@ember/template-compilation'; precompileTemplate`Hello!`";

    const templates = parseTemplates(input, "foo.js", {
      templateTag: "template",
      templateLiteral: [
        {
          importPath: "@ember/template-compilation",
          importIdentifier: "hbs",
        },
        {
          importPath: "@ember/template-compilation",
          importIdentifier: "precompileTemplate",
        },
      ],
    });

    expect(templates).toMatchInlineSnapshot(`
      [
        {
          "contents": "Hello!",
          "end": {
            "0": "\`",
            "index": 91,
          },
          "endRange": {
            "end": 92,
            "start": 91,
          },
          "importIdentifier": "precompileTemplate",
          "importPath": "@ember/template-compilation",
          "start": {
            "0": "Hello!",
            "index": 66,
          },
          "startRange": {
            "end": 85,
            "start": 66,
          },
          "tagName": "precompileTemplate",
          "type": "template-literal",
        },
      ]
    `);
  });

  it("hbs`Hello!` with imports alias", function () {
    const input =
      "import { hbs as someHbs } from 'ember-cli-htmlbars';\n" +
      "import theHbs from 'htmlbars-inline-precompile';\n" +
      "import { hbs } from 'not-the-hbs-you-want';\n" +
      "hbs`Hello!`\n" +
      "someHbs`Howdy!`\n" +
      "theHbs`Hi!`";

    const templates = parseTemplates(input, "foo.js", {
      templateTag: "template",
      templateLiteral: [
        {
          importPath: "ember-cli-htmlbars",
          importIdentifier: "hbs",
        },
        {
          importPath: "htmlbars-inline-precompile",
          importIdentifier: "default",
        },
      ],
    });

    expect(templates).toMatchInlineSnapshot(`
      [
        {
          "contents": "Howdy!",
          "end": {
            "0": "\`",
            "index": 172,
          },
          "endRange": {
            "end": 173,
            "start": 172,
          },
          "importIdentifier": "hbs",
          "importPath": "ember-cli-htmlbars",
          "start": {
            "0": "Howdy!",
            "index": 158,
          },
          "startRange": {
            "end": 166,
            "start": 158,
          },
          "tagName": "someHbs",
          "type": "template-literal",
        },
        {
          "contents": "Hi!",
          "end": {
            "0": "\`",
            "index": 184,
          },
          "endRange": {
            "end": 185,
            "start": 184,
          },
          "importIdentifier": "default",
          "importPath": "htmlbars-inline-precompile",
          "start": {
            "0": "Hi!",
            "index": 174,
          },
          "startRange": {
            "end": 181,
            "start": 174,
          },
          "tagName": "theHbs",
          "type": "template-literal",
        },
      ]
    `);
  });

  it("with multiple identifiers for the same import path", function () {
    const input =
      "import someDefaultHbs, { hbs as someHbs } from 'ember-cli-htmlbars';\n" +
      "import theHbs from 'htmlbars-inline-precompile';\n" +
      "import { hbs } from 'not-the-hbs-you-want';\n" +
      "hbs`Hello!`\n" +
      "someDefaultHbs`Hello!`\n" +
      "someHbs`Howdy!`\n" +
      "theHbs`Hi!`";

    const templates = parseTemplates(input, "foo.js", {
      templateTag: "template",
      templateLiteral: [
        {
          importPath: "ember-cli-htmlbars",
          importIdentifier: "hbs",
        },
        {
          importPath: "ember-cli-htmlbars",
          importIdentifier: "default",
        },
        {
          importPath: "htmlbars-inline-precompile",
          importIdentifier: "default",
        },
      ],
    });

    expect(templates).toMatchInlineSnapshot(`
      [
        {
          "contents": "Hello!",
          "end": {
            "0": "\`",
            "index": 195,
          },
          "endRange": {
            "end": 196,
            "start": 195,
          },
          "importIdentifier": "default",
          "importPath": "ember-cli-htmlbars",
          "start": {
            "0": "Hello!",
            "index": 174,
          },
          "startRange": {
            "end": 189,
            "start": 174,
          },
          "tagName": "someDefaultHbs",
          "type": "template-literal",
        },
        {
          "contents": "Howdy!",
          "end": {
            "0": "\`",
            "index": 211,
          },
          "endRange": {
            "end": 212,
            "start": 211,
          },
          "importIdentifier": "hbs",
          "importPath": "ember-cli-htmlbars",
          "start": {
            "0": "Howdy!",
            "index": 197,
          },
          "startRange": {
            "end": 205,
            "start": 197,
          },
          "tagName": "someHbs",
          "type": "template-literal",
        },
        {
          "contents": "Hi!",
          "end": {
            "0": "\`",
            "index": 223,
          },
          "endRange": {
            "end": 224,
            "start": 223,
          },
          "importIdentifier": "default",
          "importPath": "htmlbars-inline-precompile",
          "start": {
            "0": "Hi!",
            "index": 213,
          },
          "startRange": {
            "end": 220,
            "start": 213,
          },
          "tagName": "theHbs",
          "type": "template-literal",
        },
      ]
    `);
  });

  it("with multiple identifiers for the same import path with DEFAULT_PARSE_TEMPLATES_OPTIONS", function () {
    const input =
      "import someDefaultHbs, { hbs as someHbs } from 'ember-cli-htmlbars';\n" +
      "import theHbs from 'htmlbars-inline-precompile';\n" +
      "import { hbs } from 'not-the-hbs-you-want';\n" +
      "hbs`Hello!`\n" +
      "someDefaultHbs`Hello!`\n" +
      "someHbs`Howdy!`\n" +
      "theHbs`Hi!`";

    const templates = parseTemplates(
      input,
      "foo.js",
      DEFAULT_PARSE_TEMPLATES_OPTIONS
    );

    expect(templates).toMatchInlineSnapshot(`
      [
        {
          "contents": "Howdy!",
          "end": {
            "0": "\`",
            "index": 211,
          },
          "endRange": {
            "end": 212,
            "start": 211,
          },
          "importIdentifier": "hbs",
          "importPath": "ember-cli-htmlbars",
          "start": {
            "0": "Howdy!",
            "index": 197,
          },
          "startRange": {
            "end": 205,
            "start": 197,
          },
          "tagName": "someHbs",
          "type": "template-literal",
        },
        {
          "contents": "Hi!",
          "end": {
            "0": "\`",
            "index": 223,
          },
          "endRange": {
            "end": 224,
            "start": 223,
          },
          "importIdentifier": "default",
          "importPath": "htmlbars-inline-precompile",
          "start": {
            "0": "Hi!",
            "index": 213,
          },
          "startRange": {
            "end": 220,
            "start": 213,
          },
          "tagName": "theHbs",
          "type": "template-literal",
        },
      ]
    `);
  });

  it("hbs`Hello!` with multiple imports and alias", function () {
    const input =
      "import { hbs as someHbs } from 'ember-cli-htmlbars';\n" +
      "import { hbs } from 'not-the-hbs-you-want';\n" +
      "hbs`Hello!`\n" +
      "someHbs`Howdy!`";

    const templates = parseTemplates(input, "foo.js", {
      templateTag: "template",
      templateLiteral: [
        {
          importPath: "ember-cli-htmlbars",
          importIdentifier: "hbs",
        },
      ],
    });

    expect(templates).toMatchInlineSnapshot(`
      [
        {
          "contents": "Howdy!",
          "end": {
            "0": "\`",
            "index": 123,
          },
          "endRange": {
            "end": 124,
            "start": 123,
          },
          "importIdentifier": "hbs",
          "importPath": "ember-cli-htmlbars",
          "start": {
            "0": "Howdy!",
            "index": 109,
          },
          "startRange": {
            "end": 117,
            "start": 109,
          },
          "tagName": "someHbs",
          "type": "template-literal",
        },
      ]
    `);
  });

  it("lol`hahahaha` with options", function () {
    const input = "lol`hahaha`";

    const templates = parseTemplates(input, "foo.js", {
      templateTag: "template",
      templateLiteral: [
        {
          importPath: "ember-cli-htmlbars",
          importIdentifier: "hbs",
        },
      ],
    });

    expect(templates).toEqual([]);
  });
});
