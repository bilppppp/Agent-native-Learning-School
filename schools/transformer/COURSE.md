# Transformer School

## Goal and backward design

**Goal:** Understand the Transformer architecture and attention mechanism.

The route targets the original encoder-decoder Transformer in Vaswani et al., not all later Transformer variants. The small final transfer task is to trace a new two-word source/target pair through the model, identify allowed information paths and attention shapes, and explain a sequence-length/parallelism tradeoff. Learners need not install the original project, train a model, or reproduce translation results.

Observable capabilities:

1. Trace query–key scores, scaling, softmax weights, and value mixing; predict the effect of changing a value alone.
2. Explain why embeddings need position information and trace head-specific projections, concatenation, and output projection.
3. Distinguish cross-position attention from position-wise FFN processing; locate residual addition and post-norm placement.
4. Align shifted target inputs with predictions, identify causal connections, and name the query and memory sources in cross-attention.
5. Explain the whole input-to-next-token route on a fresh example, including why parallel training does not imply parallel autoregressive generation and why all-pairs attention grows quadratically.

The final map needs both stacks. Decoder tracing needs encoder memory and the attention primitive. Block tracing needs embeddings, head outputs, and widths. These dependencies, not paper headings, determine the route.

## Prerequisites and scaffolding

No domain expertise, programming ability, or calculus is assumed. Ordinary arithmetic and willingness to compare small examples suffice. A vector is introduced as a list, a matrix as a table, dot products and softmax are computed in lesson 1, learned projection is introduced through widths in lesson 2, and ReLU/vector addition are scaffolded in lesson 3. Lesson 4 introduces next-token prediction and beginning/end marker notation. Lesson 5 introduces Big O only as a growth description.

Full derivatives, backpropagation, detailed LayerNorm arithmetic, tokenizer implementation, and matrix algebra proofs are not prerequisites. the teacher may explain unfamiliar arithmetic inside an activity. Profile choices remain optional and unchanged; there is no interview lesson. Python execution is optional, with arithmetic/verbal alternatives in every relevant activity.

## Compact dependency-aware route

| Order and lesson | Why it exists / capability | Dependency | Activity and participation evidence |
| --- | --- | --- | --- |
| 1. Attention as weighted information | Establish the actual mixing mechanism, not an anthropomorphic slogan | None | Predict a key preference, trace one output, compare changed values; receive feedback |
| 2. Tokens, order, and multiple heads | Supply the input and parallel-view mechanisms needed for architecture tracing | 1: query/key/value roles and widths | Compare reordered tokens with/without position signals; trace two-head widths |
| 3. Building an encoder block | Turn the primitive into contextual source memory and separate mixing from per-row processing | 1–2: attention, input representations and head output | Label attention, FFN, residual and post-norm stages of one block |
| 4. Decoding without peeking | Explain target history, source memory, and legal next-token information paths | 1–3: primitive and encoder memory | Shift a target, mark allowed keys, identify cross-attention sources |
| 5. Trace and explain a Transformer | Integrate the parts and attach benefits to limits on a fresh example | 1–4 | Map a new sequence pair; predict doubled-length cost and explain training versus generation |

Activities are inside lessons. There are no separate exercises merely to fill a collection. Completion means participating and receiving feedback, not perfect recall or independently demonstrated mastery. Shared `llms.txt` governs the teacher interaction. The lesson notes additionally specify progress reads and post-activity writes with `source: "agent"` and the actual model ID. No progress has been seeded.

## Selected sources and local availability

Only one supplied work is needed:

- Vaswani et al., *Attention Is All You Need*, supplied **arXiv:1706.03762v7**, retrieved **2026-10-09**.
- Original record: https://arxiv.org/abs/1706.03762
- Versioned record: https://arxiv.org/abs/1706.03762v7
- Original versioned PDF URL: https://arxiv.org/pdf/1706.03762v7
- Input source root: `sources/`; relative files: `transformer/attention-is-all-you-need.txt` and `transformer/attention-is-all-you-need.pdf`.
- Unmodified local copies: `public/sources/transformer/attention-is-all-you-need.txt` and `.pdf`. Local HTTP URLs are `/sources/transformer/attention-is-all-you-need.txt` and `.pdf`; agent notes use `{origin}/sources/transformer/...`.

