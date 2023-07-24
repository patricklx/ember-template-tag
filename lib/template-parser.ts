import Parser from '@babel/parser/lib/parser';
import * as PluginUtils from '@babel/parser/lib/plugin-utils';
import { ClassBody, MemberExpression, Node, Program } from '@babel/types';
import { ParserOptions } from '@babel/parser';

export type EmberNode = Node & {
    tagName: string;
    content: string;
    tagProperties: Record<string, string|undefined>;
    startRange: [number, number];
    endRange: [number, number];
    contentRange: [number, number];
};


export default function parse(input: string, options: ParserOptions & { templateTag?: string }) {
    const parser = createParser(options, input);
    return parser.parse();
}


export function createParser(options: ParserOptions & { templateTag?: string }, input: string) {
    let cls = Parser
    options.plugins?.forEach((name) => {
        cls = PluginUtils.mixinPlugins[name as string]?.(cls) || cls
    });
    cls = getParser(cls);
    return new cls(options, input);
}


export function getParser(superclass = Parser) {
    return class TemplateParser extends superclass {
        isInsideTemplate = false;
        templateTag?: string;
        detectedTemplateNodes: EmberNode[] = [];

        constructor(options: ParserOptions & { templateTag?: string }, input: string) {
            super(options, input);
            this.templateTag = options.templateTag
        }

        parseEmberTemplate(...args: any) {
            const templateTag = this.templateTag;
            let openTemplates = 0;
            const contentRange = [0, 0] as [number, number];
            if (
                templateTag &&
                this.state.value === '<' &&
                this.input.slice(this.state.pos).startsWith(templateTag)
            ) {
                const node = this.startNode() as EmberNode;
                this.isInsideTemplate = true;
                node.tagName = templateTag;
                openTemplates += 1;
                node.startRange = [this.state.pos - 1, this.state.pos];
                let value = this.state.value;
                while (value !== '>') {
                    this.next();
                    value = this.state.value;
                }
                const properties = this.input.slice(node.startRange[0], this.state.pos - 1).split(' ').slice(1).filter(x => !!x).map(p => p.split('='));
                node.tagProperties = {};
                properties.forEach((p) => {
                    node.tagProperties[p[0]] = p.slice(1).length ? p.slice(1).join('=') : undefined
                });
                node.startRange[1] = this.state.pos;
                contentRange[0] = this.state.pos;
                while (openTemplates) {
                    if (
                        this.state.value === '<' &&
                        this.input.slice(this.state.pos).startsWith(templateTag)
                    ) {
                        openTemplates += 1;
                    }

                    if (
                        this.state.value === '<' &&
                        this.input.slice(this.state.pos).startsWith(`/${templateTag}>`)
                    ) {
                        node.endRange = [this.state.pos - 1, this.state.pos];
                        openTemplates -= 1;
                        if (openTemplates === 0) {
                            contentRange[1] = this.state.pos - 1;
                            value = this.state.value;
                            while (value !== '>') {
                                this.next();
                                value = this.state.value;
                            }
                            node.endRange[1] = this.state.pos;
                            node.content = this.input.slice(...contentRange);
                            node.contentRange = contentRange;
                            this.isInsideTemplate = false;
                            this.next();
                            this.detectedTemplateNodes.push(node);
                            return this.finishNode(node, 'EmberTemplate');
                        }
                    }
                    this.next();
                }
            }
            return null;
        }

        isAlphaNumeric(code: number) {
            if (!(code > 47 && code < 58) && // numeric (0-9)
                !(code > 64 && code < 91) && // upper alpha (A-Z)
                !(code > 96 && code < 123)) { // lower alpha (a-z)
                return false;
            }
            return true;
        };

        getTokenFromCode(code: number) {
            if (this.isInsideTemplate) {
                if (!this.isAlphaNumeric(code)) {
                    ++this.state.pos;
                    this.finishToken(code.toString(), String.fromCharCode(code));
                    return
                }
            }
            return super.getTokenFromCode(code);
        }

        parseStatementLike(...args: any) {
            return this.parseEmberTemplate() ?? super.parseStatementLike(...args);
        }

        parseMaybeAssign(...args: any) {
            return this.parseEmberTemplate() ?? super.parseMaybeAssign(...args);
        }

        parseClassMember(classBody: ClassBody, member: MemberExpression, state:any) {
            const node = this.parseEmberTemplate();
            if (node) {
                classBody.body.push(node as any);
                return node;
            }
            return super.parseClassMember(classBody, member, state);
        }

        parse(): Program {
            const node = super.parse();
            node.extra = {
                detectedTemplateNodes: this.detectedTemplateNodes
            };
            return node;
        }
    }
}