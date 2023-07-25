import {
  DEFAULT_PARSE_TEMPLATES_OPTIONS,
  parseTemplates,
} from "../lib/parse-templates";

describe("parseTemplates", function () {
  /*
      This is just to make snapshot testing a bit easier, since the real `parseTemplates`
      returns `RegExpMatchArray` instances as `start`/`end` the snapshots only display a
      small number of the fields that are available.

      This transforms the `start`/`end` properties into simpler objects with the properties that
      most consumers will be using, so that we can test the function easier.
    */

  it("<template><template>", function () {
    const input = `<template>Hello!</template>`;

    const templates = parseTemplates(input, "foo.gjs", {
      templateTag: "template",
    });

    expect(templates).toMatchInlineSnapshot(`
      [
        {
          "contentRange": [
            10,
            16,
          ],
          "contents": "Hello!",
          "endRange": {
            "end": 27,
            "start": 16,
          },
          "range": [
            0,
            27,
          ],
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
          "contentRange": [
            29,
            35,
          ],
          "contents": "Hello!",
          "endRange": {
            "end": 46,
            "start": 35,
          },
          "range": [
            19,
            46,
          ],
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
          "contentRange": [
            35,
            41,
          ],
          "contents": "Hello!",
          "endRange": {
            "end": 52,
            "start": 41,
          },
          "range": [
            25,
            52,
          ],
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
          "contentRange": [
            51,
            57,
          ],
          "contents": "Hello!",
          "endRange": {
            "end": 68,
            "start": 57,
          },
          "range": [
            41,
            68,
          ],
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
          "contentRange": [
            53,
            59,
          ],
          "contents": "Hello!",
          "endRange": {
            "end": 70,
            "start": 59,
          },
          "range": [
            43,
            70,
          ],
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
