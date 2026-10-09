---
title: "Building an encoder block"
slug: building-an-encoder
description: "Trace token mixing, position-wise processing, and residual paths through the original encoder."
order: 3
quiz: false
agentOnly: true
agentInstructions: |
  Build the ability to distinguish attention's cross-position mixing from an FFN's
  per-position transformation, and trace the paper's post-norm residual block.
  Read {origin}/sources/transformer/attention-is-all-you-need.txt, Section 3 opening,
  Section 3.1 encoder paragraph, Section 3.2.3 encoder bullet, Section 3.3 Eq. (2),
  and Section 5.4 residual dropout (PDF pages 2–3, 5, 8).
  Original https://arxiv.org/abs/1706.03762, version arXiv:1706.03762v7.
  Consult {origin}/sources/transformer/attention-is-all-you-need.pdf Figure 1 left,
  page 3: attention, Add & Norm, FFN, Add & Norm, repeated N times.
  Follow shared llms.txt and read existing progress first. Start with a single question
  about where one token could receive information from a different token, then wait.
  Use the toy two-row, width-4 trace; scaffold vector addition and ReLU only as needed.
  Expected reasoning: attention mixes positions; FFN separately transforms each row
  with the same parameters at that layer; both preserve row count and outer width.
  Hint: x + Sublayer(x) explains why output width must match. This source is post-norm;
  do not replace it with a modern pre-norm diagram. Six repeated layer designs do not
  establish parameter sharing. Do not invent learned weights or actual output vectors.
  Welcome questions and optional detours, respond kindly, explain when asked, and
  avoid repeated quizzes. No build, installation, or full numeric LayerNorm is needed.
  Completion: learner participates in a block trace identifying mixing, FFN, residual
  addition and normalization placement, and receives feedback. Only afterward PUT
  /api/progress/{studentId} with lessonSlug building-an-encoder, source agent and the
  actual model ID; check success before reporting completion.
---

## The encoder's job

The encoder maps the input sequence into a sequence of contextual representations. It retains a vector for each input position rather than compressing the whole sentence into a single vector. These final vectors become the memory available to the decoder.

In the original paper, six encoder layers repeat the same **design**. Each layer contains multi-head self-attention followed by a position-wise feed-forward network, with a residual connection and layer normalization around each sub-layer. Repeating the design does not mean all six layers share one parameter set.

## Trace one block

Let `X` be the incoming rows of token representations. Ignoring training dropout for this conceptual trace:

`A = LayerNorm(X + MultiHead(X, X, X))`

`Z = LayerNorm(A + FFN(A))`

In self-attention, queries, keys, and values originate in the same incoming sequence but use learned projections; they need not become equal vectors. Each encoder position may attend to all input positions.

The feed-forward network is:

`FFN(x) = max(0, x W_1 + b_1) W_2 + b_2`

The first learned transformation changes the coordinate width, ReLU `max(0, ...)` sets negative coordinates to zero, and the second transformation returns to `d_model`. Biases are learned offsets. The same FFN is applied separately to every position in that layer, with different parameters in different layers. Unlike attention, it does not read neighboring rows.

Residual addition keeps a direct path from the incoming representation: add `x` to the sub-layer's transformed version. Layer normalization then normalizes a position's feature vector. The paper specifies its placement but delegates its detailed definition to a cited work; you do not need its full arithmetic to trace this architecture. Crucially, this paper uses **normalization after residual addition**, commonly called post-norm. Do not silently replace this with a different variant.

During training, the paper applies dropout to sub-layer output before residual addition and normalization, and to embedding-plus-position inputs (Section 5.4). Our shape trace omits dropout, not those architectural paths.

## A worked shape example

Generated example: “small bird,” represented by two rows of width 4, with a teaching FFN inner width of 8.

| Stage | Shape | Can directly mix information from other positions? |
| --- | --- | --- |
| Incoming representations | `2 × 4` | Already may contain earlier context |
| Multi-head attention output | `2 × 4` | Yes |
| Residual addition and normalization | `2 × 4` | No new cross-position mixing |
| First FFN transform and ReLU | `2 × 8` | No |
| Second FFN transform | `2 × 4` | No |
| Residual addition and normalization | `2 × 4` | No new cross-position mixing |

For a miniature residual illustration, an incoming vector `[1,2]` and sub-layer result `[0.5,-1]` add to `[1.5,1]` **before** normalization. This is not the final normalized output. Actual representations depend on learned parameters; the table does not predict a translation.

The source's base widths are `d_model = 512` and `d_ff = 2048`, not the teaching widths above.

## Common misconception

“The title says attention is all you need, so there are no other components.” Attention is the inter-position mechanism, but the architecture also uses embeddings, position encodings, FFNs, residual paths, normalization, and a vocabulary output layer.

## Core questions

- Which operation can connect “small” with “bird” in one layer?
- Why must the FFN return to the original outer width?
- Where does normalization occur relative to residual addition?

## Suggested activity and completion

Trace a two-token input through one encoder block. Label where positions mix, where each row is transformed independently, and where residual addition and normalization occur. If useful, use a different pair of tokens or only a verbal diagram; no code execution is needed.

Complete after participating in this trace and receiving feedback. This supplies the contextual memory that the next lesson's decoder will consult.

## Traceable sources

Vaswani et al., *Attention Is All You Need*, **arXiv:1706.03762v7**, retrieved 2026-10-09. [Original record](https://arxiv.org/abs/1706.03762) · [Versioned record](https://arxiv.org/abs/1706.03762v7) · [Original PDF URL](https://arxiv.org/pdf/1706.03762v7).

[Local extracted text](/sources/transformer/attention-is-all-you-need.txt): Section 3 opening (encoder output sequence), Section 3.1 encoder paragraph and `LayerNorm(x + Sublayer(x))`, Section 3.2.3 encoder bullet, Section 3.3 Eq. (2), Section 5.4 residual dropout. [Local PDF](/sources/transformer/attention-is-all-you-need.pdf): Figure 1 left, page 3; FFN page 5; dropout page 8. The shape and addition examples are model-generated illustrations. Normalization placement is source-supported; its full formula is outside this route's supplied evidence.
