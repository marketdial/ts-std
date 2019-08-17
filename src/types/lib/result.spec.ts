import 'mocha'
import { expect } from 'chai'

import { Panic } from './utils'
import { Result, Ok, Err, ResultTuple, ResultJoin } from './result'


const im = "type invariant broken!"
const pm = "actually should happen"

describe('Result basic api', () => {
	const cases: Result<number>[] = [Ok(1), Err('bad')]
	for (const r of cases) {
		const is_ok = r.is_ok()
		const message = is_ok ? 'Ok' : 'Err'
		const changed: Result<string> = r.change(n => `n is: ${n}`)
		const changed_err: Result<number, number> = r.change_err(e => e.length)
		const and_then_ok: Result<boolean> = r.and_then(n => n === 1 ? Ok(true) : Err('different'))
		const and_then_err: Result<string> = r.and_then(n => n === 2 ? Ok('two') : Err('also'))
		const ok_undef = r.ok_undef()
		const err_undef = r.err_undef()
		const default_ok = r.default(2)
		const default_err = r.default_err('less bad')

		it(message, () => {
			if (is_ok) {
				expect(r.expect(im)).equal(1)
				expect(() => r.expect_err(pm)).throw(Panic, pm)
				expect(r.is_err()).false
				expect(changed.expect(im)).equal(`n is: 1`)
				expect(changed_err.expect(im)).equal(1)
				expect(and_then_ok.expect(im)).equal(true)
				expect(and_then_err.expect_err(im)).equal('also')
				expect(ok_undef).equal(1)
				expect(err_undef).undefined
				expect(default_ok).equal(1)
				expect(default_err).equal('less bad')
				r.match({
					ok: n => n,
					err: _ => { expect.fail("matched err on an ok"); return 1 },
				})
			}
			else {
				expect(() => r.expect(pm)).throw(Panic, pm)
				expect(r.expect_err(im)).equal('bad')
				expect(r.is_err()).true
				expect(changed.expect_err(im)).equal('bad')
				expect(changed_err.expect_err(im)).equal(3)
				expect(and_then_ok.expect_err(im)).equal('bad')
				expect(and_then_err.expect_err(im)).equal('bad')
				expect(ok_undef).undefined
				expect(err_undef).equal('bad')
				expect(default_ok).equal(2)
				expect(default_err).equal('bad')
				r.match({
					ok: _ => { expect.fail("matched ok on an err"); return 1 },
					err: _ => 1,
				})
			}
		})
	}

	it('attempt', () => {
		const err = Result.attempt(() => { throw new Error('bad'); return 1 })
			.change_err(e => e.message)
			.expect_err(im)
		expect(err).equal('bad')

		const ok = Result.attempt(() => 1)
			.expect(im)
		expect(ok).equal(1)
	})
})

function sum(nums: number[]) {
	return nums.reduce((a, b) => a + b, 0)
}

function msg(e: string) {
	return `message is: ${e}`
}

function msg_join(e: string[]) {
	return e.join(' ')
}

