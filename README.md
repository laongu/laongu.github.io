# laongu.github.io
Dịch tiếng trung
```typescript
// thêm Names tại đây
const names = `
李奥=Lý Áo
江离=Giang Ly
`;
// Ghi đè hàm init
Dictionary.prototype.init = async function() {
  // Thêm dữ liệu từ names vào cây Trie
  this.processLines(names, (key, value) => {
      this.insert(key, value);
  });

  // Thêm dữ liệu từ các nguồn khác nhau vào cây Trie
  await this.loadDictionaries();
};

const dictionary = new Dictionary();
await dictionary.init();
```
