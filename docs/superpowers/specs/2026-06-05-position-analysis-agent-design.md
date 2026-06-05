# Position Analysis Agent Design

## Goal

Build a reusable position-analysis agent for ChessExplain that is more reliable
than the current one-shot `LLMService.explain_move()` prompt, while keeping the
existing analysis page stable.

The first version should prioritize correctness and structure over personality.
It should support single-move explanation, pure position analysis, and a future
PGN review workflow through the same backend agent.

## Current State

The current analysis flow is:

```text
/api/v1/analyze-move
  -> EngineService.analyze_position(fen, move)
  -> LLMService.explain_move(fen, move, engine_eval)
  -> AnalyzeMoveResponse.explanation
```

`LLMService` currently does both orchestration and model calling. It builds a
single prompt from FEN, the played move, and Stockfish lines, then returns
Markdown text. This is fast to understand but has weak boundaries:

- no structured output contract;
- no hard validation of LLM claims;
- no shared path for pure position analysis and future PGN review;
- no explicit audience level or analysis depth;
- limited protection against invented moves, wrong score direction, or missed
  mate information.

## Chosen Approach

Use a new `PositionAnalysisAgent` layer.

`LLMService` becomes a lower-level OpenAI-compatible model client. The new agent
owns fact extraction, prompt construction, validation, repair, and fallback.

```text
EngineService
  -> PositionFactsBuilder
  -> PositionAnalysisAgent
      -> LLMService
      -> GroundingValidator
  -> AnalyzePositionResponse
```

This is deliberately not a full multi-agent system. The first version should be
small, testable, and reusable.

## Backend Structure

Add a focused package:

```text
phase2_research/backend/app/services/position_analysis/
  __init__.py
  agent.py
  facts_builder.py
  grounding_validator.py
  prompts.py
```

Responsibilities:

- `agent.py`: orchestrates the analysis flow.
- `facts_builder.py`: extracts chess facts from FEN, played move, and
  `EngineEvaluation`.
- `grounding_validator.py`: validates model output against hard facts and asks
  the model for one repair when needed.
- `prompts.py`: stores prompt templates for draft analysis and self-check.
- `llm_service.py`: remains the model transport layer.

## API Design

Add a new endpoint:

```text
POST /api/v1/analyze-position
```

Request:

```json
{
  "fen": "string",
  "played_move": "optional UCI or SAN",
  "analysis_mode": "position | move | review",
  "audience_level": "beginner | intermediate | advanced",
  "analysis_depth": "quick | standard | deep"
}
```

Semantics:

- `position`: analyze the current position without a user move.
- `move`: analyze the position and compare the played move with engine
  recommendations.
- `review`: reserved for future PGN review key-position analysis.

Defaults:

```json
{
  "analysis_mode": "position",
  "audience_level": "intermediate",
  "analysis_depth": "standard"
}
```

Response:

```json
{
  "fen": "string",
  "played_move": "string | null",
  "engine_eval": {
    "lines": []
  },
  "facts": {
    "side_to_move": "white | black",
    "played_move_san": "string | null",
    "is_check": true,
    "is_mate": false,
    "score_summary": "white_better | black_better | equal | mate"
  },
  "analysis": {
    "position_summary": "string",
    "candidate_moves": [
      {
        "move": "string",
        "rank": 1,
        "score": 0.42,
        "idea": "string",
        "pv": ["string"]
      }
    ],
    "tactical_themes": ["pin", "king_safety"],
    "plans": {
      "white": ["string"],
      "black": ["string"]
    },
    "move_commentary": {
      "played_move": "string | null",
      "quality": "best | excellent | good | inaccuracy | mistake | blunder | unknown",
      "comment": "string"
    },
    "training_tip": "string",
    "summary_markdown": "string"
  },
  "validation": {
    "status": "ok | repaired | fallback",
    "warnings": ["string"]
  }
}
```

Compatibility:

- Keep `/api/v1/analyze-move`.
- Internally route it through `PositionAnalysisAgent` in `move` mode.
- Continue returning the existing `AnalyzeMoveResponse` shape.
- Map `analysis.summary_markdown` back to the old `explanation` field.
- If the new agent is disabled or fails, the old prompt path remains available.

## Agent Flow

1. Validate request.
   - FEN must parse.
   - `played_move` must be present for `move` mode.
   - `played_move` is optional for `position` mode.