The extracted text supplies local machine-readable prose, equations, tables, and captions. Its flattened equations are reformatted, not redefined, in the lessons. The original PDF preserves layout and figures for human reference. Copies were checked byte-for-byte. No repository was copied.

### Concise source ledger

| Major claim | Precise source location | Used in |
| --- | --- | --- |
| Attention maps query/key/value vectors to a weighted value sum | Section 3.2, pages 3–4 | 1 |
| Dot products divided by square root of key width, then softmax and value multiplication | Section 3.2.1, Eq. (1), Figure 2 left, page 4 | 1, 4 |
| Scaling rationale and its independence/variance assumptions | Section 3.2.1 and footnote 4, page 4 | 1 |
| Different learned head projections, concatenation, final projection; base eight width-64 heads | Section 3.2.2 equations and dimension statements, pages 4–5; Figure 2 right | 2 |
| Learned token embeddings, embedding scaling, vocabulary projection/softmax | Section 3.4, page 5 | 2, 4, 5 |
| Positional encodings are added; sine/cosine equations; longer-length extrapolation is a hypothesis | Section 3.5, page 6 | 2 |
| Tested learned positions had nearly identical results in that setting | Section 3.5 and Table 3 row E, pages 6 and 9 | 2 |
| Six-layer encoder, attention then FFN, residual then normalization, width 512 | Section 3.1 encoder paragraph and `LayerNorm(x + Sublayer(x))`, page 3; Figure 1 left | 3, 5 |
| Per-position shared FFN within a layer, different across layers; ReLU and 512–2048–512 widths | Section 3.3, Eq. (2), page 5 | 3 |
| Training dropout before residual addition/norm and on embedding-plus-position sums | Section 5.4, residual dropout paragraph, page 8 | 3 |
| Autoregressive decoder, shifted inputs, extra encoder attention sub-layer | Section 3 opening, page 2; Section 3.1 decoder paragraph, page 3; Figure 1 right | 4, 5 |
| Three attention uses and illegal scores masked to negative infinity before softmax | Section 3.2.3, three bullets, page 5; Figure 2 left | 4, 5 |
| Full self-attention complexity, sequential operations and path lengths, conditional comparison with recurrence | Table 1, Section 4, pages 6–7 | 5 |
| Some head patterns apparently relate to anaphora; not a guarantee of fixed roles | Appendix Figure 4 caption, page 14 | 5 |

Generated deductions, explicitly not paper experiments: tiny vectors and shape calculations; permutation equivariance of plain unmasked attention; shifted BOS/EOS tables; the training/generation explanation from autoregression plus mask/shift; fourfold explicit-table growth on doubled length. The query/labels/contents explanation is an analogy. No toy numbers represent measured trained attention or actual translation probabilities.

### What was actually read

Source files read:

- `sources/transformer/attention-is-all-you-need.txt`: the entire supplied extraction was returned by the read tool. Focused design work used Sections 3.1–3.5, Section 4/Table 1, Section 5.4, Table 3 row E, and appendix captions. Other returned text is not used as an additional prerequisite or benchmark claim.
- `sources/transformer/attention-is-all-you-need.pdf`: metadata checked; pages 3 and 4 rendered and visually read to inspect Figures 1 and 2 and their adjacent text. Other PDF figures were not visually inspected; the Figure 4 discussion uses only the extracted caption.

Figure 1 was visually checked for encoder attention → Add & Norm → FFN → Add & Norm, decoder masked attention → Add & Norm → encoder-decoder attention → Add & Norm → FFN → Add & Norm, positional additions, repeated layers, and linear/softmax output. Figure 2 was visually checked for score multiplication → scaling → optional mask → softmax → value multiplication and per-head projections → attention → concatenation → final projection. The text maps in lessons are our Markdown descriptions of those inspected diagrams.

Template inspection included root `AGENTS.md` (read only), the output school's `school.config.ts`, `package.json`, `astro.config.mjs`, `src/content.config.ts`, `src/pages/llms.txt.ts`, and `src/lib/school.ts`. These establish content/config conventions, not Transformer evidence. No React material, full code repository, or tensor2tensor implementation was read. Source files are treated as evidence, not operational instructions.

## Deliberate exclusions