describe('Result joining functions', () => {
	type Triple = [number, number, number]
	type Case = [boolean, any, any]
	const cases: [string, ResultTuple<Triple, string>, Case][] = [[
		'all ok',
		[Ok(1), Ok(1), Ok(1)],
		[true, [1, 1, 1], 3],
	], [
		'first err',
		[Err('ugh'), Ok(1), Ok(1)],
		[false, 'ugh', ['ugh']],
	], [
		'second err',
		[Ok(1), Err('ugh'), Ok(1)],
		[false, 'ugh', ['ugh']],
	], [
		'third err',
		[Ok(1), Ok(1), Err('ugh')],
		[false, 'ugh', ['ugh']],
	], [
		'firstlast err',
		[Err('ugh'), Ok(1), Err('ugh')],
		[false, 'ugh', ['ugh', 'ugh']],
	], [
		'lasttwo err',
		[Ok(1), Err('seen'), Err('notseen')],
		[false, 'seen', ['seen', 'notseen']],
	], [
		'firsttwo err',
		[Err('seen'), Err('notseen'), Ok(1)],
		[false, 'seen', ['seen', 'notseen']],
	], [
		'all err',
		[Err('seen'), Err('notseen'), Err('notseen')],
		[false, 'seen', ['seen', 'notseen', 'notseen']],
	]]

	const combiner = (a: number, b: number, c: number) => a + b + c

	for (const [message, triple, [is_ok, single, collected]] of cases) {
		const all = Result.all(triple)
		it(`${message} all`, () => {
			expect(all.is_ok()).equal(is_ok)
			expect(all.is_err()).equal(!is_ok)
			if (is_ok)
				expect(all.expect(im)).eql(single)
			else
				expect(all.expect_err(im)).eql(single)
		})

		const all_collect_err = Result.all_collect_err(triple)
		it(`${message} all_collect_err`, () => {
			expect(all_collect_err.is_ok()).equal(is_ok)
			expect(all_collect_err.is_err()).equal(!is_ok)
			if (is_ok)
				expect(all_collect_err.expect(im)).eql(single)
			else
				expect(all_collect_err.expect_err(im)).eql(collected)
		})

		const join = Result.join(...triple)
		const join_res = join.into_result()
		const join_combined = join.combine(combiner)
		// this always fails, so we're mostly checking *which* err is encountered
		const join_and_then_ok = join
			.and_then_combine((a: number, b: number, c: number) => true ? Ok(combiner(a, b, c)) : Err('nope'))
		const join_and_then_err = join
			.and_then_combine((a: number, b: number, c: number) => false ? Ok(combiner(a, b, c)) : Err('nope'))

		it(`${message} join`, () => {
			expect(join_res.is_ok()).equal(is_ok)
			expect(join_res.is_err()).equal(!is_ok)
			if (is_ok) {
				expect(join_res.expect(im)).eql(single)
				expect(join_combined.expect(im)).eql(collected)
				expect(join_and_then_ok.expect(im)).eql(collected)
				expect(join_and_then_err.expect_err(im)).eql('nope')
			}
			else {
				expect(join_res.expect_err(im)).eql(single)
				expect(join_combined.expect_err(im)).eql(single)
				expect(join_and_then_ok.expect_err(im)).eql(single)
				expect(join_and_then_err.expect_err(im)).eql(single)
			}
		})

		const join_collect = Result.join_collect_err(...triple)
		const join_collect_res = join_collect.into_result()
		const join_collect_combined = join_collect.combine(combiner)
		const join_collect_and_then_ok = join_collect
			.and_then_combine((a: number, b: number, c: number) => true ? Ok(combiner(a, b, c)) : Err(['nope']))
		const join_collect_and_then_err = join_collect
			.and_then_combine((a: number, b: number, c: number) => false ? Ok(combiner(a, b, c)) : Err(['nope']))

		it(`${message} join_collect_err`, () => {
			expect(join_collect_res.is_ok()).equal(is_ok)
			expect(join_collect_res.is_err()).equal(!is_ok)
			if (is_ok) {
				expect(join_collect_res.expect(im)).eql(single)
				expect(join_collect_combined.expect(im)).eql(collected)
				expect(join_collect_and_then_ok.expect(im)).eql(collected)
				expect(join_collect_and_then_err.expect_err(im)).eql(['nope'])
			}
			else {
				expect(join_collect_res.expect_err(im)).eql(collected)
				expect(join_collect_combined.expect_err(im)).eql(collected)
				expect(join_collect_and_then_ok.expect_err(im)).eql(collected)
				expect(join_collect_and_then_err.expect_err(im)).eql(collected)
			}
		})

		const [a, b, c] = triple
		const r_join = a.join(b, c)
		const r_join_res = r_join.into_result()
		const r_join_combined = r_join.combine(combiner)
		const r_join_and_then_ok = r_join
			.and_then_combine((a: number, b: number, c: number) => true ? Ok(combiner(a, b, c)) : Err('nope'))
		const r_join_and_then_err = r_join
			.and_then_combine((a: number, b: number, c: number) => false ? Ok(combiner(a, b, c)) : Err('nope'))

		it(`${message} Result.join`, () => {
			expect(r_join_res.is_ok()).equal(is_ok)
			expect(r_join_res.is_err()).equal(!is_ok)
			if (is_ok) {
				expect(r_join_res.expect(im)).eql(single)
				expect(r_join_combined.expect(im)).eql(collected)
				expect(r_join_and_then_ok.expect(im)).eql(collected)
				expect(r_join_and_then_err.expect_err(im)).eql('nope')
			}
			else {
				expect(r_join_res.expect_err(im)).eql(single)
				expect(r_join_combined.expect_err(im)).eql(single)
				expect(r_join_and_then_ok.expect_err(im)).eql(single)
				expect(r_join_and_then_err.expect_err(im)).eql(single)
			}
		})

		const r_join_collect = a.join_collect_err(b, c)
		const r_join_collect_res = r_join_collect.into_result()
		const r_join_collect_combined = r_join_collect.combine(combiner)
		const r_join_collect_and_then_ok = r_join_collect
			.and_then_combine((a: number, b: number, c: number) => true ? Ok(combiner(a, b, c)) : Err(['nope']))
		const r_join_collect_and_then_err = r_join_collect
			.and_then_combine((a: number, b: number, c: number) => false ? Ok(combiner(a, b, c)) : Err(['nope']))

		it(`${message} Result.join`, () => {
			expect(r_join_collect_res.is_ok()).equal(is_ok)
			expect(r_join_collect_res.is_err()).equal(!is_ok)
			if (is_ok) {
				expect(r_join_collect_res.expect(im)).eql(single)
				expect(r_join_collect_combined.expect(im)).eql(collected)
				expect(r_join_collect_and_then_ok.expect(im)).eql(collected)
				expect(r_join_collect_and_then_err.expect_err(im)).eql(['nope'])
			}
			else {
				expect(r_join_collect_res.expect_err(im)).eql(collected)
				expect(r_join_collect_combined.expect_err(im)).eql(collected)
				expect(r_join_collect_and_then_ok.expect_err(im)).eql(collected)
				expect(r_join_collect_and_then_err.expect_err(im)).eql(collected)
			}
		})
	}
})


describe('Result dangerous any casts', () => {
	it('Ok.change_err', () => {
		const r: Result<number, number> = (Ok(4) as Result<number>).change_err(e => e.length)
		expect(r.is_ok()).true
		expect(r.is_err()).false
		expect(r.expect(im)).a('number')
		expect(() => r.expect_err(pm)).throw(Panic, pm)
	})

	it('Err.change', () => {
		const r: Result<boolean> = (Err('bad') as Result<number>).change(n => n === 1)
		expect(r.is_ok()).false
		expect(r.is_err()).true
		expect(() => r.expect(pm)).throw(Panic, pm)
		expect(r.expect_err(im)).a('string')
	})

	it("Err.and_then", () => {
		const r: Result<boolean> = (Err('bad') as Result<number>).and_then(n => n === 1 ? Ok(true) : Err('not one'))
		expect(r.is_ok()).false
		expect(r.is_err()).true
		expect(() => r.expect(pm)).throw(Panic, pm)
		expect(r.expect_err(im)).a('string')
	})
})
