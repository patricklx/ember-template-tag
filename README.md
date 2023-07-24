# ember-template-tag

instead of using ember-template-imports to find, parse & transform templates, this can be used.

```js
const { parseTemplates, preprocessEmbeddedTemplates, transform } = require('ember-template-tag');
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
```


## to transform

```js
const { transform } = require('ember-template-tag');
const transformed = transform('...')
```
