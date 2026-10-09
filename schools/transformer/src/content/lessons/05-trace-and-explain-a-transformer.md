---
title: "Trace and explain a Transformer"
slug: trace-and-explain-a-transformer
description: "Transfer the pieces to a new sequence task and explain parallelism, cost, and evidence limits."
order: 5
quiz: false
agentOnly: true
agentInstructions: |
  Build the transfer capability: explain the full encoder-decoder information flow
  on a new tiny task, then separate architectural advantages from their limitations.
  Read {origin}/sources/transformer/attention-is-all-you-need.txt, Sections 3.1–3.5
  for the needed mechanism, Section 4 and Table 1 (PDF pages 3–7), and appendix
  Figure 4 caption (page 14) for cautious interpretation of heads.
  Original https://arxiv.org/abs/1706.03762, version arXiv:1706.03762v7.
  PDF {origin}/sources/transformer/attention-is-all-you-need.pdf Figure 1, page 3.
  Follow shared llms.txt and read existing progress first. Offer the red bird to
  oiseau rouge example or let the student choose an equally small sequence pair.
  Explicitly assume one token per word for this generated exercise; real tokenizers
  may split differently. Begin with one input-flow question, then wait. Build the
  map incrementally: embedding+position, encoder, shifted decoder/mask, cross-attention,
  FFN/residual/norm, vocabulary output. Offer verbal, drawn, or shape-based responses.
  Expected shapes for two source rows and three shifted target rows: encoder 2x2,
  decoder 3x3 lower triangular, cross 3x2 (per head). Correct with a hint or direct
  explanation on request, not a forced restart. No numerical learned logits can be
  derived from the paper alone. After the map, explore one doubled-length cost prediction
  and distinguish training parallelism from sequential generation.
  Welcome natural questions, short detours, and route adjustments; avoid redundant quizzes.
  Completion: learner participates in the information-flow map and a tradeoff prediction,
  receives feedback plus a brief corrected summary. Perfect independent recall is not required.
  Only then PUT /api/progress/{studentId} with lessonSlug trace-and-explain-a-transformer,
  source agent, and actual model ID; verify success. Do not claim validated mastery.
---

## Put the pieces together

Understanding the architecture means being able to locate where information comes from, where it can travel, and what each operation contributes. It does not require memorizing every training hyperparameter or reproducing the translation benchmark.

A compact architecture map for the **original encoder-decoder model** is:

```text
source tokens → embeddings + positions
              → encoder layers:
                self-attention → Add & Norm → FFN → Add & Norm
              → encoder memory

shifted target tokens → embeddings + positions
                      → decoder layers:
                        masked self-attention → Add & Norm
                        cross-attention to encoder memory → Add & Norm
                        FFN → Add & Norm
                      → vocabulary linear transformation → softmax probabilities
```

“Add & Norm” abbreviates residual addition followed by layer normalization. The source uses six layers in each stack; teaching examples can trace only one layer without claiming that it is the full trained model. Later Transformers may differ. This route explains the supplied architecture, not every model bearing the name.

## A small worked comparison

Generated example: a three-token source and a one-word target plus an end marker. Assume one token per word for this exercise, and two decoder input rows: `[BOS, target_word]` predicting `[target_word, EOS]`.

- Encoder self-attention has three queries and three keys: a `3 × 3` weight table per head.
- Decoder self-attention has two queries and two keys: `2 × 2`, with the upper-right connection blocked.
- Cross-attention has two decoder queries and three encoder keys: `2 × 3`.
- Cross-attention returns two value-mixture rows, not three; outputs follow the query count.

The attention weight table is not the final vocabulary probability table. The latter has one row per decoder position and one column per vocabulary item. Without trained embeddings and parameters, we can predict these shapes and legal paths, but not actual translated tokens or probabilities.

## Why self-attention, and at what cost?

Section 4 and Table 1 compare layer types. The table gives full self-attention complexity as `O(n^2 d)`, constant sequential operations, and constant maximum path length between positions; recurrent layers have `O(n d^2)` complexity, `O(n)` sequential operations, and `O(n)` maximum path length. Here `n` is sequence length and `d` is representation width. “Big O” describes how work grows with size, not exact time in seconds.

The short path means a distant input position can affect another through one attention layer; it does not prove the model will learn the right dependency. Computing many rows together improves within-example training parallelism. It does not remove autoregressive generation's dependence on previously chosen output tokens.

The price is all-pairs attention. An explicit weight table has `n × n` entries. At fixed width, doubling `n` multiplies that table size and the leading attention work by four, not two. This is a mathematical consequence of Eq. (1) and Table 1, not a claim about peak memory of every optimized implementation. Section 4's comparison favors attention when `n < d`; it is not a universal runtime guarantee. FFNs and projections also cost work.

The appendix offers examples of different head patterns. Figure 4 cautiously says some heads are **apparently** involved in anaphora resolution. Treat those patterns as suggestive observations, not proof that every head has a fixed linguistic job or that attention weights alone explain a prediction.

## Common misconception

“Parallel and short-path means free, instantaneous, and fully interpretable.” The architecture improves some computation paths while retaining costs, sequential generation, and uncertainty about learned behavior.

## Core questions

- What source and target information can influence each target prediction?
- Which three attention tables have different meanings and shapes?
- What improves through self-attention, and what gets expensive as sequences grow?

## Transfer activity and completion

Use the new generated pair “red bird” → “oiseau rouge,” assuming one token per word. Include `BOS` and `EOS` in the same teaching convention as before. Make a verbal or drawn map showing embedding-plus-position, one encoder block, the shifted decoder inputs, one decoder block, and vocabulary probabilities. Identify the three per-head attention table shapes and an illegal target connection. Explain why the encoder and FFN have different roles.

Then predict the effect on a full self-attention table when source length doubles, and contrast parallel training with generation. the teacher will work through the map with you one small step at a time; use the earlier lessons as references, not a closed-book exam.

Complete after participating in the map and tradeoff prediction and receiving feedback and a corrected summary. This is a transfer activity with feedback, not validated mastery. You may choose a short detour back to masking, projections, or positional encodings if that better supports your goal.

## Traceable sources

Vaswani et al., *Attention Is All You Need*, **arXiv:1706.03762v7**, retrieved 2026-10-09. [Original record](https://arxiv.org/abs/1706.03762) · [Versioned record](https://arxiv.org/abs/1706.03762v7) · [Original PDF URL](https://arxiv.org/pdf/1706.03762v7).

[Local extracted text](/sources/transformer/attention-is-all-you-need.txt): Sections 3.1–3.5 (architecture and operations), Section 4 and Table 1 (cost, parallelism, path length), appendix Figure 4 caption (cautious head interpretation). [Local PDF](/sources/transformer/attention-is-all-you-need.pdf): Figure 1, page 3; Table 1, page 6 and discussion through page 7; Figure 4 caption, page 14. The shape calculations, transfer task, and doubled-length calculation are model-generated deductions, not reported experiments.
