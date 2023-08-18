import parse, { EmberNode } from './template-parser';
import { DEFAULT_PARSE_TEMPLATES_OPTIONS } from './parse-templates';
import { PluginTarget, transformFromAstSync } from '@babel/core';
import {
    arrowFunctionExpression,
    blockStatement,
    callExpression,
    exportDefaultDeclaration,
    expressionStatement,
    Identifier,
    identifier,
    importDeclaration,
    importSpecifier,
    memberExpression,
    numericLiteral,
    ObjectExpression,
    objectExpression,
    objectMethod,
    objectProperty,
    Program,
    returnStatement,
    SourceLocation, staticBlock,
    stringLiteral,
    templateElement,
    templateLiteral,
    TemplateLiteral
} from '@babel/types';
import { ParserPlugin } from '@babel/parser';
import { NodePath } from '@babel/traverse';
import { default as generate } from '@babel/generator';
import { getTemplateLocals } from '@glimmer/syntax';
import { preprocess, traverse, print } from '@glimmer/syntax';
import Module from 'module';

type TransformOptions = {
    getTemplateLocals: typeof getTemplateLocals,
    explicit: boolean;
    linterMode: boolean;
    moduleName: string;
}

if (typeof require === 'undefined') {
    // @ts-ignore
    require = Module.createRequire(import.meta.url);
}

// @ts-ignore
require(require.resolve('@babel/types', { paths: [require.resolve('@babel/core')] })).TYPES.push('EmberTemplate');

function minify(htmlContent: string) {
    const ast = preprocess(htmlContent, {mode: 'codemod'});
    traverse(ast, {
        TextNode(node) {
            node.chars = node.chars.replace(/ {2,}/g, ' ').replace(/[\r\n\t\f\v]/g, '');
        }
    });
    return print(ast);
}

function buildScope(path: NodePath<EmberNode>, options: TransformOptions) {
    const locals = options.getTemplateLocals(path.node.contentNode.quasis[0].value.raw);
    const localsWithtemplateTags = options.getTemplateLocals(path.node.contentNode.quasis[0].value.raw, { includeHtmlElements: true });
    const templateTags = localsWithtemplateTags.filter(l => !locals.includes(l) && path.scope.hasBinding(l));
    const all = [...locals, ...templateTags];
    const properties = all.map(l => {
        const id = l.split('.')[0];
        return objectProperty(identifier(id), identifier(id), false, true);
    })
    const arrow = arrowFunctionExpression([identifier('instance')], objectExpression(properties));
    return objectProperty(identifier('scope'), arrow);
}

function buildEval() {
    return  objectMethod('method', identifier('eval'), [], blockStatement([
        returnStatement(callExpression(identifier('eval'), [memberExpression(identifier('arguments'), numericLiteral(0), true)]))
    ]));
}

function buildTemplateCall(id: string,path: NodePath<EmberNode>, options: TransformOptions) {
    let content = path.node.contentNode.quasis[0].value.raw;
    if (!options.linterMode) {
        if ('trim' in path.node.tagProperties) {
            content = content.trim();
        }

        if ('minify' in path.node.tagProperties) {
            content = minify(content);
        }
    } else {
        const startLen = path.node.startRange[1] - path.node.startRange[0];
        const endLen = path.node.endRange[1] - path.node.endRange[0];
        content = ' '.repeat(startLen - 1) + content + ' '.repeat(endLen - 1);
    }
    const literal = templateLiteral([templateElement({ raw: '' })], []);
    literal.quasis[0].loc = path.node.contentNode.loc;
    literal.quasis[0].value.raw = content;
    literal.quasis[0].value.cooked = content;

    if (options.linterMode) {
        return literal;
    }
    let optionsExpression: ObjectExpression;
    const explicit = options.explicit;
    const property = explicit ? buildScope(path, options) : buildEval();
    const isInClass = path.parent?.type === 'ClassBody';
    if (isInClass) {
        optionsExpression = objectExpression([
            objectProperty(identifier('component'), identifier('this')),
            objectProperty(identifier('moduleName'), stringLiteral(options.moduleName)),
            property
        ]);
    } else {
        optionsExpression = objectExpression([
            objectProperty(identifier('moduleName'), stringLiteral(options.moduleName)),
            property
        ])
    }
    const callId = identifier(id);
    path.state.calls.push(callId);
    return callExpression(
        callId,
        [
            literal,
            optionsExpression
        ]
    )
}

function ensureImport(path: NodePath<EmberNode>, options: TransformOptions) {
    let templateCallSpecifier = path.state.templateCallSpecifier || 'template';
    if (options.linterMode) {
        return templateCallSpecifier
    }

    const id = identifier(templateCallSpecifier);
    const imp = importDeclaration([importSpecifier(id, identifier('template'))], stringLiteral('@ember/template-compiler'));
    if (!path.state.addedImport) {
        path.state.addedImport = id;
        (path.state.program as NodePath<Program>).node.body.splice(0, 0, imp);
    }
    return templateCallSpecifier;
}

