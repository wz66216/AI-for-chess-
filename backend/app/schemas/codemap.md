# backend/app/schemas/

## Responsibility

Defines the API contract layer: typed request payloads and structured chess-analysis responses.

## Design

Pydantic models encode validation and response shape. Nested models separate move-level engine output from the outer move-analysis response, making the response stable for frontend rendering.

## Flow

Incoming JSON is parsed into `AnalyzeMoveRequest` or the local `AnalyzeGameRequest` in `api/analysis.py`. Service outputs are converted into `EngineEvaluation`/`PVLine` instances and serialized back to JSON.

## Integration

Consumed by `app.api.analysis`, `app.services.engine_service`, and `app.services.llm_service`. The schema definitions bind the service layer to the external FastAPI contract.
