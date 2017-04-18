'use babel';

class Provider {
	constructor() {
		this.selector = '*';
	}

	getSuggestions(options) {
		const { editor, bufferPosition } = options;
		let parenRanges = this.findParenRanges(editor, bufferPosition);
	}

	findParenRanges(editor, bufferPosition) {
		let line = editor.lineTextForBufferRow(bufferPosition.row);
		let parenRanges = [];

		// find all matching paren ranges in this line
		let openParenIndexes = [];
		for (let i = 0; i < line.length; i++) {
			let char = line.charAt(i);
			if (char === '(') {
				openParenIndexes.push(i);
			} else if (char === ')') {
				let openParenIndex = openParenIndexes.pop();
				if (openParenIndex !== undefined) {
					parenRanges.push([openParenIndex, i]);
				}
			}
		}

		// filter down to the paren ranges we care about
		parenRanges = parenRanges.filter((range) => {
			let isCursorWithin = bufferPosition.column > range[0] && bufferPosition.column <= range[1] + 1;
			let isNotTrivial = (/[^()]/).test(line.substring(range[0], range[1]));
			return isCursorWithin && isNotTrivial;
		});

		console.log(parenRanges);
	}
}
export default new Provider();
