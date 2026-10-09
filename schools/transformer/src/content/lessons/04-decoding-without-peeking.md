---
title: "Decoding without peeking"
slug: decoding-without-peeking
description: "Use shifted inputs and causal masking, and identify cross-attention's query and memory."
order: 4
quiz: false
agentOnly: true
agentInstructions: |
  Build the ability to align decoder inputs with next-token targets, identify allowed
  attention connections, and distinguish causal self-attention from cross-attention.
  Read {origin}/sources/transformer/attention-is-all-you-need.txt, Section 3 opening,
  Section 3.1 decoder paragraph, all three bullets in Section 3.2.3, and Section 3.4
  output transformation (PDF pages 2–3 and 5). Original https://arxiv.org/abs/1706.03762,
  arXiv:1706.03762v7. PDF {origin}/sources/transformer/attention-is-all-you-need.pdf,
  Figure 1 right and Figure 2 left (pages 3–4).
  Optional generated demonstration {origin}/activities/attention.py --demo mask.
  Follow shared llms.txt and read progress before starting. Begin by asking what is
  already known when predicting the first target, then wait. Use a short shifted
  target table; BOS/EOS are teaching notation rather than a tokenizer specification.
  Ask learner to mark allowed keys for one row, then identify Q versus K/V for
  cross-attention. Do not reveal the full mask or table answers in the first prompt.
  Hint: a row contains the previous target token; attending to itself is safe after
  shifting. Mask future scores to minus infinity BEFORE softmax, not values to zero.
  Expected reasoning: lower-triangular self-attention; decoder-derived queries and
  encoder-memory keys/values in cross-attention; parallel target training is not
  parallel generation of unknown target tokens. Cross-attention is not causal across
  source positions. Explain errors kindly, welcome questions/adjustments and requested
  explanations; no ritual quizzes and no training or installation requirement.
  Completion: learner participates in shifted-input/mask reasoning and traces the
  cross-attention sources, then receives feedback. Only then PUT /api/progress/{studentId}
  with lessonSlug decoding-without-peeking, source agent, actual model ID; check success.
---

## Two different sources of context

The decoder produces output tokens one at a time during generation. It needs context from the already-produced output prefix and from the encoded input. These are different attention uses:

- **Masked decoder self-attention:** queries, keys, and values come from decoder representations. A position may see its own row and earlier rows, not later ones.
- **Encoder-decoder attention**, also called cross-attention: queries come from the decoder sub-layer stream; keys and values come from the final encoder output. Every target position can consult all source positions.

A decoder layer runs masked self-attention, cross-attention, then FFN. Each sub-layer has residual addition followed by normalization, as in the original encoder. After the final layer, a learned linear transformation and softmax produce next-token probabilities over the vocabulary. This vocabulary softmax is different from attention softmax, which distributes weights over available key positions.

## A worked shift and mask example

Generated miniature target: “go now.” For teaching, `BOS` means beginning of output and `EOS` means end; this is notation, not a claim about a particular tokenizer.

| Decoder row | Supplied token at this row | Token this row predicts | Allowed decoder key rows |
| --- | --- | --- | --- |
| 0 | BOS | go | 0 |
| 1 | go | now | 0, 1 |
| 2 | now | EOS | 0, 1, 2 |

The input is shifted right relative to the target. At row 1, seeing row 1's token “go” is allowed: that row predicts “now,” not “go.” Seeing row 2 would leak “now,” the answer it is supposed to predict.

The allowed-connection table is therefore:

```text
             key 0   key 1   key 2
query 0      allow   block   block
query 1      allow   allow   block
query 2      allow   allow   allow
```

Section 3.2.3 implements blocked connections by setting their **scores** to `-infinity` before softmax. Their weights become zero, while the remaining allowed weights sum to one. Replacing blocked scores with zero would be wrong: `exp(0) = 1`, so a blocked position could still receive weight.

## Cross-attention and output

Suppose the source has four tokens and the shifted decoder input has three rows. One cross-attention head has a `3 × 4` weight table: three decoder queries, four encoder key-value pairs. Its output still has three rows. There is no “later source token” to hide; the entire source is available.

At generation time, start with a beginning marker, obtain probabilities for the first token, choose a token, append it, and repeat until stopping. The architecture supplies probabilities; a separate decoding choice determines which token to take. We are not specifying beam search here.

During training, the known target sequence can supply the shifted inputs for all rows together. Masking prevents a prediction from reading its future target. Thus parallel computation over known target positions during training is compatible with sequential generation when those future tokens do not yet exist. This distinction follows from the paper's shifting, masking and autoregressive description.

## Common misconception

“A causal mask makes all attention unable to look forward.” It restricts **decoder self-attention**. Encoder self-attention can use all input positions, and cross-attention can consult the full source. Also, shifting and masking work together; neither should be omitted.

## Core questions

- Why may a decoder query attend to its own row?
- Why block scores before softmax rather than erase values afterward?
- Where do cross-attention's queries, keys, and values originate?

## Suggested activity and completion

Choose a two-word target. Shift its inputs, identify allowed decoder keys for one row, and name the query and memory sources in cross-attention. Optionally compare masked and unmasked weights with the [generated example](/activities/attention.py), `python3 attention.py --demo mask`. The arrays are synthetic, not learned representations.

Complete after participating in both the mask reasoning and the cross-attention trace and receiving feedback. You can now follow information through both halves of the original Transformer.

## Traceable sources

Vaswani et al., *Attention Is All You Need*, **arXiv:1706.03762v7**, retrieved 2026-10-09. [Original record](https://arxiv.org/abs/1706.03762) · [Versioned record](https://arxiv.org/abs/1706.03762v7) · [Original PDF URL](https://arxiv.org/pdf/1706.03762v7).

[Local extracted text](/sources/transformer/attention-is-all-you-need.txt): Section 3 opening (autoregressive decoder), Section 3.1 decoder paragraph (shift and mask), Section 3.2.3 (three attention applications and score masking), Section 3.4 (vocabulary probabilities). [Local PDF](/sources/transformer/attention-is-all-you-need.pdf): Figure 1 right, page 3, and Figure 2 left mask location, page 4; Section 3.2.3, page 5. The shift table, source-length example, and training/generation explanation are generated illustrations and deductions from these mechanisms, not new experimental results.
