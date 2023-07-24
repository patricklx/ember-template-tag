import parse, { EmberNode } from './template-parser';
import { DEFAULT_PARSE_TEMPLATES_OPTIONS } from './parse-templates';
import { PluginTarget, transformFromAstSync } from '@babel/core';
import * as b from '@babel/types';
import { ParserPlugin } from '@babel/parser';
import { NodePath } from '@babel/traverse';
import { getTemplateLocals } from '@glimmer/syntax';
import * as glimmer from '@glimmer/syntax';

type TransformOptions = {
    getTemplateLocals: typeof getTemplateLocals,
    explicit: boolean;
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
    let content = path.node.content;
    if ('trim' in path.node.tagProperties) {
        content = content.trim();
    }

    if ('minify' in path.node.tagProperties) {
        content = minify(content);
    }

    const locals = options.getTemplateLocals(content, { includeHtmlElements: true});
    const properties = locals.map(l => {
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

function buildTemplateCall(path: NodePath<EmberNode>, options: TransformOptions) {
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
    return b.callExpression(
        b.identifier('template'),
        [
            b.stringLiteral(path.node.content),
            optionsExpression
        ]
    )
}

function ensureImport(path: NodePath<EmberNode>) {
    const imp = b.importDeclaration([b.importSpecifier(b.identifier('template'), b.identifier('template'))], b.stringLiteral('@ember/template-compiler'))
    if (!path.state.addedImport) {
        path.state.addedImport = true;
        (path.state.program as b.Program).body.splice(0, 0, imp);
    }
}

const TemplateTransformPlugins: PluginTarget = (babel, options: TransformOptions) => {
    return {
        name: 'TemplateTransform',
        visitor: {
            Program(path: NodePath<b.Program>) {
                path.state = {};
                path.state.program = path.node;
            },
            // @ts-ignore
            EmberTemplate(path: NodePath<EmberNode>, pluginPass) {
                ensureImport(path);
                if (path.parent?.type === 'ClassBody') {
                    const node = path.parent as b.ClassBody
                    const templateExpr = buildTemplateCall(path, options);
                    (templateExpr as any).orginalNode = path.node;
                    let staticBlock = node.body.find(m => m.type === 'StaticBlock') as b.StaticBlock | null;
                    if (!staticBlock) {
                        staticBlock = b.staticBlock([])
                        node.body.push(staticBlock);
                    }
                    (templateExpr as any).orginalNode = path.node;
                    staticBlock.body.push(b.blockStatement([b.expressionStatement(templateExpr)]));
                    path.remove();
                } else {
                    const templateExpr = buildTemplateCall(path, options);
                    if (path.parent.type === 'Program') {
                        const exportDefault = b.exportDefaultDeclaration(templateExpr);
                        path.replaceWith(exportDefault)
                        return
                    }
                    path.replaceWith(templateExpr);
                }
            }
        }
    }
}

type PreprocessOptions = {
    ast?: b.Node;
    content: string;
    templateTag: string;
    relativePath: string;
    babelPlugins?: ParserPlugin[];
    includeSourceMaps?: boolean | 'inline';
    includeTemplateTokens?: boolean;
    getTemplateLocals?: (html: string, options?: any) => string[]
}

export function transform(options: PreprocessOptions) {

    const plugins = (['decorators', 'typescript', 'classProperties', 'classStaticBlock', 'classPrivateProperties'] as ParserPlugin[]).concat(options.babelPlugins || []);
    let ast = options.ast;
    if (options.content) {
        ast = parse(options.content, {
            ranges: true,
            templateTag: options.templateTag || DEFAULT_PARSE_TEMPLATES_OPTIONS.templateTag,
            plugins: plugins,
            allowImportExportEverywhere: true,
            errorRecovery: true,
        });
    }

    if (!(ast?.extra?.detectedTemplateNodes as any[])?.length) {
        return {
            output: options.content
        }
    }

    const pluginOptions: TransformOptions = {
        explicit: true,
        getTemplateLocals: options.getTemplateLocals || getTemplateLocals,
        moduleName: options.relativePath || ''
    }

    const result = transformFromAstSync(ast!, options.content, {
        cloneInputAst: false,
        sourceMaps: options.includeSourceMaps,
        plugins: ([[TemplateTransformPlugins, pluginOptions]] as any[]),
        parserOpts: {
            ranges: true,
            plugins
        }
    });
    return { output: result?.code, map: result?.map, ast: result?.ast }
}
