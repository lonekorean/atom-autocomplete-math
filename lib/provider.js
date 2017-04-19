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
		let expressions = this.getExpressions(filteredParenRanges, lineText);
		let suggestions = this.createSuggestions(expressions);
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
					parenRanges.push([openParenIndex, i]);
				}
			}
		}
		return parenRanges;
	}

	filterParenRanges(parenRanges, lineText, bufferColumn) {
		return parenRanges.filter((range) => {
			let innerText = lineText.substring(range[0] + 1, range[1]); // skip open paren
			let isNotTrivial = (/[^()]/).test(innerText);
			let isCursorWithin = bufferColumn > range[0] && bufferColumn <= range[1] + 1;
			return isNotTrivial && isCursorWithin;
		});
	}

	getExpressions(parenRanges, lineText) {
		return parenRanges.map((range) => {
			return lineText.substring(range[0], range[1] + 1); // include close paren
		});
	}

	createSuggestions(expressions) {
		let suggestions = [];
		expressions.forEach((expression) => {
			let solution = this.evalExpression(expression);
			if (solution !== undefined) {
				solution = solution.toString();
				suggestions.push({
					text: solution,
					displayText: expression,
					iconHTML: '<i class="icon-plus"></i>',
					type: 'constant',
					rightLabelHTML: solution
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
					return mathjs.eval(expression);
				});
			});
		}
		catch (e) {
			// not all expressions are valid and that's ok
		}
		return solution;
	}
}
export default new Provider();
