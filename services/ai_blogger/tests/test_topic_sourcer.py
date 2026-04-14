from services.ai_blogger.topic.topic_sourcer import TopicSourcer


def test_topic_sourcer_returns_10_unique_topics():
    sourcer = TopicSourcer()
    topics = sourcer.get_topics(count=10)

    assert len(topics) == 10
    assert len({t.topic_id for t in topics}) == 10


def test_topic_sourcer_has_axis_diversity():
    sourcer = TopicSourcer()
    topics = sourcer.get_topics(count=10)

    combos = {(t.axes.get("style"), t.axes.get("item"), t.axes.get("scene"), t.axes.get("culture")) for t in topics}
    assert len(combos) >= 6

