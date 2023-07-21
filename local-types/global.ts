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
    };

    constructor(options: ParserOptions, input: string)

    startNode(): Node
    finishNode(node: Node, type: string): Node
    next(): void;
    parse(): Program;
    parseStatementLike(...args: any): Node;
    parseMaybeAssign(...args: any): Node;
    parseClassMember(classBody: ClassBody, member: MemberExpression, state: any): Node;
  }
}