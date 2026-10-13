import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertMathDelimiters } from './generate.mjs';

function lesson(body, frontmatter = 'title: Example') {
  return `---\n${frontmatter}\n---\n\n${body}\n`;
}

describe('assertMathDelimiters', () => {
  it('accepts paired inline math', () => {
    assert.doesNotThrow(() => assertMathDelimiters(lesson('面积是 $3$ 平方，再加 $x + y$。'), 'ok.md'));
  });

  it('accepts display math with $$ on their own lines', () => {
    assert.doesNotThrow(() => assertMathDelimiters(lesson('展开：\n$$\n(a + b)^2 = a^2 + 2ab + b^2\n$$\n'), 'ok.md'));
  });

  it('ignores $HOME inside a fenced code block', () => {
    assert.doesNotThrow(() => assertMathDelimiters(lesson('运行：\n```sh\necho $HOME\n```\n然后看 $x$。'), 'ok.md'));
  });

  it('ignores escaped dollar signs', () => {
    assert.doesNotThrow(() => assertMathDelimiters(lesson('价格写成 \\$5，公式是 $n$。'), 'ok.md'));
  });

  it('rejects an unclosed inline $', () => {
    const text = '---\ntitle: x\n---\n\nSee $x\n';
    assert.throws(
      () => assertMathDelimiters(text, 'broken.md'),
      /Unclosed inline math in broken.md:5/,
    );
  });

  it('rejects an unclosed $$ block even when the total $ count is even', () => {
    const text = '---\ntitle: x\n---\n\n$$\n$x$\n';
    assert.throws(
      () => assertMathDelimiters(text, 'display.md'),
      /Unclosed display math in display.md:5/,
    );
  });

  it('does not check $ characters inside YAML frontmatter', () => {
    assert.doesNotThrow(() => assertMathDelimiters(lesson('正文是 $a$。', 'title: "costs $5"\ndescription: "$HOME"'), 'front.md'));
  });

  it('ignores $HOME inside a fenced code block in a blockquote', () => {
    assert.doesNotThrow(() => assertMathDelimiters(lesson('> ```sh\n> echo $HOME\n> ```\n然后看 $x$。'), 'ok.md'));
  });

  it('ignores $HOME inside indented code', () => {
    assert.doesNotThrow(() => assertMathDelimiters(lesson('    echo $HOME\n\n然后看 $x$。'), 'ok.md'));
  });

  it('ignores $HOME inside multiline inline code', () => {
    assert.doesNotThrow(() => assertMathDelimiters(lesson('`echo\n$HOME`\n然后看 $x$。'), 'ok.md'));
  });

  it('rejects $$ that is not on its own line', () => {
    const text = '---\ntitle: x\n---\n\n$$x + y\nthen text\n';
    assert.throws(
      () => assertMathDelimiters(text, 'display.md'),
      /Unclosed display math in display.md:5/,
    );
  });
});