const TemplateTransformPlugins: PluginTarget = (babel, options: TransformOptions) => {
    return {
        name: 'TemplateTransform',
        visitor: {
            Program: {
                enter(path: NodePath<Program>) {
                    path.state = {};
                    path.state.program = path;
                    path.state.calls = [];
                    path.state.identifiers = new Set();
                },
                exit(path: NodePath<Program>) {
                    let counter = 1;
                    let templateCallSpecifier = 'template';
                    while(path.state.identifiers.has(templateCallSpecifier)) {
                        templateCallSpecifier = `template${counter}`;
                        counter += 1;
                    }
                    path.state.calls.forEach((c: any) => {
                        c.name = templateCallSpecifier;
                    });
                    (path.state.program.node as any).templateCallSpecifier = path.state.templateCallSpecifier;
                    if (path.state.addedImport) {
                        path.state.addedImport.name = templateCallSpecifier;
                    }
                }
            },
            Identifier(path: NodePath<Identifier>) {
                if (path.state.calls.some((c: Identifier) => c === path.node)) return;
                path.state.identifiers.add(path.node.name);
            },
            EmberTemplate(path: NodePath<EmberNode>) {
                const specifier = ensureImport(path, options);
                if (path.parent?.type === 'ClassBody') {
                    const templateExpr = buildTemplateCall(specifier, path, options);
                    templateExpr.loc = path.node.loc;
                    if (options.linterMode) {
                        const staticCallLen = 9; // 'static{;}'.length;
                        const content = (templateExpr as TemplateLiteral).quasis[0].value.raw;
                        (templateExpr as TemplateLiteral).quasis[0].value.raw = content.slice(7, -2);
                    }
                    const staticB = staticBlock([expressionStatement(templateExpr)]);
                    (path.node as any).replacedWith = staticB;
                    path.replaceWith(staticB);
                } else {
                    const templateExpr = buildTemplateCall(specifier, path, options);
                    templateExpr.loc = path.node.loc;
                    if (path.parent.type === 'Program' && !options.linterMode) {
                        const exportDefault = exportDefaultDeclaration(templateExpr);
                        (path.node as any).replacedWith = exportDefault;
                        path.replaceWith(exportDefault)
                        return
                    }
                    (path.node as any).replacedWith = templateExpr;
                    path.replaceWith(templateExpr);
                }
            }
        }
    }
}

type PreprocessOptions = {
    ast?: Node;
    input: string;
    templateTag?: string;
    relativePath: string;
    explicitMode?: boolean;
    linterMode?: boolean;
    babelPlugins?: ParserPlugin[];
    includeSourceMaps?: boolean | 'inline' | 'both';
    getTemplateLocals?: (html: string, options?: any) => string[]
}

type Replacement = {
    original: {
        loc: Required<SourceLocation>,
        range: [number, number],
        contentRange: [number, number],
    };
    replaced: {
        range: [number, number]
    }
}

function replaceRange(
    s: string,
    start: number,
    end: number,
    substitute: string
) {
    return s.substring(0, start) + substitute + s.substring(end);
}

export function transformForLint(options: PreprocessOptions) {
    options.linterMode = true;
    options.templateTag = options.templateTag || DEFAULT_PARSE_TEMPLATES_OPTIONS.templateTag;
    let { output, replacements, templateCallSpecifier } = doTransform(options);
    replacements = replacements || [];
    templateCallSpecifier = templateCallSpecifier || options.templateTag;
    return { output, replacements, templateCallSpecifier }
}

export function transform(options: PreprocessOptions) {
    options.templateTag = options.templateTag || DEFAULT_PARSE_TEMPLATES_OPTIONS.templateTag;
    const { output, map } = doTransform(options);
    return { output, map };

}

export function doTransform(options: PreprocessOptions) {

    const plugins = (['decorators', 'typescript', 'classProperties', 'classStaticBlock', 'classPrivateProperties'] as ParserPlugin[]).concat(options.babelPlugins || []);
    let ast = options.ast as any;
    if (!ast) {
        ast = parse(options.input, {
            ranges: true,
            tokens: true,
            templateTag: options.templateTag,
            plugins: plugins,
            allowImportExportEverywhere: true,
            errorRecovery: true,
        });
    }

    if (!(ast?.extra?.detectedTemplateNodes as any[])?.length) {
        return {
            output: options.input
        }
    }

    const pluginOptions: TransformOptions = {
        explicit: options.explicitMode ?? true,
        getTemplateLocals: options.getTemplateLocals || getTemplateLocals,
        moduleName: options.relativePath || '',
        linterMode: options.linterMode || false
    };

    const result = transformFromAstSync(ast!, options.input, {
        cloneInputAst: false,
        retainLines: options.linterMode,
        sourceMaps: options.includeSourceMaps === true ? 'both' : options.includeSourceMaps,
        plugins: ([[TemplateTransformPlugins, pluginOptions]] as any[])
    });

    if (options.linterMode) {
        let output = options.input;
        const replacements: Replacement[] = [];
        (ast?.extra?.detectedTemplateNodes as EmberNode[]).reverse().forEach((node: EmberNode) => {
            const code = generate((node as any).replacedWith, { compact: true, comments: false }).code;
            output = replaceRange(output, node.start!!, node.end!!, code);
            const end = node.start! + code.length;
            const range = [node.start, end] as [number, number];
            const diff = end - node.end!;
            replacements.forEach((r) => {
                r.replaced.range[0] += diff;
                r.replaced.range[1] += diff;
            })
            replacements.push({
                original: {
                    loc: node.loc!,
                    range: node.range!,
                    contentRange: node.contentNode.range!,
                },
                replaced: { range }
            });
        });
        return { output, replacements, templateCallSpecifier: ((ast as any).program as any).templateCallSpecifier }
    }

    return { output: result?.code, map: result?.map }
}
