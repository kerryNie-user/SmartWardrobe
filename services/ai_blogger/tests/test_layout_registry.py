from services.ai_blogger.layouts.registry import LayoutRegistry


def test_layout_registry_has_at_least_8_layouts():
    registry = LayoutRegistry()
    assert len(registry.list_layout_names()) >= 8

def test_layout_registry_picks_diverse_layouts_for_article():
    registry = LayoutRegistry(rng_seed=0)
    layout_names = registry.pick_layouts_for_article(paragraph_count=10, min_unique=6)
    
    assert len(layout_names) == 10
    # With only 8 layouts total, picking 10 paragraphs will inevitably result in duplicates.
    # The minimum unique layouts picked should be equal to the total available (8)
    assert len(set(layout_names)) == 8
