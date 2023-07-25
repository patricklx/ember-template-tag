declare module 'parse-static-imports' {
  export interface Import {
    moduleName: string;
    starImport: string;
    namedImports: { name: string; alias: string }[];
    defaultImport: string;
    sideEffectOnly: boolean;
  }

  export default function parseStaticImports(code: string): Import[];
}


declare module '@babel/parser/lib/parser' {
  import { ParserOptions } from '@babel/parser';
  import { ClassBody, MemberExpression, Node, Program, } from '@babel/types';
  export default class Parser {
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
}

declare module '@babel/parser/lib/plugin-utils' {
  export const mixinPlugins: Record<string, Function>;
  export const mixinPluginNames: string[];
}