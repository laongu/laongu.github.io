// Định nghĩa một nút trong cây Trie
class TrieNode {
    constructor() {
        this.children = new Map();  // Danh sách con của nút (Map để lưu trữ key-value)
        this.isEndOfWord = false;   // Đánh dấu xem đây có phải là nút lá của một từ không
        this.translation = null;    // Dịch của từ nếu đây là nút lá
    }
}

// Lớp Dictionary quản lý các từ điển và thực hiện chức năng dịch
class Dictionary {
    constructor() {
        this.root = new TrieNode();         // Nút gốc của cây Trie
        this.phienAmDictionary = new Map(); // Từ điển cho phụ âm
        this.cachedData = new Map();        // Cache dữ liệu từ tệp để tránh đọc lại nếu đã đọc rồi
    }

    // Phương thức thêm một từ vào cây Trie
    insert(key, value) {
        let node = this.root;
        for (const char of key) {
            node.children.set(char, node.children.get(char) || new TrieNode());
            node = node.children.get(char);
        }
        node.isEndOfWord = true;
        node.translation = value;
    }

    // Phương thức tìm kiếm một từ trong cây Trie
    search(key) {
        let node = this.root;
        for (const char of key) {
            node = node.children.get(char);
            if (!node) return null;
        }
        return node.isEndOfWord ? node.translation : null;
    }

    // Phương thức đọc dữ liệu từ điển từ một tệp trực tuyến
    async readDictionaryFile(fileName, processLine) {
        try {
            if (this.cachedData.has(fileName)) {
                const cachedContent = this.cachedData.get(fileName);
                this.processLines(cachedContent, processLine);
            } else {
                const response = await fetch(fileName);
                const reader = response.body.getReader(); // Sử dụng stream reader
                let fileContent = '';

                while (true) {
                    const { done, value } = await reader.read();

                    if (done) {
                        break;
                    }

                    fileContent += new TextDecoder().decode(value);
                }

                this.cachedData.set(fileName, fileContent);
                this.processLines(fileContent, processLine);
            }
        } catch (error) {
            console.error('Lỗi đọc file từ điển:', error);
        }
    }

    // Phương thức xử lý từng dòng dữ liệu từ điển
    processLines(content, processLine) {
        const lines = content.split('\n');
        for (const line of lines) {
            const [key, value] = line.split('=').map(item => item.trim());
            processLine(key, value);
        }
    }

    // Phương thức tải toàn bộ từ điển từ các nguồn khác nhau
    async loadDictionaries() {
        // Tải từ điển Names
        const loadNames = this.readDictionaryFile('https://laongu.github.io/Names.txt', (key, value) => {
            this.insert(key, value);
        });

        // Tải từ điển Việt-Trung
        const loadVietPhrase = this.readDictionaryFile('https://laongu.github.io/VietPhrase.txt', (key, value) => {
            this.insert(key, value);
        });

        // Tải từ điển phụ âm tiếng Trung
        const loadChinesePhienAm = this.readDictionaryFile('https://laongu.github.io/ChinesePhienAmWords.txt', (key, value) => {
            this.phienAmDictionary.set(key, value);
        });

        // Đợi cho đến khi tất cả các từ điển đã được tải xong
        await Promise.all([loadNames, loadVietPhrase, loadChinesePhienAm]);
    }

    /**
     * Phương thức dịch một đoạn văn bản từ tiếng Trung sang tiếng Việt.
     * @param {string} text - Đoạn văn bản cần dịch.
     * @returns {string} - Kết quả dịch.
     */
    translate(text) {
        // Bước 1: Chuyển đổi dấu câu Trung Quốc sang chữ La-tinh
        const convertPunctuation = this.convertPunctuation(text);

        // Bước 2: Phân tách văn bản thành các từ và lọc bỏ từ không cần thiết
        const splitText = this.tokenize(convertPunctuation)
            .filter(word => word !== '的' && word !== '了' && word !== '著');

        // Bước 3: Dịch từng từ và lọc bỏ một số từ không cần thiết
        const translations = splitText.map(word => {
            const searchResult = this.search(word);
            return searchResult ? searchResult.split('/')[0] : word;
        })
        .map(word => this.phienAmDictionary.get(word) || word);

        // Bước 4: Xử lý văn bản và trả về kết quả dịch
        return this.processText(translations.join(' '));
    }

