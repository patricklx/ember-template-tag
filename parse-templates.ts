import parseStaticImports from 'parse-static-imports';
import * as htmlparser2 from 'htmlparser2';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import { Identifier } from '@babel/types';
import {
  TEMPLATE_TAG_NAME,
  TEMPLATE_LITERAL_MODULE_SPECIFIER,
  TEMPLATE_LITERAL_IDENTIFIER,
} from './util';

export type TemplateMatch = TemplateTagMatch | TemplateLiteralMatch;

export type Match = { start: number; end: number };

export interface TemplateTagMatch {
  type: 'template-tag';
  tagName: string;
  startRange: Match;
  endRange: Match;
  start: RegExpMatchArray;
  end: RegExpMatchArray;
  contents: string;
  prefix?: string;
}

export interface TemplateLiteralMatch {
  type: 'template-literal';
  tagName: string;
  contents: string;
  startRange: Match;
  endRange: Match;
  start: RegExpMatchArray;
  end: RegExpMatchArray;
  importPath: string;
  importIdentifier: string;
  prefix?: string;
}

export function isTemplateLiteralMatch(
  template: TemplateTagMatch | TemplateLiteralMatch
): template is TemplateLiteralMatch {
  return template.type === 'template-literal';
}

/**
 * Represents a static import of a template literal.
 */
export interface StaticImportConfig {
  /**
   * The path to the package from which we want to import the template literal
   * (e.g.: 'ember-cli-htmlbars')
   */
  importPath: string;
  /**
   * The name of the template literal (e.g.: 'hbs') or 'default' if this package
   * exports a default function
   */
  importIdentifier: string;
}

/**
 * The input options to instruct parseTemplates on how to parse the input.
 *
 * @param templateTag
 * @param templateLiteral
 */
export interface ParseTemplatesOptions {
  /** Tag to use, if parsing template tags is enabled. */
  templateTag?: string;
  /** Which static imports are expected in this template. */
  templateLiteral?: StaticImportConfig[];
}

function replaceRange(
  s: string,
  start: number,
  end: number,
  substitute: string
) {
  return s.substring(0, start) + substitute + s.substring(end);
}

function minify(htmlContent: string) {
  let newHtmlContent = htmlContent;
  const replaceList: { start: number; end: number; content: string }[] = [];
  const htmlParser = new htmlparser2.Parser({
    ontext(data: string) {
      replaceList.push({
        start: htmlParser.startIndex,
        end: htmlParser.endIndex + 1,
        content: data.replace(/ {2,}/g, ' ').replace(/[\r\n\t\f\v]/g, ''),
      });
    },
  });
  htmlParser.write(htmlContent);
  htmlParser.end();
  replaceList.reverse().forEach((r) => {
    newHtmlContent = replaceRange(newHtmlContent, r.start, r.end, r.content);
  });
  return newHtmlContent;
}

export const DEFAULT_PARSE_TEMPLATES_OPTIONS = {
  templateTag: TEMPLATE_TAG_NAME,
  templateLiteral: [
    {
      importPath: 'ember-cli-htmlbars',
      importIdentifier: 'hbs',
    },
    {
      importPath: '@ember/template-compilation',
      importIdentifier: 'hbs',
    },
    {
      importPath: TEMPLATE_LITERAL_MODULE_SPECIFIER,
      importIdentifier: TEMPLATE_LITERAL_IDENTIFIER,
    },
    {
      importPath: 'ember-cli-htmlbars-inline-precompile',
      importIdentifier: 'default',
    },
    {
      importPath: 'htmlbars-inline-precompile',
      importIdentifier: 'default',
    },
    {
      importPath: '@ember/template-compilation',
      importIdentifier: 'precompileTemplate',
    },
  ],
};

/**
 * Parses a template to find all possible valid matches for an embedded template.
 * Supported syntaxes are template literals:
 *
 *   hbs`Hello, world!`
 *
 * And template tags
 *
 *   <template></template>
 *
 * The parser excludes any values found within strings recursively, and also
 * excludes any string literals with dynamic segments (e.g `${}`) since these
 * cannot be valid templates.
 *
 * @param template The template to parse
 * @param relativePath Relative file path for the template (for errors)
 * @param options optional configuration options for how to parse templates
 * @returns
 */
