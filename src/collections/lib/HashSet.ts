import { Items, Hashable, ItemsHolder, union_items, intersection_items, difference_items } from './common'

export class HashSet<T extends Hashable> implements Iterable<T> {
	protected items!: Items<T>

	static from<T extends Hashable>(items: T[]): HashSet<T> {
		const s = new HashSet<T>()
		s.set_items(items)
		return s
	}

	set_items(items: T[]): this {
		// this._size = items.length
		this.items = {}
		for (let index = 0; index < items.length; index++) {
			const item = items[index]
			const hash_key = item.to_hash()
			this.items[hash_key] = item
		}

		return this
	}

	constructor(...items: T[]) {
		this.set_items(items)
	}

	equal(other: HashSet<T>): boolean {
		const this_hash_keys = Object.keys(this.items).sort()
		const other_hash_keys = Object.keys(other.items).sort()

		if (this_hash_keys.length !== other_hash_keys.length)
			return false

		let t
		let o
		while ((t = this_hash_keys.pop()) && (o = other_hash_keys.pop())) {
			if (t !== o)
				return false
		}
		return true
	}

	// protected _size: number
	// get size() { return this._size }
	get size() { return Object.keys(this.items).length }

	*[Symbol.iterator]() {
		const values = Object.values(this.items)
		for (let index = 0; index < values.length; index++) {
			yield values[index]
		}
	}

	values() {
		return Object.values(this.items)
	}

	has(item: T): boolean {
		const hash_key = item.to_hash()
		return hash_key in this.items
	}

	add(item: T, ...rest: T[]): this {
		const items = [item].concat(rest)

		for (let index = 0; index < items.length; index++) {
			const item = items[index]
			const hash_key = item.to_hash()
			this.items[hash_key] = item
			// this._size++
		}

		return this
	}

	delete(item: T, ...rest: T[]): this {
		const items = [item].concat(rest)

		for (let index = 0; index < items.length; index++) {
			const item = items[index]
			const hash_key = item.to_hash()
			delete this.items[hash_key]
			// this._size--
		}

		return this
	}

	clear(): this {
		this.items = {}
		// this._size = 0
		return this
	}


	protected static union_items<T extends Hashable>(items: Items<T>, others: HashSet<T>[]) {
		return union_items(items, others as any as ItemsHolder<T>[])
	}

	// mutating version of union
	mutate_union(other: HashSet<T>, ...rest: HashSet<T>[]): this {
		this.items = HashSet.union_items(this.items, [other].concat(rest))
		return this
	}

	// non-mutating
	union(other: HashSet<T>, ...rest: HashSet<T>[]): HashSet<T> {
		const items = HashSet.union_items({ ...this.items }, [other].concat(rest))
		const s = new HashSet<T>()
		s.items = items
		return s
	}


	protected static intersection_items<T extends Hashable>(items: Items<T>, others: HashSet<T>[]) {
		return intersection_items(items, others as any as ItemsHolder<T>[])
	}

	// in place version of intersection
	mutate_intersection(other: HashSet<T>, ...rest: HashSet<T>[]): this {
		this.items = HashSet.intersection_items(this.items, [other].concat(rest))
		return this
	}

	// non-mutating
	intersection(other: HashSet<T>, ...rest: HashSet<T>[]): HashSet<T> {
		const items = HashSet.intersection_items({ ...this.items }, [other].concat(rest))
		const s = new HashSet<T>()
		s.items = items
		return s
	}


	protected static difference_items<T extends Hashable>(items: Items<T>, others: HashSet<T>[]) {
		return difference_items(items, others as any as ItemsHolder<T>[])
	}

	// in place version of difference
	mutate_difference(other: HashSet<T>, ...rest: HashSet<T>[]): this {
		this.items = HashSet.difference_items(this.items, [other].concat(rest))
		return this
	}

	// non-mutating
	difference(other: HashSet<T>, ...rest: HashSet<T>[]): HashSet<T> {
		const items = HashSet.difference_items({ ...this.items }, [other].concat(rest))
		const s = new HashSet<T>()
		s.items = items
		return s
	}
}
