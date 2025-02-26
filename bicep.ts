/// <reference path="./types.d.ts" />

import assert from "assert";
import atob from "atob-lite";
import memoize from "lodash/memoize";
import type Parser from "tree-sitter";
import type { SyntaxNode } from "tree-sitter";

import * as _TreeSitter from "./tree-sitter";

// @ts-expect-error - handled by webpack loader
import TREE_SITTER_WASM_BASE64 from "./tree-sitter.wasm";
// @ts-expect-error - handled by webpack loader
import TREE_SITTER_BICEP_WASM_BASE64 from "./tree-sitter-bicep.wasm";

function decodeWasmFromBase64String(encoded: string) {
  const binaryString = atob(encoded);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export const treeSitterBicep = memoize(async (): Promise<Parser> => {
  // const wasmBinary1 = await fs.promises.readFile(path.join(__dirname, "tree-sitter.wasm"));
  const wasmBinary1 = decodeWasmFromBase64String(TREE_SITTER_WASM_BASE64);
  // @ts-expect-error - web-tree-sitter types are broken
  await _TreeSitter.default.init({ wasmBinary: wasmBinary1 });
  // const wasmBinary2 = await fs.promises.readFile(path.join(__dirname, "tree-sitter-bicep.wasm"));
  const wasmBinary2 = decodeWasmFromBase64String(TREE_SITTER_BICEP_WASM_BASE64);
  // @ts-expect-error - web-tree-sitter types are broken
  const BICEP = await _TreeSitter.default.Language.load(Buffer.from(wasmBinary2));
  // @ts-expect-error - web-tree-sitter types are broken
  const _parser = new _TreeSitter.default();
  _parser.setLanguage(BICEP);
  return _parser;
});

function wrapAsIntrinsic(node: SyntaxNode): string {
  return `"\${${node.text}}"`;
}

function removeTrailingComma(fragments: string[]): void {
  if (fragments.length > 0) {
    const last = fragments[fragments.length - 1];
    fragments[fragments.length - 1] = last.replace(/,$/, "");
  }
}

function doubleQuoteEscape(str: string): string {
  return str.replace('"', '\\"').replace(/^'|'$/g, '"');
}

function emitInfrastructure(node: SyntaxNode): string {
  const fragments: string[] = [];
  fragments.push("{");
  const hasParameters = node.namedChildren.some((child) => child.type === "parameter_declaration");
  const hasResources = node.namedChildren.some((child) => child.type === "resource_declaration");
  const hasOutputs = node.namedChildren.some((child) => child.type === "output_declaration");
  if (hasParameters) {
    fragments.push('"parameters":{');
    for (const child of node.namedChildren.filter((child) => child.type === "parameter_declaration")) {
      const identifierNode = child.namedChild(0);
      assert(identifierNode, "missing identifier node in parameter_declaration");
      const identifier = emitIdentifier(identifierNode);
      const typeNode = child.namedChild(1);
      assert(typeNode, "missing type node in parameter_declaration");
      const type = codegen(typeNode);
      const valueNode = child.namedChild(2);
      assert(valueNode, "missing value node in parameter_declaration");
      const value = codegen(valueNode);
      fragments.push(`${identifier}:{"type":${type},"value":${value}},`);
    }
    removeTrailingComma(fragments);
    fragments.push("}");
  }
  if (hasResources) {
    if (hasParameters) {
      fragments.push(",");
    }
    fragments.push('"resources":{');
    for (const child of node.namedChildren.filter((child) => child.type === "resource_declaration")) {
      const identifierNode = child.namedChild(0);
      assert(identifierNode, "missing identifier node in resource_declaration");
      const identifier = emitIdentifier(identifierNode);
      const typeNode = child.namedChild(1);
      assert(typeNode, "missing type node in resource_declaration");
      const type = codegen(typeNode);
      const configurationNode = child.namedChild(2);
      assert(configurationNode, "missing value node in resource_declaration");
      const configuration = codegen(configurationNode);
      fragments.push(`${identifier}:{"type":${type},"configuration":${configuration}},`);
    }
    removeTrailingComma(fragments);
    fragments.push("}");
  }
  if (hasOutputs) {
    if (hasParameters || hasResources) {
      fragments.push(",");
    }
    fragments.push('"outputs":{');
    for (const child of node.namedChildren.filter((child) => child.type === "output_declaration")) {
      const identifierNode = child.namedChild(0);
      assert(identifierNode, "missing identifier node in output_declaration");
      const identifier = emitIdentifier(identifierNode);
      const typeNode = child.namedChild(1);
      assert(typeNode, "missing type node in output_declaration");
      const type = codegen(typeNode);
      const valueNode = child.namedChild(2);
      assert(valueNode, "missing value node in output_declaration");
      const value = codegen(valueNode);
      fragments.push(`${identifier}:{"type":${type},"value":${value}},`);
    }
    removeTrailingComma(fragments);
    fragments.push("}");
  }
  fragments.push("}");
  return fragments.join("");
}

function emitIdentifier(node: SyntaxNode): string {
  return JSON.stringify(node.text);
}

function emitPrimitiveType(node: SyntaxNode): string {
  return emitIdentifier(node);
}

function emitType(node: SyntaxNode): string {
  const typeNode = node.namedChild(0);
  assert(typeNode, `missing type node in ${node.text}`);
  return codegen(typeNode);
}

function emitMemberExpression(node: SyntaxNode): string {
  return wrapAsIntrinsic(node);
}

function emitCallExpression(node: SyntaxNode): string {
  return wrapAsIntrinsic(node);
}

function emitObject(node: SyntaxNode): string {
  const fragments: string[] = [];
  fragments.push("{");
  for (const child of node.namedChildren) {
    const keyNode = child.namedChild(0);
    assert(keyNode, "missing key node in object");
    const key = emitIdentifier(keyNode);
    const valueNode = child.namedChild(1);
    assert(valueNode, "missing value node in object");
    const value = codegen(valueNode);
    fragments.push(`${key}:${value},`);
  }
  removeTrailingComma(fragments);
  fragments.push("}");
  return fragments.join("");
}

function emitLiteral(node: SyntaxNode): string {
  return doubleQuoteEscape(node.text);
}

function emitArray(node: SyntaxNode): string {
  const fragments: string[] = [];
  fragments.push("[");
  for (const child of node.namedChildren) {
    const value = codegen(child);
    fragments.push(`${value},`);
  }
  removeTrailingComma(fragments);
  fragments.push("]");
  return fragments.join("");
}

// converts Bicep to JSON string
export function codegen(node: SyntaxNode): string {
  switch (node.type) {
    case "number":
    case "string":
    case "boolean":
    case "null":
      return emitLiteral(node);
    case "array":
      return emitArray(node);
    case "object_property":
      return emitIdentifier(node);
    case "object":
      return emitObject(node);
    case "call_expression":
      return emitCallExpression(node);
    case "member_expression":
      return emitMemberExpression(node);
    case "primitive_type":
      return emitPrimitiveType(node);
    case "type":
      return emitType(node);
    case "identifier":
      return emitIdentifier(node);
    case "infrastructure":
      return emitInfrastructure(node);
    case "comment":
    case "diagnostic_comment":
      return "";
    default:
      console.error(`missing bicep node in codegen >>> ${node.type}`);
      return "";
  }
}

export async function bicep2json(sourceCode: string): Promise<object> {
  const parser = await treeSitterBicep();
  const tree = parser.parse(sourceCode);
  const root = tree.rootNode;
  return JSON.parse(codegen(root));
}
