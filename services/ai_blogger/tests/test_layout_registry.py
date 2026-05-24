from services.ai_blogger.layouts.registry import LayoutRegistry


def test_layout_registry_has_at_least_8_layouts():
    registry = LayoutRegistry()
    assert len(registry.list_layout_names()) >= 10
    assert "text_dense" in registry.list_layout_names()
    assert "list_bullets" in registry.list_layout_names()

def test_layout_registry_picks_diverse_layouts_for_article():
    registry = LayoutRegistry(rng_seed=0)
    layout_names = registry.pick_layouts_for_article(paragraph_count=10, min_unique=6)
    
    assert len(layout_names) == 10
    assert len(set(layout_names)) >= 6
