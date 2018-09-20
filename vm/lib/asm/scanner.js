/**
 * based on https://github.com/chain/txvm/blob/main/protocol/txvm/asm/scanner.go
 */

const { Macro } = require('./asm');

const Token_Illegal = 1;
const Token_Number = 2;
const Token_Ident = 3;
const Token_Hex = 4;
const Token_String = 5;
const Token_Colon = 6;
const Token_Comma = 7;
const Token_Comment = 8;
const Token_LeftBrace = 9;
const Token_RightBrace = 10;
const Token_LeftBracket = 11;
const Token_RightBracket = 12;
const Token_Label = 13;
const Token_JumpIf = 14;
const Token_Jump = 15;
const Token_EOF = 16;

class Scanner {
  constructor(src) {
    this.ch = null;
    this.offset = 0;
    this.rdOffset = 0;
    this.lineOffset = 0;
    this.errors = [];
    this.initString(src);
  }

  initString(s) {
    this.src = s;
    this.next();
  }

  next() {
    if(this.rdOffset < this.src.length) {
      this.offset = this.rdOffset
      if(this.ch == '\n') {
        this.lineOffset = this.offset
      }
      const r = this.src[this.rdOffset];
      this.rdOffset += 1;
      this.ch = r;
    } else {
      this.offset = this.src.length;
      if(this.ch == '\n') {
        this.lineOffset = this.offset;
      }
      this.ch = -1 // eof
    }
  }

  isLetter(ch) {
    return 'a' <= ch && ch <= 'z' || 'A' <= ch && ch <= 'Z' || ch == '_';
  }

  isDigit(ch) {
    return ('0' <= ch && ch <= '9');
  }

  scanNumber() {
    const offs = this.offset
    if(this.ch == '0') {
      this.next()
      if(this.isDigit(this.ch)) {
        this.error(offs, "illegal leading 0 in number")
      }
    } else {
      this.next()
      while (this.isDigit(this.ch)) {
        this.next()
      }
    }
    return this.src.slice(offs, this.offset);
  }

  scanIdentifier(offs) {
    while (this.isLetter(this.ch) || this.isDigit(this.ch)) {
      this.next()
    }
    return this.src.slice(offs, this.offset);
  }

  scanLabel() {
    const offs = this.offset - 1;
    const lit = this.scanIdentifier(offs)
    if(lit.length == 0) {
      this.error(offs, "empty label $")
    }
    return lit
  }

  skipWhitespace() {
    while(this.ch == ' ' || this.ch == '\t' || this.ch == '\n' || this.ch == '\r') {
      // console.log('skipWhitespace', this.ch)
      this.next();
    }
  }

  scanComment() {
    const offs = this.offset - 1;
    while(this.ch != '\n') {
      // console.log('scanComment', this.ch)
      this.next()
    }
    return this.src.slice(offs, this.offset);
  }

  /**
   * scanString
   * @param {*} delim " or '
   */
  scanString(delim) {
    const offs = this.offset - 1
    while(1) {
      const ch = this.ch
      // console.log('scanString', this.ch)
      if(ch == '\n' || ch < 0) {
        this.error(offs, "string literal not terminated")
        break
      }
      this.next()
      if(ch == delim) {
        break
      }
      if(ch == '\\') {
        this.scanEscape(delim)
      }
    }
    return this.src.slice(offs, this.offset);
  }

  scanEscape(quote) {
    const offs = this.offset

    switch(this.ch) {
      case '\\':
      case quote:
        this.next()
        return true
      default:
        let msg = "unknown escape sequence"
        if(this.ch < 0) {
          msg = "escape sequence not terminated"
        }
        this.error(offs, msg)
        return false
    }
 
  }

  scanHex(offs) {
    const quote = this.ch;
    this.next()
    while(1) {
      const ch = this.ch
      if(ch < 0) {
        this.error(offs, "hex literal not terminated")
        break;
      }
      this.next()
      if(ch == quote) {
        break;
      }
    }
    return this.src.slice(offs, this.offset);
  }

  scan() {
    this.skipWhitespace();
    let pos = this.offset;
    let lit = this.src.slice(this.offset, this.rdOffset);
    let tok = null;
    const ch = this.ch;
    // console.log('scan', ch);
    
    if( ('0' <= ch && ch <= '9') || ch == '-' ) {
      tok = Token_Number;
      // console.log('scan', ch);
      lit = this.scanNumber();
    }else{
      this.next();
      switch (ch) {
        case -1:
          tok = Token_EOF;
          break;
        case '{':
          tok = Token_LeftBrace;
          break;
        case '}':
          tok = Token_RightBrace;
          break;
        case ',':
          tok = Token_Comma;
          break;
        case '[':
          tok = Token_LeftBracket;
          break;
        case ']':
          tok = Token_RightBracket;
          break;
        case '"', '\'':
          tok = Token_String;
          lit = this.scanString(ch)
          break;
        case '$':
          tok = Token_Label;
          lit = this.scanLabel()
          break;
        case '#':
          tok = Token_Comma;
          lit = this.scanComment()
          break;
        case ':':
          tok = Token_Colon;
          break;
        case 'x':
          if(this.ch == '\'' || this.ch == '"') {
            tok = Token_Hex;
            lit = this.scanHex(pos)
          } else {
            tok = Token_Ident;
            lit = this.scanIdentifier(pos)
          }
          break;
        default:
          if(this.isLetter(ch)) {
            tok = Token_Ident;
            lit = this.scanIdentifier(pos);

            if(lit == "jump" && this.ch == ':') {
              tok = tokJump
              lit = this.src.slice(pos, this.rdOffset);
              this.next()
            }else if(lit == "jumpif" && this.ch == ':') {
              tok = tokJumpIf
              lit = this.src.slice(pos, this.rdOffset);
              this.next()
            }
          } else {
            tok = Token_Illegal;
            lit = string(ch);
          }
      }
    }
    return [pos, tok, lit];
  }

  error(offs, msg) {
    this.errors.push(`asm: at ${offs} ${msg}`);
  }

}

module.exports = {
  Scanner,
  Token_Comma,
  Token_Comment,
  Token_Hex,
  Token_Label,
  Token_Ident,
  Token_Jump,
  Token_JumpIf,
  Token_LeftBrace,
  Token_RightBrace,
  Token_LeftBracket,
  Token_RightBracket,
  Token_Number,
  Token_String,
  Token_EOF
};
