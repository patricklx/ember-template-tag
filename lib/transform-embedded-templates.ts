import parse, { EmberNode } from './template-parser';
import { DEFAULT_PARSE_TEMPLATES_OPTIONS } from './parse-templates';
import { PluginOptions, PluginTarget, transformFromAstSync } from '@babel/core';
import * as b from '@babel/types';
import { ParserPlugin } from '@babel/parser';
import { NodePath } from '@babel/traverse';
import { generate } from '@babel/generate';
import { getTemplateLocals } from '@glimmer/syntax';
import * as glimmer from '@glimmer/syntax';
import { SourceLocation } from '@babel/types';

type TransformOptions = {
    getTemplateLocals: typeof getTemplateLocals,
    explicit: boolean;
    linterMode: boolean;
    moduleName: string;
}

b.TYPES.push('EmberTemplate');

function minify(htmlContent: string) {
    const ast = glimmer.preprocess(htmlContent, {mode: 'codemod'});
    glimmer.traverse(ast, {
        TextNode(node) {
            node.chars = node.chars.replace(/ {2,}/g, ' ').replace(/[\r\n\t\f\v]/g, '');
        }
    });
    return glimmer.print(ast);
}

function buildScope(path: NodePath<EmberNode>, options: TransformOptions) {
    const locals = options.getTemplateLocals(path.node.contentNode.value);
    const localsWithtemplateTags = options.getTemplateLocals(path.node.contentNode.value, { includeHtmlElements: true });
    const templateTags = localsWithtemplateTags.filter(l => !locals.includes(l) && path.scope.hasBinding(l));
    const all = [...locals, ...templateTags];
    const properties = all.map(l => {
        const id = l.split('.')[0];
        return b.objectProperty(b.identifier(id), b.identifier(id), false, true);
    })
    const arrow = b.arrowFunctionExpression([b.identifier('instance')], b.blockStatement([
        b.returnStatement(b.objectExpression(properties))
    ]));
    return b.objectProperty(b.identifier('scope'), arrow);
}

function buildEval() {
    return  b.objectMethod('method', b.identifier('eval'), [], b.blockStatement([
        b.returnStatement(b.callExpression(b.identifier('eval'), [b.memberExpression(b.identifier('arguments'), b.numericLiteral(0), true)]))
    ]));
}

function buildTemplateCall(identifier: string,path: NodePath<EmberNode>, options: TransformOptions) {
    let optionsExpression: b.ObjectExpression;
    const explicit = options.explicit;
    const property = explicit ? buildScope(path, options) : buildEval();
    const isInClass = path.parent?.type === 'ClassBody';
    if (isInClass) {
        optionsExpression = b.objectExpression([
            b.objectProperty(b.identifier('component'), b.identifier('this')),
            b.objectProperty(b.identifier('moduleName'), b.stringLiteral(options.moduleName)),
            property
        ]);
    } else {
        optionsExpression = b.objectExpression([
            b.objectProperty(b.identifier('moduleName'), b.stringLiteral(options.moduleName)),
            property
        ])
    }
    let content = path.node.contentNode.value;
    if ('trim' in path.node.tagProperties) {
        content = content.trim();
    }

    if ('minify' in path.node.tagProperties) {
        content = minify(content);
    }
    const stringLiteral = b.stringLiteral(content);
    stringLiteral.loc = path.node.contentNode.loc;
    const callId = b.identifier(identifier);
    path.state.calls.push(callId);
    return b.callExpression(
        callId,
        [
            stringLiteral,
            optionsExpression
        ]
    )
}

function ensureImport(path: NodePath<EmberNode>, options: TransformOptions) {
    let templateCallSpecifier = path.state.templateCallSpecifier || 'template';
    if (options.linterMode) {
        return templateCallSpecifier
    }
    let counter = path.state.templateCallSpecifierCounter || 1;
    while (path.scope.hasBinding(templateCallSpecifier)) {
        templateCallSpecifier = 'template' + counter;
        counter++;
    }
    if (path.state.addedImport && templateCallSpecifier !== path.state.templateCallSpecifier) {
        path.state.addedImport.name = templateCallSpecifier;
        path.state.calls.forEach((c: any) => {
            c.name = templateCallSpecifier;
        })
    }
    const id = b.identifier(templateCallSpecifier);
    const imp = b.importDeclaration([b.importSpecifier(id, b.identifier('template'))], b.stringLiteral('@ember/template-compiler'));
    if (!path.state.addedImport) {
        path.state.addedImport = id;
        (path.state.program as NodePath<b.Program>).node.body.splice(0, 0, imp);
        path.state.progra = (path.state.program as NodePath<b.Program>).replaceWith(path.state.program);
    }
    path.state.templateCallSpecifier = templateCallSpecifier;
    path.state.templateCallSpecifierCounter = counter;
    return path.state.templateCallSpecifier;
}

const TemplateTransformPlugins: PluginTarget = (babel, options: TransformOptions) => {
    return {
        name: 'TemplateTransform',
        visitor: {
            Program(path: NodePath<b.Program>) {
                path.state = {};
                path.state.program = path;
                path.state.calls = [];
            },
            // @ts-ignore
            EmberTemplate(path: NodePath<EmberNode>, pluginPass) {
                const specifier = ensureImport(path, options);
                if (path.parent?.type === 'ClassBody') {
                    const node = path.parent as b.ClassBody
                    const templateExpr = buildTemplateCall(specifier, path, options);
                    templateExpr.loc = path.node.loc;
                    const staticBlock = b.staticBlock([b.blockStatement([b.expressionStatement(templateExpr)])]);
                    (path.node as any).replacedWith = staticBlock;
                    path.replaceWith(staticBlock);
                } else {
                    const templateExpr = buildTemplateCall(specifier, path, options);
                    templateExpr.loc = path.node.loc;
                    if (path.parent.type === 'Program' && !options.linterMode) {
                        const exportDefault = b.exportDefaultDeclaration(templateExpr);
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
    ast?: b.Node;
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
        loc: Required<b.SourceLocation>,
        range: [number, number],
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

export function transform(options: PreprocessOptions) {

    const plugins = (['decorators', 'typescript', 'classProperties', 'classStaticBlock', 'classPrivateProperties'] as ParserPlugin[]).concat(options.babelPlugins || []);
    let ast = options.ast;
    if (options.input) {
        ast = parse(options.input, {
            ranges: true,
            tokens: true,
            templateTag: options.templateTag || DEFAULT_PARSE_TEMPLATES_OPTIONS.templateTag,
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
            const code = generate((node as any).replacedWith).code;
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
                    range: node.range!
                },
                replaced: { range }
            });
        });
        return { output, replacements }
    }

    return { output: result?.code, map: result?.map }
}