export function parseTemplates(
  template: string,
  relativePath: string,
  options: ParseTemplatesOptions = DEFAULT_PARSE_TEMPLATES_OPTIONS
): TemplateMatch[] {
  const results: TemplateMatch[] = [];
  const templateTag = options?.templateTag;
  const templateLiteralConfig = options?.templateLiteral;

  let importedNames = new Map<string, StaticImportConfig>();
  if (templateLiteralConfig) {
    importedNames = findImportedNames(template, templateLiteralConfig);
  }

  if (templateTag) {
    const stack: {
      tagName: string;
      attributes: Record<string, string>;
      location: { start: number; end: number };
    }[] = [];
    const htmlParser = new htmlparser2.Parser({
      onopentag(tagName: string, attributes: Record<string, string>) {
        if (tagName === templateTag) {
          stack.push({
            tagName,
            attributes,
            location: {
              start: htmlParser.startIndex,
              end: htmlParser.endIndex + 1,
            },
          });
          if (stack.length === 1) {
            if (Object.keys(attributes).length !== 0) {
              throw new Error(
                `embedded template preprocessing currently does not support passing arguments, found args in: ${relativePath}`
              );
            }
          }
        }
      },
      onclosetag(tagName: string) {
        if (tagName === templateTag) {
          if (stack.length === 1) {
            const start = stack[0].location;
            const location = {
              start: htmlParser.startIndex,
              end: htmlParser.endIndex + 1,
            };
            let content = template.slice(start.end, location.start);
            const originalContent = content;
            if (stack[0].attributes['minify']) {
              content = minify(content);
            }
            if (stack[0].attributes['trim']) {
              content = content.trim();
            }
            results.push({
              type: 'template-tag',
              tagName: templateTag,
              contents: content,
              startRange: start,
              endRange: location,
              start: {
                index: start.start,
                0: originalContent,
              } as unknown as RegExpMatchArray,
              end: {
                index: location.start,
                0: originalContent,
              } as unknown as RegExpMatchArray,
            });
          }
          stack.pop();
        }
      },
    });
    htmlParser.write(template);
    htmlParser.end();
  }

  let jsCode = template;
  results.forEach((r) => {
    const length = r.endRange.end - r.startRange.start - 4;
    jsCode = replaceRange(
      jsCode,
      r.startRange.start,
      r.endRange.end,
      `['${' '.repeat(length)}']`
    );
  });

  const ast = parser.parse(jsCode, {
    ranges: true,
    allowImportExportEverywhere: true,
    errorRecovery: true,
    plugins: ['typescript', 'decorators'],
  });

  const validTemplates = new Set();

  traverse(ast, {
    StringLiteral(path) {
      const node = path.node;
      const t = results.find(
        (t) =>
          t.type === 'template-tag' &&
          t.startRange.start === node.start! - 1 &&
          t.endRange.end === node.end! + 1
      );
      if (t) {
        if (path.parent.type === 'MemberExpression') {
          t.prefix = ';';
        }
        validTemplates.add(t);
      }
    },
    TaggedTemplateExpression(path) {
      const node = path.node;
      const tagName = (node.tag as Identifier).name;
      const importConfig = importedNames.get(tagName);
      if (importConfig && node.quasi.quasis.length === 1) {
        const contents = template.slice(
          node.quasi.quasis[0].start!,
          node.quasi.quasis[0].end!
        );
        results.push({
          type: 'template-literal',
          tagName,
          contents,
          start: {
            index: node.tag.range![0],
            0: contents,
          } as unknown as RegExpMatchArray,
          end: {
            index: node.range![1] - 1,
            0: contents,
          } as unknown as RegExpMatchArray,
          startRange: {
            start: node.tag.range![0],
            end: node.tag.range![1] + 1,
          },
          endRange: { start: node.range![1] - 1, end: node.range![1] },
          importPath: importConfig.importPath,
          importIdentifier: importConfig.importIdentifier,
        });
      }
    },
  });

  results.slice().forEach((t) => {
    if (t.type === 'template-tag' && !validTemplates.has(t)) {
      const i = results.indexOf(t);
      results.splice(i, 1);
    }
  });
  return results;
}

function findImportedNames(
  template: string,
  importConfig: StaticImportConfig[]
): Map<string, StaticImportConfig> {
  const importedNames = new Map<string, StaticImportConfig>();

  for (const $import of parseStaticImports(template)) {
    for (const $config of findImportConfigByImportPath(
      importConfig,
      $import.moduleName
    )) {
      if ($import.defaultImport && $config.importIdentifier === 'default') {
        importedNames.set($import.defaultImport, $config);
      }
      const match = $import.namedImports.find(
        ({ name }) => $config.importIdentifier === name
      );
      if (match) {
        const localName = match.alias || match.name;
        importedNames.set(localName, $config);
      }
    }
  }

  return importedNames;
}

function findImportConfigByImportPath(
  importConfig: StaticImportConfig[],
  importPath: string
): StaticImportConfig[] {
  return importConfig.filter((config) => config.importPath === importPath);
}
