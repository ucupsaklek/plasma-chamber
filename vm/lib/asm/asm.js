/**
 * based on https://github.com/chain/txvm/blob/main/protocol/txvm/asm/asm.go
 */

const {
	Scanner,
	Token_Comma,
	Token_Comment,
	Token_Hex,
	Token_Ident,
	Token_Jump,
	Token_JumpIf,
	Token_Label,
  Token_LeftBrace,
	Token_RightBrace,
	Token_LeftBracket,
	Token_RightBracket,
	Token_Number,
	Token_String,
	Token_EOF
} = require('./scanner');
const { MinPushdata, MinSmallInt, MaxSmallInt } = require('../op');

const opcode = {
	"int": 0x20,
	"add": 0x21,
	"neg": 0x22,
	"mul": 0x23,
	"div": 0x24,
	"mod": 0x25,
	"gt": 0x26,
	"not": 0x27,
	"and": 0x28,
	"or": 0x29,
	"roll": 0x2a,
	"bury": 0x2b,
	"reverse": 0x2c,
	"get": 0x2d,
	"put": 0x2e,
	"depth": 0x2f,

	"nonce": 0x30,
	"merge": 0x31,
	"split": 0x32,
	"issue": 0x33,
	"retire": 0x34,
	"amount": 0x35,
	"assetid": 0x36,
	"anchor": 0x37,

	"vmhash": 0x38,
	"sha256": 0x39,
	"sha3": 0x3a,
	"checksig": 0x3b,

	"log": 0x3c,
	"peeklog": 0x3d,
	"txid": 0x3e,
	"finalize": 0x3f,

	"verify": 0x40,
	"jumpif": 0x41,
	"exec": 0x42,
	"call": 0x43,
	"yield": 0x44,
	"wrap": 0x45,
	"input": 0x46,
	"output": 0x47,
	"contract": 0x48,
	"seed": 0x49,
	"self": 0x4a,
	"caller": 0x4b,
	"contractprogram": 0x4c,
	"timerange": 0x4d,

	"prv": 0x4e,
	"ext": 0x4f,

	"eq": 0x50,
	"dup": 0x51,
	"drop": 0x52,
	"peek": 0x53,
	"tuple": 0x54,
	"untuple": 0x55,
	"len": 0x56,
	"field": 0x57,
	"encode": 0x58,
	"cat": 0x59,
	"slice": 0x5a,
	"bitnot": 0x5b,
	"bitand": 0x5c,
	"bitor": 0x5d,
	"bitxor": 0x5e
}

let composite = {}; // assembled macro array

class Jump {
  constructor() {
    this.label = null;
    this.isJumpIf = false;
    this.opcodes = [];
  }
}

const Macro = {
  "bool": "not not",
  "swap": "1 roll",
  "jump": "1 swap jumpif",
  "sub": "neg add",
  "splitzero": "0 split"
}

function assembleSource(src) {
	const scanner = new Scanner(src);
	return assembleScanner(scanner, Token_EOF);
}

function assembleScanner(scanner, stoptok) {
	const a = new Assembler(scanner, stoptok);
	a.assembleItems();
	return a.resolve();
}

class Assembler {

  constructor(scanner, stoptok) {
		this.scanner = scanner;
		this.stoptok = stoptok;
		this.buffer = Buffer.alloc(512);
		this.bufferOffset = 0;
		this.items = [];
	}

	getBuffer() {
		return this.buffer;
	}
	
	next() {
		const result = this.scanner.scan();
		this.off = result[0];
		this.tok = result[1];
		this.lit = result[2];
		while(this.tok == Token_Comment) {
			const result = this.scanner.scan();
			this.off = result[0];
			this.tok = result[1];
			this.lit = result[2];
			console.log(this.lit);
		}
		return this.tok;
	}
	
	assembleItems() {
		while(this.next() != this.stoptok) {
			switch(this.tok) {
				case Token_Label:
					this.flush();
					this.items.push(this.lit.slice(1));
					break;
				case Token_Jump:
				case Token_JumpIf:
					this.flush();
					// TODO
					break;
				case Token_Ident:
					if(Macro.hasOwnProperty(this.lit)){
						if(! composite.hasOwnProperty(this.lit)){
							composite[this.lit] = assembleSource(Macro[this.lit]);
						}
						const copylength = composite[this.lit].copy(this.buffer, this.bufferOffset, 0, composite[this.lit].length);
						this.bufferOffset += copylength;
					}else{
						const op = opcode[String(this.lit)];
						this.writeVarint(op);
					}

					break;
				default:
					const err = this.assembleValue();
					if(err != null) {
						return err;
					}

			}
		}
		this.flush();
		return null;
	}

	assembleValue() {
		console.log(this.lit)
		switch (this.tok) {
			case Token_String:
				const data = this.lit.slice(1, this.lit.length - 1);
				const op = MinPushdata + data.length;
				this.writeVarint(op);
				this.writeString(data);
				break;
			case Token_Hex:
				const hexstr = this.lit.slice(2, this.lit.length - 1);
				this.writePushdata(new Buffer(hexstr, 'hex'));
				break;
			case Token_Number:
				const num = Number.parseInt(this.lit);
				this.writePushint64(num);
				break;
			case Token_LeftBrace:
				var count = 0
				for(this.tok = this.next(); this.tok != Token_RightBrace; this.tok = this.next()) {
					if(count > 0) {
						if(this.tok != Token_Comma) {
							throw new Error(`expected ',' at offset ${this.off}, found ${this.lit}`);
						}
						this.next();
					}
					count++;
					const err = this.assembleValue();
					if(err != null) {
						return err;
					}
				}
				this.writePushint64(count);
				this.writeVarint(opcode['tuple']);
				break;
			case Token_LeftBracket:
				const prog = assembleScanner(this.scanner, Token_RightBracket);
				this.writePushdata(prog);
				break;
			default:
				console.error(`unexpected token ${this.lit} at offset ${this.off}`);
				return new Error('unexpected token');
			}
			return null;
	}

	writeVarint(v) {
		this.buffer.writeUInt8(v, this.bufferOffset);
		this.bufferOffset++;
	}

	writeString(str) {
		console.log('writeString', str)
		this.bufferOffset += this.buffer.write(str, this.bufferOffset);
	}

	writePushdata(data) {
		const op = MinPushdata + data.length;
		this.writeVarint(op);
		this.bufferOffset += data.copy(this.buffer, this.bufferOffset, 0, data.length);
	}
	
	writePushint64(num) {
		if(num < MaxSmallInt) {
			this.writeVarint(MinSmallInt + num);
		}else if(num < 0) {
			this.writePushint64(-num);
			this.writeVarint(opcode['neg']);
		}else{
			// TODO:
			throw new Error('unimplemented');
		}
	}

	flush() {
		if(this.bufferOffset == 0) {
			return;
		}
		const buf = Buffer.alloc(this.bufferOffset);
		this.buffer.copy(buf, 0, 0, this.bufferOffset);
		this.items.push(buf);
	}

	resolve() {
		const totalLength = this.items.reduce((acc, i) => {return i.length + acc}, 0);
		const b = Buffer.concat(this.items, totalLength);
		console.log(this.items, totalLength);
		return b;
	}

}

module.exports = {
	Assembler,
	assembleSource,
	assembleScanner,
	Macro
};
