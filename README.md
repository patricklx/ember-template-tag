# ember-template-preprocessor

instead of using ember-template-imports to find & parse templates, this can be used.

```js
const { parseTemplates, preprocessEmbeddedTemplates } = require('ember-template-preprocessor');
const { TEMPLATE_TAG_NAME, TEMPLATE_LITERAL_IDENTIFIER, TEMPLATE_LITERAL_MODULE_SPECIFIER } = require('ember-template-preprocessor');
```

the output of parseTemplates is
```html
<template>Hello!</template>
```

```js
[
        {
          "contentRange": [
            10,
            16,
          ],
          "contents": "Hello!",
          "end": {
            "0": "</template>",
            "index": 16,
          },
          "endRange": {
            "end": 27,
            "start": 16,
          },
          "range": [
            0,
            27,
          ],
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
```
