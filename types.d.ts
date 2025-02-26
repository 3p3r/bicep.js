import type Parser from "tree-sitter";

// todo
export function bicep2json(sourceCode: string): Promise<object>;
// https://github.com/tree-sitter-grammars/tree-sitter-bicep
export function treeSitterBicep(): Promise<Parser>;
