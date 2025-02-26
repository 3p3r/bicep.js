# bicep.js

Utilities to work with Bicep files in JavaScript

```typescript
const { bicep2json, treeSitterBicep } = require('bicep.js');
const bicepSrc = 'param location string = resourceGroup().location';
bicep2json(bicepSrc).then(console.log);
// https://github.com/tree-sitter-grammars/tree-sitter-bicep
treeSitterBicep().then((parser) => {
  const tree = parser.parse(bicepSrc);
  console.log(tree.rootNode.toString());
});
```
