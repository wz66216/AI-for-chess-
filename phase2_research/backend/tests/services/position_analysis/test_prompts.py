from app.schemas.analysis import AnalysisDepth, AnalysisMode, AudienceLevel
from app.services.position_analysis.prompts import build_draft_prompt, build_repair_prompt


def test_draft_prompt_contains_grounding_rules():
    prompt = build_draft_prompt(
        facts_json='{"side_to_move":"white"}',
        engine_json='{"lines":[]}',
        analysis_mode=AnalysisMode.MOVE,
        audience_level=AudienceLevel.INTERMEDIATE,
        analysis_depth=AnalysisDepth.STANDARD,
    )

    assert "JSON" in prompt
    assert "SAN" in prompt
    assert "不要编造" in prompt
    assert "白方视角" in prompt
    assert "必须使用中文" in prompt


def test_repair_prompt_contains_warnings_and_original_output():
    prompt = build_repair_prompt(
        facts_json='{"side_to_move":"white"}',
        engine_json='{"lines":[]}',
        original_output='{"bad": true}',
        warnings=["candidate move Qh5 is not in engine candidates"],
    )

    assert "candidate move Qh5 is not in engine candidates" in prompt
    assert '{"bad": true}' in prompt
    assert "字段值必须使用中文" in prompt
