---
title: "Attention as weighted information"
slug: attention-as-weighted-information
description: "Calculate one attention output and separate queries, keys, values, and weights."
order: 1
quiz: false
agentOnly: true
agentInstructions: |
  Build the ability to calculate and explain one scaled dot-product attention row.
  Read {origin}/sources/transformer/attention-is-all-you-need.txt, Section 3.2 and
  Section 3.2.1, Eq. (1), Figure 2 caption and footnote 4 (PDF pages 3–4).
  Original: https://arxiv.org/abs/1706.03762, version arXiv:1706.03762v7.
  The original PDF is at {origin}/sources/transformer/attention-is-all-you-need.pdf.
  Use {origin}/activities/attention.py as a model-generated example, not research evidence.
  Follow shared llms.txt; fetch GET /api/progress/{studentId} before starting.
  Briefly ask about vectors only if needed; scaffold dot products and softmax in place.
  Start with one prediction about which key a query favors, not the complete solution.
  Then invite a calculation or observation with --demo basic and --demo values; running
  Python is optional. Hand calculation or reading the returned output also works.
  Ask one small question at a time and wait. Welcome natural questions and short detours,
  kindly explain errors, explain directly when requested, and avoid repeated quizzes.
  Hint: keys decide weights; values supply what is mixed. The expected changed-value
  result has unchanged weights but a changed output. Scaling acts before softmax.
  Completion: learner participates in the key/weight/output trace and the changed-value
  comparison, then receives feedback; a perfect calculation is not required.
  Only then PUT /api/progress/{studentId} with lessonSlug attention-as-weighted-information,
  source agent, and the actual model ID; check success before reporting completion.
---

## Why start here?

A Transformer processes a sequence of tokens, such as words or word pieces. Each token is represented by a vector: a list of numbers. Attention lets one position gather information from other positions. It is not a command to choose exactly one word; it computes a weighted mixture of information.

The paper describes a query and key-value pairs. A **query** is compared with **keys** to decide weights. The corresponding **values** are then mixed using those weights. “A question, matching labels, and retrieved contents” is a teaching analogy, not a literal description of how a trained network understands language.

## The mechanism

Section 3.2.1, Eq. (1), gives:

`Attention(Q, K, V) = softmax(Q K^T / sqrt(d_k)) V`

Read this in four steps:

1. A dot product multiplies matching coordinates and adds them: `[a,b] · [c,d] = ac + bd`.
2. Divide the scores by `sqrt(d_k)`, where `d_k` is the number of coordinates in a key.
3. Apply softmax to each query's scores: `weight_j = exp(score_j) / sum(exp(score_l))`. The weights are nonnegative and sum to one.
4. Multiply each value vector by its weight and add the results coordinate by coordinate.

A matrix is a table of numbers. `Q` has one row per query; `K` and `V` have one row per available key-value pair. The transpose `K^T` turns key rows into columns for the dot products. With `n_q` queries and `n_k` keys, the weights form an `n_q × n_k` table. The output is `n_q × d_v`, where `d_v` is the value width. Key width and value width need not be equal.

## A worked example

These numbers are generated for teaching, not taken from a trained model:

- Query: `[1,0]`.
- Keys: `[1,0]` and `[0,1]`.
- Values: `[10,0]` and `[0,10]`.

The dot products are `1` and `0`. With `d_k = 2`, the scaled scores are about `0.707` and `0`. Softmax gives weights about `0.670` and `0.330`. The output is therefore about `[6.698, 3.302]`.

The first key receives more weight, but the second value still contributes. If the second value becomes `[0,20]` without changing the query or keys, the weights stay the same and the second output coordinate doubles.

The paper motivates scaling because large dot products can push softmax into regions with very small gradients. Footnote 4 assumes independent, zero-mean, unit-variance coordinates and obtains dot-product variance `d_k`. That is a rationale under assumptions, not a claim that all learned vectors have that distribution.

## Common misconception

“Attention weights are the output.” They are intermediate mixing coefficients. The output contains weighted **values**, not the keys or the coefficients alone. Also, “the largest score wins” is not softmax: other allowed positions usually keep positive weight.

## Core questions

- Which quantities determine the weights, and which supply the mixed information?
- Why is softmax applied across keys separately for each query?
- Where does the scaling factor enter?

## Suggested activity and completion

Predict the higher-weight key, trace one output, then predict what changes when only a value changes. Compare your prediction with calculation or the optional [generated Python example](/activities/attention.py): download it and run `python3 attention.py --demo basic`, then `python3 attention.py --demo values`. No project installation is needed; the teacher can work through the same arithmetic with you.

Complete after participating in both the trace and the changed-value comparison and receiving feedback. Small arithmetic mistakes do not block completion. This mixing operation is the core component you will locate inside the architecture later.

## Traceable sources

Vaswani et al., *Attention Is All You Need*, supplied version **arXiv:1706.03762v7**, retrieved 2026-10-09. [Original record](https://arxiv.org/abs/1706.03762) · [Versioned text record](https://arxiv.org/abs/1706.03762v7) · [Original PDF URL](https://arxiv.org/pdf/1706.03762v7).

[Local extracted text](/sources/transformer/attention-is-all-you-need.txt): Section 3.2 (query/key/value definition), Section 3.2.1 Eq. (1), footnote 4 and Figure 2 caption, PDF pages 3–4. [Local original PDF](/sources/transformer/attention-is-all-you-need.pdf): Figure 2 left shows dot product → scale → optional mask → softmax → value multiplication. All numerical examples here are model-generated.
