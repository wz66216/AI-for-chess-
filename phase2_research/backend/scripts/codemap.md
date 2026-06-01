# phase2_research/backend/scripts/

## Responsibility
Offline utilities for benchmarking engine performance and generating charts from benchmark output.

## Design
Procedural script layer. `benchmark_runner.py` generates reproducible CSV measurements across preset positions and parameter sweeps; `generate_plots.py` transforms the latest CSV into publication-style plots.

## Flow
Benchmark script imports engines directly, runs searches over hardcoded FENs, and writes `results/*.csv`. Plot script reads the latest CSV, filters by engine type, and emits PNG files under `plots/`.

## Integration
- Depends on `app.engines.whitebox`
- Reads/writes `results/` and `plots/`
- Useful for regression checks and performance comparisons outside the API server
