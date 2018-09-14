const assert = require('assert');
const {
	AddInt64,
	SubInt64,
	MulInt64,
	DivInt64,
	ModInt64,
	NegateInt64
} = require('../lib/checked')

describe('checked safe math function', () => {
	describe('AddInt64', () => {
		it('should add 1 and 1', () => {
			const [ans, check] = AddInt64(1,1);
			assert.deepEqual(ans,2)
			assert.deepEqual(check,true)
		})
		it('should fail add MAXINT and 1', () => {
			const [ans, check] = AddInt64(Math.pow(2,32) -1,1);
			assert.deepEqual(check,false)
		})
		it('should fail MININT and -1', () => {
			const [ans, check] = AddInt64(1 - Math.pow(2,32) ,-1);
			assert.deepEqual(check,false)
		})
	})
	describe('MulInt64', () => {
		it('should mul 2 and 2', () => {
			const [ans, check] = MulInt64(2,2);
			assert.deepEqual(ans,4)
			assert.deepEqual(check,true)
		})
		it('should fail mul MAXINT and 2', () => {
			const [ans, check] = MulInt64(Math.pow(2,32) -1,2);
			assert.deepEqual(check,false)
		})
		it('should fail mul MININT and 2', () => {
			const [ans, check] = MulInt64(1 - Math.pow(2,32),2);
			assert.deepEqual(check,false)
		})
	})
	describe('DivInt64', () => {
		it('should div 5 and 2', () => {
			const [ans, check] = DivInt64(5,2);
			assert.deepEqual(ans,2)
			assert.deepEqual(check,true)
		})
		it('should fail div 1 and 0', () => {
			const [ans, check] = DivInt64(1,0);
			assert.deepEqual(check,false)
		})
		it('should fail div MAXINT and -1', () => {
			const [ans, check] = DivInt64(Math.pow(2,32) -1,-1);
			assert.deepEqual(check,false)
		})
	})
	describe('ModInt64', () => {
		it('should mod 5 and 2', () => {
			const [ans, check] = ModInt64(5,2);
			assert.deepEqual(ans,1)
			assert.deepEqual(check,true)
		})
		it('should fail mod 1 and 0', () => {
			const [ans, check] = ModInt64(1,0);
			assert.deepEqual(check,false)
		})
		it('should fail mod MAXINT and -1', () => {
			const [ans, check] = ModInt64(Math.pow(2,32) -1,-1);
			assert.deepEqual(check,false)
		})
	})
	describe('NegateInt64', () => {
		it('should Negate 1', () => {
			const [ans, check] = NegateInt64(1);
			assert.deepEqual(ans,-1)
			assert.deepEqual(check,true)
		})
		it('should Negate MININT', () => {
			const [ans, check] = NegateInt64(1- Math.pow(2,32));
			assert.deepEqual(check,false)
		})
	})
})