2. Run engine analysis.
   - Use `EngineService.analyze_position(fen, played_move?)`.
   - Preserve the existing white-centric score contract: positive means White
     is better, negative means Black is better.

3. Build facts.
   - side to move;
   - legal moves in UCI and SAN;
   - played move SAN if available;
   - check, checkmate, stalemate;
   - engine top candidates;
   - PV lines in SAN;
   - mate information;
   - score summary.

4. Draft analysis.
   - The LLM receives only facts, engine lines, requested audience level, and
     requested depth.
   - The LLM must output JSON matching the schema.
   - The LLM may not invent candidate moves or PV lines.

5. Rule validation.
   - JSON parses into the response schema.
   - Candidate moves are drawn from engine lines.
   - PV moves are drawn from engine PV data.
   - `score_summary` agrees with engine facts.
   - mate information is not contradicted.
   - `quality` is one of the allowed values.
   - Output uses SAN for user-facing moves.

6. LLM repair.
   - If validation finds problems, send facts, original output, and warnings to
     the model.
   - Ask it to repair only the JSON.
   - Attempt repair once.

7. Fallback.
   - If repair fails, return a conservative engine-facts-only response.
   - Set `validation.status = "fallback"`.
   - Include warnings explaining why the narrative was downgraded.

## Prompt Rules

The draft prompt must require:

- use SAN for all user-facing moves;
- do not cite moves outside legal moves, engine candidates, or PV;
- do not reverse white-centric score meaning;
- mate overrides ordinary centipawn descriptions;
- beginner explanations avoid dense PV detail;
- advanced explanations can discuss PV and score deltas more directly;
- quick depth is short, standard is balanced, deep includes more candidate
  comparison.

## Frontend Design

Add two compact controls near the analysis coach area:

```text
解释水平: 初学者 / 中级 / 高级
分析深度: 快速 / 标准 / 深入
```

Internal values:

```text
audience_level = beginner | intermediate | advanced
analysis_depth = quick | standard | deep
```

Defaults:

```text
audience_level = intermediate
analysis_depth = standard
```

Display:

- If structured `analysis` exists, render cards:
  - position summary;
  - candidate moves;
  - tactical themes;
  - plans for White and Black;
  - played move commentary;
  - training tip;
  - full coach summary markdown.
- If structured analysis is absent, keep the current markdown explanation.
- If `validation.status = fallback`, show a small notice that the language
  explanation is in conservative mode and mainly based on engine facts.

Search Lab should not use this agent in the first version. It remains focused
on whitebox search visualization. A later version can add an "explain this
search result" action.

## Configuration

Add an environment flag:

```env
ENABLE_POSITION_ANALYSIS_AGENT=true
```

When false:

- `/api/v1/analyze-move` uses the current `LLMService.explain_move()` behavior.
- `/api/v1/analyze-position` can either return a clear disabled response or
  use the facts-only fallback. The first implementation should prefer a clear
  disabled response for easier debugging.

## Testing

Backend:

- `PositionFactsBuilder`
  - valid and invalid FEN;
  - UCI played move to SAN;
  - check, checkmate, stalemate;
  - white-centric score summary;
  - mate priority.
- `GroundingValidator`
  - rejects nonexistent candidate moves;
  - rejects wrong score summary;
  - rejects invalid quality values;
  - falls back on parse failure.
- `PositionAnalysisAgent`
  - model output succeeds;
  - first output fails, repair succeeds;
  - first output and repair fail, fallback succeeds.
- API
  - `/analyze-position` returns the new structure;
  - `/analyze-move` remains compatible with the old response shape.

Frontend:

- controls change `audience_level` and `analysis_depth`;
- structured result renders cards;
- old markdown fallback still works;
- fallback validation status shows a notice.

## First-Version Scope

Included:

- backend `PositionAnalysisAgent`;
- facts builder;
- grounding validator;
- prompts;
- `/api/v1/analyze-position`;
- `/api/v1/analyze-move` compatibility path;
- frontend controls and structured display;
- focused tests.

Excluded:

- PGN full-review agent;
- long-term user skill profile;
- multi-turn analysis memory;
- Search Lab LLM explanation;
- automatic training puzzle recommendations.

These are intentionally left for later phases.

## Open Decisions

No unresolved product decisions remain for the first version. Implementation may
choose exact class names and Pydantic model file layout as long as the API
contract and boundaries above remain intact.
