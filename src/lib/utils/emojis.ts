const emojifyNumberStr = (numberStr: string) => {
  switch (numberStr) {
    case '0':
      return '0️⃣';
    case '1':
      return '1️⃣';
    case '2':
      return '2️⃣';
    case '3':
      return '3️⃣';
    case '4':
      return '4️⃣';
    case '5':
      return '5️⃣';
    case '6':
      return '6️⃣';
    case '7':
      return '7️⃣';
    case '8':
      return '8️⃣';
    case '9':
      return '9️⃣';
    default:
      return numberStr.toString();
  }
};

const emojify = (input: string | number) => {
  const stringified = input.toString();
  return stringified
    .split('')
    .map((char) => emojifyNumberStr(char))
    .join('');
};

export class EmojiUtils {
  static readonly emojify = emojify;
  static readonly emojifyNumberStr = emojifyNumberStr;
}
