// auto generated


import { ParserOptions } from '@babel/parser';
import { ClassBody, MemberExpression, Node, Program, } from '@babel/types';
declare class Parser {
    input: string;
    state: {
        value: string;
        pos: number;
        lastTokEndLoc: any;
    };

    constructor(options: ParserOptions, input: string);

    startNode(): Node;
    finishNode(node: Node, type: string): Node;
    finishNodeAt(node: Node, type: string, loc: any): Node;
    finishToken(type: string, value: string): void;
    next(): void;
    parse(): Program;
    parseStatementLike(...args: any): Node;
    parseMaybeAssign(...args: any): Node;
    getTokenFromCode(code: number): void;
    parseClassMember(classBody: ClassBody, member: MemberExpression, state: any): Node;
}


declare const mixinPlugins: Record<string, Function>;

export {
    Parser,
    mixinPlugins,
}