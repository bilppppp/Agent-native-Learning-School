#!/usr/bin/env python3
"""Model-generated teaching example; NOT the paper's implementation or a trained model.
Python 3 standard library only. Implements Eq. (1), causal score masking, and
Section 3.5 positional encodings on deliberately tiny, hand-chosen arrays.
Run: python3 attention.py --demo basic (or values, scale, mask, position)
Run: python3 attention.py --check
No downloads, training, files, or external services.
"""
import argparse
import math


def softmax(scores):
    peak = max(scores)
    if peak == -math.inf:
        raise ValueError("At least one key must be allowed in each row")
    exps = [math.exp(x - peak) for x in scores]
    total = sum(exps)
    return [x / total for x in exps]


def attention(q, k, v, *, causal=False, scaled=True):
    """Rows are positions. A causal mask assumes aligned query/key positions.
    Returns weights and outputs; no projection weights, dropout, or training.
    """
    if not q or not k or not v or len(k) != len(v):
        raise ValueError("Nonempty queries and matching key/value rows required")
    dk, dv = len(k[0]), len(v[0])
    if dk == 0 or dv == 0 or any(len(x) != dk for x in q + k):
        raise ValueError("Query and key widths must match and be nonzero")
    if any(len(x) != dv for x in v):
        raise ValueError("Value widths must agree")
    if causal and len(q) != len(k):
        raise ValueError("This demo only supports square causal self-attention")
    weights, outputs = [], []
    divisor = math.sqrt(dk) if scaled else 1.0
    for i, query in enumerate(q):
        scores = [sum(a * b for a, b in zip(query, key)) / divisor for key in k]
        scores = [-math.inf if causal and j > i else s for j, s in enumerate(scores)]
        row = softmax(scores)
        weights.append(row)
        outputs.append([sum(row[j] * v[j][c] for j in range(len(v))) for c in range(dv)])
    return weights, outputs


def positional_encoding(pos, width):
    if width <= 0 or width % 2:
        raise ValueError("This example uses positive even widths")
    result = []
    for i in range(width // 2):
        angle = pos / (10000 ** (2 * i / width))
        result.extend([math.sin(angle), math.cos(angle)])
    return result


def show(label, weights, outputs):
    print(label)
    for i, (w, out) in enumerate(zip(weights, outputs)):
        print(f"  row {i}: weights={[round(x, 6) for x in w]} output={[round(x, 6) for x in out]}")


def check():
    q, k, v = [[1, 0]], [[1, 0], [0, 1]], [[10, 0], [0, 10]]
    w, out = attention(q, k, v)
    expected = math.exp(1 / math.sqrt(2)) / (math.exp(1 / math.sqrt(2)) + 1)
    assert math.isclose(w[0][0], expected)
    assert math.isclose(out[0][0], 10 * expected)
    changed_w, changed_out = attention(q, k, [[10, 0], [0, 20]])
    assert changed_w == w and changed_out != out
    x = [[1, 0], [0, 1], [1, 1]]
    w, out = attention(x, x, [[10, 0], [0, 10], [99, 99]], causal=True)
    assert w[0] == [1.0, 0.0, 0.0] and out[0] == [10.0, 0.0]
    assert w[1][2] == 0.0
    for row in w:
        assert math.isclose(sum(row), 1.0) and all(x >= 0 for x in row)
    _, stable = attention([[1000, 0]], [[1000, 0], [0, 1000]], [[1], [2]])
    assert stable == [[1.0]]
    # Self-attention without position signals is permutation equivariant:
    # moving the inputs moves the outputs, but does not encode their old order.
    tokens = [[1, 0], [0, 1]]
    _, base = attention(tokens, tokens, tokens)
    reverse = tokens[::-1]
    _, swapped = attention(reverse, reverse, reverse)
    assert swapped == base[::-1]
    assert positional_encoding(0, 4) == [0.0, 1.0, 0.0, 1.0]
    # Cross-attention may have different numbers of queries and keys.
    _, cross = attention([[1, 0], [0, 1], [1, 1]], tokens, [[7], [9]])
    assert len(cross) == 3 and all(len(row) == 1 for row in cross)
    print("All checks passed: Eq. (1), value roles, mask, row sums, stable softmax, order, cross shapes.")


def demo(name):
    q, k, v = [[1, 0]], [[1, 0], [0, 1]], [[10, 0], [0, 10]]
    if name in ("basic", "values"):
        show("Original hand-chosen query/keys/values", *attention(q, k, v))
        if name == "values":
            show("Only second value changed to [0,20]", *attention(q, k, [[10, 0], [0, 20]]))
    elif name == "scale":
        q, k = [[2, 0]], [[2, 0], [0, 2]]
        show("Without scaling (scores [4,0])", *attention(q, k, v, scaled=False))
        show("With sqrt(2) scaling", *attention(q, k, v))
    elif name == "mask":
        x, v = [[1, 0], [0, 1], [1, 1]], [[10, 0], [0, 10], [99, 99]]
        show("No causal mask", *attention(x, x, v))
        show("Future scores set to -infinity before softmax", *attention(x, x, v, causal=True))
    elif name == "position":
        for pos in (0, 1):
            print(f"PE({pos}, width=4) = {[round(x, 6) for x in positional_encoding(pos, 4)]}")
        for tokens in ([[1, 0], [0, 1]], [[0, 1], [1, 0]]):
            print("Tokens:", tokens)
            show("Self-attention WITHOUT position; Q=K=V=tokens", *attention(tokens, tokens, tokens))
            located = [[a + b for a, b in zip(t, positional_encoding(i, 2))] for i, t in enumerate(tokens)]
            show("WITH position; Q=K=V=token+PE (identity projections, illustrative only)", *attention(located, located, located))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--demo", choices=["basic", "values", "scale", "mask", "position"], default="basic")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    check() if args.check else demo(args.demo)
