const fs = require('fs');

const inputFile = 'Names.txt';
const outputFile = 'NamesFix.txt';
const racFile = 'Rac.txt';

fs.readFile(inputFile, 'utf8', (err, data) => {
  if (err) {
    console.error('Lỗi khi đọc tập tin:', err);
    return;
  }

  const lines = data.split('\n');
  const validLines = [];
  const racLines = [];
  const keyMap = {};

  lines.forEach((line, lineNumber) => {
    if (line.trim() === '') {
      return;
    }

    if (line.includes('=')) {
      const [key, value] = line.split('=');

      const trimmedKey = key.trim();
      const trimmedValue = value.trim();

      // Thay thế dấu | bằng /
      const modifiedValue = trimmedValue.replace(/\|/g, '/');

      if (trimmedKey === '') {
        console.warn(`Key không được rỗng (Dòng ${lineNumber + 1}): ${line}`);
        return;
      }

      if (modifiedValue === '') {
        racLines.push(`${trimmedKey}=${trimmedValue}`);
      } else {
        if (trimmedKey === modifiedValue) {
          console.warn(`Cặp key=value không hợp lệ (key giống value - Dòng ${lineNumber + 1}): ${line}`);
          return;
        }

        if (trimmedKey === modifiedValue.toLowerCase()) {
          console.warn(`Cặp key=value không hợp lệ (key là chữ thường giống value - Dòng ${lineNumber + 1}): ${line}`);
          return;
        }

        if (!keyMap[trimmedKey]) {
          keyMap[trimmedKey] = modifiedValue;
          validLines.push(`${trimmedKey}=${modifiedValue}`);
        }
      }
    } else {
      console.warn(`Dòng không chứa dấu '=' không hợp lệ (Dòng ${lineNumber + 1}): ${line}`);
    }
  });

  const outputData = validLines.join('\n');
  fs.writeFile(outputFile, outputData, 'utf8', err => {
    if (err) {
      console.error('Lỗi khi ghi tập tin VietPhraseFix.txt:', err);
      return;
    }
    console.log('Đã lưu vào VietPhraseFix.txt');
  });

  const racData = racLines.join('\n');
  fs.writeFile(racFile, racData, 'utf8', err => {
    if (err) {
      console.error('Lỗi khi ghi tập tin Rac.txt:', err);
      return;
    }
    console.log('Đã lưu vào Rac.txt');
  });
});
