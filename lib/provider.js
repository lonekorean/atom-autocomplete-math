'use babel';

const { allowUnsafeEval, allowUnsafeNewFunction } = require('loophole');
const mathjs = allowUnsafeNewFunction(function() {
	return require('mathjs');
});

class Provider {
	constructor() {
		this.selector = '*';
	}

	getSuggestions(options) {
		const { editor, bufferPosition } = options;
		let lineText = editor.lineTextForBufferRow(bufferPosition.row);
		let parenRanges = this.findParenRanges(lineText);
		let filteredParenRanges = this.filterParenRanges(parenRanges, lineText, bufferPosition.column);
		let suggestions = this.createSuggestions(filteredParenRanges, lineText);
		return suggestions;
	}

	findParenRanges(lineText) {
		let parenRanges = [];
		let openParenIndexes = [];
		for (let i = 0; i < lineText.length; i++) {
			let char = lineText.charAt(i);
			if (char === '(') {
				openParenIndexes.push(i);
			} else if (char === ')') {
				let openParenIndex = openParenIndexes.pop();
				if (openParenIndex !== undefined) {
					parenRanges.unshift([openParenIndex, i]);
				}
			}
		}
		return parenRanges;
	}

	filterParenRanges(parenRanges, lineText, bufferColumn) {
		return parenRanges.filter((range) => {
			// empty parens aren't worth showing suggestions for
			let innerText = lineText.substring(range[0] + 1, range[1]); // skip open paren
			let isNotTrivial = (/[^()]/).test(innerText);

			// check if cursor is within or immediately after paren range
			let isCursorWithin = bufferColumn > range[0] && bufferColumn <= range[1] + 1;

			return isNotTrivial && isCursorWithin;
		});
	}

	createSuggestions(parenRanges, lineText) {
		let suggestions = [];
		parenRanges.forEach((range) => {
			let expression = lineText.substring(range[0], range[1] + 1); // include close paren
			let solution = this.evalExpression(expression);
			if (solution !== undefined) {
				suggestions.push({
					type: 'constant',
					iconHTML: '<i class="icon-plus"></i>',
					leftLabel: expression,
					text: '= ' + solution,
					description: expression,

					// extra data for onDidInsertSuggestion to do the actual replacement
					replacement: {
						text: solution,
						range: range
					}
				});
			}
		});
		return suggestions;
	}

	evalExpression(expression) {
		let solution;
		try {
			solution = allowUnsafeEval(() => {
				return allowUnsafeNewFunction(() => {
					let solution = mathjs.eval(expression);
					return mathjs.format(solution, { precision: 12 });
				});
			});
		}
		catch (e) {
			// not all expressions are valid and that's ok
		}
		return solution;
	}

	onDidInsertSuggestion(options) {
		const { editor, suggestion, triggerPosition } = options;

		// the standard suggestion insertion is insufficient (doesn't clear stuff after cursor)
		// so we undo that insertion and replace text manually
		editor.undo();
		editor.setTextInBufferRange([
			[triggerPosition.row, suggestion.replacement.range[0]],
			[triggerPosition.row, suggestion.replacement.range[1] + 1] // include close paren
		], suggestion.replacement.text);
	}
}
export default new Provider();
