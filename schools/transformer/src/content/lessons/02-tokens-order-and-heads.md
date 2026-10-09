---
title: "Tokens, order, and multiple heads"
slug: tokens-order-and-heads
description: "Explain how token vectors gain position information and become several learned attention views."
order: 2
quiz: false
agentOnly: true
agentInstructions: |
  Build the ability to trace embedding-plus-position into learned Q/K/V projections
  and distinguish multiple heads from repeated identical attention.
  Read {origin}/sources/transformer/attention-is-all-you-need.txt, Sections 3.2.2,
  3.4, 3.5, Figure 2 caption, and Table 3 row (E) (PDF pages 4–6 and 9).
  Original https://arxiv.org/abs/1706.03762, arXiv:1706.03762v7.
  PDF: {origin}/sources/transformer/attention-is-all-you-need.pdf, Figure 2 right.
  Optional generated arithmetic: {origin}/activities/attention.py, --demo position.
  Follow shared llms.txt and read existing progress before starting. Connect to the
  previous mixing activity, explaining linear projection as a learned coordinate transform.
  Ask one small prediction about swapping two tokens, wait, then explore adding positions.
  Offer the width-4, two-head shape trace next; do not give its answer in the opening prompt.
  Expected reasoning: plain unmasked self-attention moves outputs with a permutation;
  position signals change the input information. Two width-2 heads concatenate to width 4,
  then W^O mixes that result. Heads have distinct learned projections, not prescribed jobs.
  Hint: same token embedding at two locations receives different position additions.
  Welcome questions and route adjustments; give kind hints or requested explanations,
  not repeated quizzes. All running is optional; paper-and-pencil shapes suffice.
  Completion: learner participates in an order comparison and traces the toy head widths,
  with feedback, not necessarily perfect answers. Only then PUT /api/progress/{studentId}
  with lessonSlug tokens-order-and-heads, source agent, actual model ID; verify success.
---

## From a token to an attention input

An embedding is a learned lookup that turns a token identifier into a vector of width `d_model`. The identifier itself is not a meaningful numerical measurement. In the paper, the embedding vectors are scaled by `sqrt(d_model)`, then position encodings are added at the bottoms of both stacks. Equal widths make this coordinate-by-coordinate addition possible.

Why add positions? Without position signals, unmasked self-attention uses the supplied vectors and their compatibility, not their sequence indices. If you reorder the same input vectors, its output vectors reorder with them. This is called permutation equivariance; it does **not** mean all outputs become identical. The claim here concerns plain self-attention without a causal mask or position signal, not every decoder operation.

## A worked order example

Generated example: suppose “bird” has the already-scaled embedding `[1,0,0,0]`. Using the paper's sinusoidal formula with a tiny teaching width `d_model = 4`:

`PE(pos,2i) = sin(pos / 10000^(2i/d_model))`

`PE(pos,2i+1) = cos(pos / 10000^(2i/d_model))`

Here `pos` is the position, starting at zero in this example, and `i` indexes a coordinate pair. At position 0, `PE = [0,1,0,1]`. At position 1, it is approximately `[0.8415,0.5403,0.0100,0.99995]`. Adding these to the same embedding yields different vectors at the two positions.

This injects order information; it does not guarantee that the model will use it correctly. Section 3.5 describes extrapolation to longer sequences as a possibility, not a proven guarantee. Learned positions gave nearly identical results in the paper's tested setting (Table 3 row E).

## Why multiple heads?

The model learns different linear projections for each head:

`head_i = Attention(Q W_i^Q, K W_i^K, V W_i^V)`

`MultiHead(Q,K,V) = Concat(head_1,...,head_h) W^O`

A linear projection multiplies a vector by a learned matrix, forming new coordinates from weighted combinations of the old ones. You do not need matrix-multiplication fluency yet: track the widths. Each head computes its own attention weights and mixture. Concatenation places the head outputs side by side; the final projection mixes that combined representation.

Generated shape example: three token rows, width 4, two heads, each with `d_k = d_v = 2`. Each head's projected queries, keys, and values are `3 × 2`. Each head has a `3 × 3` weight table and a `3 × 2` output. Concatenation gives `3 × 4`; a `4 × 4` output projection returns `3 × 4`.

The paper's base configuration instead uses eight heads, `d_model = 512`, and `d_k = d_v = 64`. These are source settings, not requirements for all Transformers.

## Common misconception

“Eight heads means running the same attention eight times.” Each head has different learned projections. The paper motivates different representation subspaces; it does not prescribe one grammatical role per head. More heads are not automatically better, nor does each head process only one token.

## Core questions

- What changes when a token moves but its token identity stays the same?
- How do head-specific projections change what can be compared and mixed?
- How does concatenation differ from averaging head outputs?

## Suggested activity and completion

Compare “red bird” and “bird red.” Explain why plain self-attention without position signals only follows the reordering, then describe what adding position vectors changes. Optionally run the [generated example](/activities/attention.py) with `python3 attention.py --demo position`; it uses identity projections to isolate the effect, not a trained Transformer.

Then trace the widths for three rows, two width-2 heads, and a width-4 output. Complete after participating in both comparisons and receiving feedback. You now know where attention's vectors come from and how multiple views become one representation; next you will place this inside a block.

## Traceable sources

Vaswani et al., *Attention Is All You Need*, **arXiv:1706.03762v7**, retrieved 2026-10-09. [Original record](https://arxiv.org/abs/1706.03762) · [Versioned record](https://arxiv.org/abs/1706.03762v7) · [Original PDF URL](https://arxiv.org/pdf/1706.03762v7).

[Local extracted text](/sources/transformer/attention-is-all-you-need.txt): Section 3.2.2 (projection equations and dimensions), Section 3.4 (embeddings), Section 3.5 (sinusoidal equations and hypotheses), Table 3 row E (tested learned-position alternative). [Local PDF](/sources/transformer/attention-is-all-you-need.pdf): Figure 2 right, PDF page 4; Sections 3.2.2–3.5, pages 4–6; Table 3, page 9. The small vectors, permutation explanation, and shape trace are generated examples or mathematical deductions from these operations, not paper experiments.