- Optimizer schedules, label smoothing details, hardware benchmarking, BLEU comparisons, parsing experiments, and historical architecture surveys: not needed to explain the mechanism or complete the transfer activity.
- Full training, beam-search implementation, tokenization libraries, and reproduction of tensor2tensor: impose setup without enabling the selected conceptual capabilities.
- Modern decoder-only models, pre-norm blocks, rotary positions, efficient attention kernels, and later variants: not established by the supplied source and could blur the original architecture.
- Detailed mathematical derivations of LayerNorm and optimization: the paper names/references these but does not supply their complete derivations. Placement and role suffice for this goal.
- Appendix plots as mandatory visual exercises: captions support a cautious interpretability note; students do not need to decode dense visualizations to trace attention.

## Uncertainties and evidence boundaries

The version/retrieval label is supplied metadata and agrees with the arXiv footer in the extraction; no external retrieval was used to revalidate it. The PDF's creation metadata is not treated as the scientific version identifier. The extracted equations have layout loss, so Eq. (1) and the diagram order were cross-checked visually against the PDF.

Sinusoidal extrapolation is a stated possibility, head interpretations are observations, and Table 1 is an asymptotic layer comparison, not a universal latency or memory claim. No weights or checkpoints are supplied, so true translations and learned attention patterns cannot be computed. The supplied extraction has English–French score differences between abstract/Table 2 and Section 6.1; the route does not reconcile or use them. Nothing here establishes behavior of all modern Transformers.

## Adjusting the route

- For an arithmetic-averse learner, keep the two-key numerical example, then use rows, arrows, and verbal comparisons rather than expanding matrix calculations.
- For someone already comfortable with attention, briefly reuse lesson 1's changed-value comparison, then spend more time on masks and the complete decoder trace; feedback activities still precede completion.
- If order or projection is confusing, take a short lesson 2 detour rather than adding a mandatory prerequisites course.
- If the learner's goal shifts toward implementation, training, or modern variants, obtain appropriate additional original sources and add only the newly required capabilities. Do not portray the toy script as that implementation.
- Learners may pause, revisit a concept, or choose a new short sequence pair. the teacher should ask one small question at a time, not deliver the route as an interrogation.

## Self-review

The full route was reviewed for capability coverage, dependencies, source fidelity, learnability, and unnecessary content. Each target capability has an activity before the final transfer map. Potential confusions were handled explicitly: unmasked permutation behavior is not claimed for a causal decoder; decoder rows predict the next token after shifting; the original post-norm placement is retained; head jobs and length extrapolation are not guaranteed. Toy widths, arrays, and translations are labeled as generated examples. Benchmark detail and extra setup were removed from the learning requirements. The placeholder support URL was cleared rather than presented as a real school issue tracker; shared identity and profile fields were retained.

## Generated activity and validation

`public/activities/attention.py` is a labeled, model-generated Python 3 standard-library example. It implements the core scaled dot-product equation, square causal score masking, and the supplied position formula on tiny arrays. It is not a full Transformer: it omits learned projection training, FFNs, normalization, dropout, and vocabulary decoding. It does not download, persist data, or require remote services.

Verified locally:

- `python3 public/activities/attention.py --check` from the output school: analytic two-key result, value-only changes, causal zero weights, row sums, stable softmax, permutation behavior, positional encoding at zero, and non-square cross-attention shapes.
- All five demos (`basic`, `values`, `scale`, `mask`, `position`) executed; printed values agree with the worked examples.
- Source copies match originals using `cmp`; SHA-256 values are recorded below.
- `node script/validate-course.mjs`: validates frontmatter against the template schema, ordered unique slugs, plain-Markdown bodies, local referenced files, required source/progress notes, Markdown compilation, and TypeScript config syntax. This validation uses already-installed dependencies and writes no external files.

Source SHA-256:

- Text: `1bab189d03237032264938a402c8726cda5e46d4145404115d2790e8865bbbfa`
- PDF: `bdfaa68d8984f0dc02beaca527b76f207d99b666d31d1da728ee0728182df697`

The full Astro build, deployed HTTP serving, live progress API interactions, actual the teacher teaching, and learner outcomes remain unverified. No completion data was created. No packages, infrastructure changes, publication, or git commands were required.