    /**
     * Tách văn bản thành các từ sử dụng một trie.
     * @param {string} text - Văn bản cần tách.
     * @returns {string[]} - Mảng chứa các từ đã tách.
     */
    tokenize(text) {
      const output = [];         // Mảng chứa kết quả sau khi tách
      let currentIndex = 0;      // Vị trí hiện tại trong văn bản

      while (currentIndex < text.length) {
        let currentNode = this.root;  // Bắt đầu từ nút gốc của trie
        let lastFoundIndex = -1;      // Vị trí cuối cùng của từ đã tìm thấy

        // Duyệt qua văn bản từ vị trí hiện tại
        for (let i = currentIndex; i < text.length; i++) {
          const char = text[i];

          // Kiểm tra xem ký tự có trong trie không
          if (currentNode.children.has(char)) {
            currentNode = currentNode.children.get(char);

            // Nếu đến cuối của một từ trong trie, lưu lại vị trí
            if (currentNode.isEndOfWord) {
              lastFoundIndex = i;
            }
          } else {
            break;
          }
        }

        // Nếu tìm thấy từ trong trie
        if (lastFoundIndex !== -1) {
          // Thêm từ đã tìm thấy vào mảng kết quả
          output.push(text.slice(currentIndex, lastFoundIndex + 1));

          // Cập nhật vị trí hiện tại
          currentIndex = lastFoundIndex + 1;
        } else {
          // Nếu là ký tự Trung Quốc
          if (this.isChineseCharacter(text[currentIndex])) {
            output.push(text[currentIndex]);
            currentIndex++;
          } else {
            // Nếu không phải ký tự Trung Quốc và không có từ trong trie, ghép từ vào một biến tạm thời
            let nonChineseWord = text[currentIndex];

            // Lặp để ghép những từ liên tiếp không phải ký tự Trung Quốc
            while (currentIndex + 1 < text.length && !this.isChineseCharacter(text[currentIndex + 1])) {
              currentIndex++;
              nonChineseWord += text[currentIndex];
            }

            // Thêm chuỗi từ không phải ký tự Trung Quốc vào kết quả
            output.push(nonChineseWord);

            // Cập nhật vị trí hiện tại
            currentIndex++;
          }
        }
      }

      return output;
    }

    // Phương thức kiểm tra xem một ký tự có phải là ký tự Trung Quốc hay không
    isChineseCharacter(char) {
        const charCode = char.charCodeAt(0);
        return charCode >= 0x4E00 && charCode <= 0x9FFF || char === '\n';
    }

    // Phương thức chuyển đổi dấu câu Trung Quốc sang chữ La-tinh
    convertPunctuation(text) {
        const mapping = {
            '。': '. ', '，': ', ', '、': ', ', '；': ';', '！': '!', '？': '?',
            '：': ': ', '（': '(', '）': ')', '〔': '[', '〕': ']', '【': '[',
            '】': ']', '《': '<', '》': '>', '｛': '{', '｝': '}', '『': '[',
            '』': ']', '〈': '<', '〉': '>', '～': '~', '—': '-', '…': '...',
            '〖': '[', '〗': ']', '〘': '[', '〙': ']', '〚': '[', '〛': ']', '　': ' '
        };

        // Chuyển đổi từng ký tự trong văn bản dựa trên bảng ánh xạ
        return text.split('').map(char => mapping[char] || char).join('');
    }

    // Phương thức xử lý văn bản (loại bỏ khoảng trắng thừa, chuyển đổi chữ in hoa, v.v.)
    processText(text) {
        const trimSpacesBefore = / +([,.?!\]\>”’):])/g;
        const trimSpacesAfter = /([<\[“‘(]) +/g;
        const capitalizeRegex = /(^\s*|[.!?“‘”’\[-]\s*)(\p{Ll})/gmu;
        const multipleSpaces = / +/g;

        const lines = text.split('\n').map(line => line.trim()).join('\n');
        const trimmedLines = lines.replace(trimSpacesBefore, '$1').replace(trimSpacesAfter, '$1');
        const processedText = trimmedLines.replace(capitalizeRegex, (_, p1, p2) => p1 + p2.toUpperCase());
        const finalResult = processedText.replace(/[“‘”’]/g, '"').replace(multipleSpaces, ' ');

        return finalResult;
    }

    // Phương thức khởi tạo: Tải toàn bộ từ điển khi khởi tạo đối tượng
    async init() {
        await this.loadDictionaries();
    }
}

/*
// Hàm tự gọi khởi tạo đối tượng Dictionary và thực hiện dịch văn bản
(async () => {
    const dictionary = new Dictionary();
    await dictionary.init(); // Tải toàn bộ từ điển

    const inputText = '老五真帅气';
    const translatedText = dictionary.translate(inputText); // Dịch văn bản
    console.log(translatedText); // In kết quả dịch ra console
})();
*/
