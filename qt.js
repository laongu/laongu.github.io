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
        this.root = new TrieNode();        // Nút gốc của cây Trie
        this.namesDictionary = new Map();   // Từ điển cho các tên
        this.phienAmDictionary = new Map(); // Từ điển cho phụ âm
        this.cachedData = new Map();        // Cache dữ liệu từ tệp để tránh đọc lại nếu đã đọc rồi
    }

    // Phương thức đọc dữ liệu từ điển từ một tệp trực tuyến
    async readDictionaryFile(fileName, processLine) {
        try {
            if (this.cachedData.has(fileName)) {
                const cachedContent = this.cachedData.get(fileName);
                this.processLines(cachedContent, processLine);
            } else {
                const response = await fetch(fileName);         // Fetch dữ liệu từ tệp trực tuyến
                const fileContent = await response.text();      // Đọc nội dung tệp
                this.cachedData.set(fileName, fileContent);     // Lưu vào cache để sử dụng lại sau này
                this.processLines(fileContent, processLine);    // Xử lý từng dòng dữ liệu
            }
        } catch (error) {
            console.error('Error reading dictionary file:', error);
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
        // Tải từ điển tên
        const loadNames = this.readDictionaryFile('https://laongu.github.io/Names.txt', (key, value) => {
            this.namesDictionary.set(key, value);
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

    // Phương thức dịch một đoạn văn bản từ tiếng Trung sang tiếng Việt
    translate(text) {
        // Chuyển đổi dấu câu Trung Quốc sang chữ La-tinh
        const convertPunctuation = this.convertChinesePunctuationToLatin(text);
        // Phân tách văn bản thành các từ và dịch chúng
        const splitText = this.splitTextWithTrie(convertPunctuation);
        // Dịch từng từ và lọc bỏ một số từ không cần thiết
        const translations = splitText.map(word => {
            const translatedName = this.namesDictionary.get(word);
            if (translatedName !== undefined) {
                // Nếu có nhiều nghĩa, lấy nghĩa đầu tiên
                const firstMeaning = translatedName.split('/')[0];
                return firstMeaning;
            } else {
                const searchResult = this.search(word);
                return searchResult ? searchResult.split('/')[0] : word;
            }
        }).filter(word => word !== '的' && word !== '了' && word !== '著')
          .map(word => this.phienAmDictionary.get(word) || word);

        // Xử lý văn bản và trả về kết quả dịch
        return this.processText(translations.join(' '));
    }

    // Phương thức phân tách văn bản thành các từ sử dụng cây Trie
    splitTextWithTrie(text) {
        const output = [];
        let currentIndex = 0;
        const trieRoot = this.root;
        let tempString = '';

        // Duyệt qua từng ký tự trong văn bản
        while (currentIndex < text.length) {
            let currentNode = trieRoot;
            let lastFoundIndex = -1;

            // Duyệt qua các ký tự từ vị trí hiện tại đến hết văn bản
            for (let i = currentIndex; i < text.length; i++) {
                const char = text[i];
                if (currentNode.children.has(char)) {
                    currentNode = currentNode.children.get(char);
                    if (currentNode.isEndOfWord) {
                        lastFoundIndex = i;
                    }
                } else {
                    break;
                }
            }

            // Nếu có từ được tìm thấy
            if (lastFoundIndex !== -1) {
                if (tempString !== '') {
                    output.push(tempString);
                    tempString = '';
                }
                output.push(text.substring(currentIndex, lastFoundIndex + 1));
                currentIndex = lastFoundIndex + 1;
            } else {
                // Nếu là ký tự Trung Quốc, thêm vào đầu ra; nếu không, thêm vào một chuỗi tạm thời
                if (this.isChineseCharacter(text[currentIndex])) {
                    output.push(text[currentIndex]);
                } else {
                    tempString += text[currentIndex];
                }
                currentIndex++;
            }
        }

        // Nếu chuỗi tạm thời không rỗng, thêm vào đầu ra
        if (tempString !== '') {
            output.push(tempString);
        }

        // Trả về mảng các từ đã phân tách
        return output;
    }

    // Phương thức kiểm tra xem một ký tự có phải là ký tự Trung Quốc hay không
    isChineseCharacter(char) {
        const charCode = char.charCodeAt(0);
        return charCode >= 0x4E00 && charCode <= 0x9FFF;
    }

    // Phương thức chuyển đổi dấu câu Trung Quốc sang chữ La-tinh
    convertChinesePunctuationToLatin(text) {
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
    processText(input) {
        // Các biểu thức chính quy để xử lý văn bản
        const trimSpacesBefore = / +([,.?!\]\>”’):])/g;
        const trimSpacesAfter = /([<\[“‘(]) +/g;
        const capitalizeRegex = /(^\s*|[.!?“‘”’\[-]\s*)(\p{Ll})/gu;
        const trimMultipleSpaces = / +/g;

        // Tách văn bản thành các dòng và loại bỏ khoảng trắng thừa
        const lines = input.split('\n');
        const processedLines = lines.map(line => line.trim());

        // Loại bỏ khoảng trắng thừa trước và sau dấu câu, chuyển đổi chữ in hoa
        const trimmedStr1 = processedLines.join('\n').replace(trimSpacesBefore, '$1');
        const trimmedStr2 = trimmedStr1.replace(trimSpacesAfter, '$1');

        // Chuyển đổi chữ in hoa ở đầu mỗi câu
        const processedText = trimmedStr2.replace(capitalizeRegex, (_, p1, p2) => p1 + p2.toUpperCase());

        // Loại bỏ các dấu câu đặc biệt và thay thế nhiều khoảng trắng bằng một khoảng trắng
        const finalResult = processedText.replace(/[“‘”’]/g, '"').replace(trimMultipleSpaces, ' ');

        // Trả về văn bản đã xử lý
        return finalResult;
    }

    // Phương thức khởi tạo: Tải toàn bộ từ điển khi khởi tạo đối tượng
    async initialize() {
        await this.loadDictionaries();
    }
}

// Hàm tự gọi khởi tạo đối tượng Dictionary và thực hiện dịch văn bản
/*
(async () => {
    const dictionary = new Dictionary();
    await dictionary.initialize(); // Tải toàn bộ từ điển

    const inputText = '老五真帅气';
    const translatedText = dictionary.translate(inputText); // Dịch văn bản
    console.log(translatedText); // In kết quả dịch ra console
})();
*/