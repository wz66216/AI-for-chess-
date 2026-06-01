# phase2_research/backend/app/schemas/

## Responsibility
Typed request/response contracts for the API and engine layers.

## Design
Pydantic DTOs define validation, serialization, and cross-layer data shape. Schemas separate transport concerns from service/engine logic and make API responses explicit.

## Flow
Incoming payloads are parsed into request models; service outputs are wrapped in response models before leaving API handlers. Whitebox schemas also constrain engine hyperparameters and visualization payloads.

## Integration
- Used by `app.api.analysis`, `app.api.whitebox`, and `app.services.llm_service` / `engine_service`
- Shared between request validation and response serialization
