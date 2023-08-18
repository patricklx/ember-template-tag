import { parseTemplates } from '../lib';

describe("parseTemplates", function () {
  it("<template><template>", function () {
    const input = `<template><template>`;

    let error = null;
    try {
      parseTemplates(input, "foo.gjs");
    } catch (e) {
      error = e;
    }

    expect(error).toMatchInlineSnapshot(
      `[SyntaxError: Unexpected token (1:20)]`
    );
  });

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
