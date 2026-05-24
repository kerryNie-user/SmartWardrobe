import os
import json
import logging
import re
from typing import Dict, List

# Setup simple logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

ALLOWED_EVIDENCE_TYPES = {
    "mood",
    "silhouette",
    "material",
    "trend",
    "runway",
    "comparison",
    "how_to",
    "pitfall",
    "quote",
    "closing",
}


def _fallback_evidence_type(section_name: str) -> str:
    section = str(section_name or "").strip().lower()
    if "结语" in section or "closing" in section or "conclusion" in section:
        return "closing"
    if "误区" in section or "pitfall" in section or "mistake" in section:
        return "pitfall"
    if "实操" in section or "how" in section or "tips" in section:
        return "how_to"
    if "秀场" in section or "runway" in section:
        return "runway"
    if "材质" in section or "面料" in section or "material" in section:
        return "material"
    if "廓形" in section or "silhouette" in section:
        return "silhouette"
    if "对照" in section or "comparison" in section:
        return "comparison"
    if "引用" in section or "quote" in section:
        return "quote"
    return "trend"


def normalize_evidence_type(value: object, section_name: str = "") -> str:
    normalized = str(value or "").strip().lower()
    if normalized in ALLOWED_EVIDENCE_TYPES:
        return normalized

    fallback = _fallback_evidence_type(section_name)
    logging.warning(
        "Invalid outline evidence_type '%s' for section '%s'; falling back to '%s'. Allowed values: %s",
        value,
        section_name,
        fallback,
        ", ".join(sorted(ALLOWED_EVIDENCE_TYPES)),
    )
    return fallback


UNSOURCED_BRAND_PATTERN = re.compile(
    r"(?:观察|参考|如|以)?\s*(?:"
    r"Lemaire|Jil Sander|Balenciaga|Vogue|Dries van Noten|Loewe|Max Mara|Prada|Miu Miu|The Row|Bottega Veneta|Schiaparelli|Maison Margiela|Comme des Garçons|Comme des Garcons|Hermès|Hermes|Chanel|Dior|Gucci|Saint Laurent|JW Anderson"
    r")\s*(?:20\d{2})?(?:\s*(?:春夏|秋冬|高定|Fall/Winter|Spring/Summer|SS|FW|S/S|F/W))?[^，。；;]*",
    re.IGNORECASE,
)

FORBIDDEN_UNSOURCED_CLAIM_PATTERN = re.compile(
    r"(涩谷|东京|#[A-Za-z0-9_\-\u4e00-\u9fff]+|UGC|万条|全网|业内认为|数据显示|销售|排名|OfficeRebel|秀场|T台|Schiaparelli|Jil Sander|Dries van Noten|JW Anderson|(?:19|20)\d{2}年代|(?:19|20)\d{2}年|女性主义|非二元|去性别化|身体宣言|被凝视|凝视|身体政治|身体主权|身体语言|身份叙事|权力秩序|规训|标准身材|压迫|具象化仪式|重新校准|显高公式|悄然退场|身高管理|隐秘语言|审美霸权|工具化|无声抵抗|沉默说话|底层逻辑|呼吸权|精密实验|适应性进化|优雅的本质|公式|÷|Visual reference|Visible outfit|清楚的上下关系|明确宽度|清晰宽度|清晰比例差|稳定比例\.\d+|\d+(?:\.\d+)?\s*(?:cm|厘米|%)|\d+\s*[/：:]\s*\d+)",
    re.IGNORECASE,
)

PARAGRAPH_CHAR_LIMIT = 260


FASHION_KEYWORD_MAP = [
    ("青绿色", ["teal"]),
    ("青绿", ["teal"]),
    ("绿色", ["green"]),
    ("墨绿", ["green"]),
    ("酒红", ["burgundy"]),
    ("红色", ["red"]),
    ("黄色", ["yellow"]),
    ("白色", ["white"]),
    ("黑色", ["black"]),
    ("蓝色", ["blue"]),
    ("浅蓝", ["blue"]),
    ("牛仔", ["denim", "jeans"]),
    ("皮革", ["leather"]),
    ("羊毛", ["wool"]),
    ("毛呢", ["wool"]),
    ("针织", ["knit"]),
    ("织物", ["fabric"]),
    ("材质", ["texture"]),
    ("肌理", ["texture"]),
    ("花卉", ["floral"]),
    ("条纹", ["striped"]),
    ("印花", ["printed"]),
    ("无袖", ["sleeveless"]),
    ("背心", ["tank"]),
    ("短袖", ["short", "sleeve"]),
    ("连体裤", ["jumpsuit"]),
    ("阔腿裤", ["wide", "trousers"]),
    ("长裤", ["trousers"]),
    ("裤装", ["trousers"]),
    ("运动裤", ["sweatpants"]),
    ("牛仔裤", ["jeans"]),
    ("连帽衫", ["hoodie"]),
    ("卫衣", ["hoodie"]),
    ("T恤", ["t-shirt"]),
    ("t恤", ["t-shirt"]),
    ("上衣", ["top"]),
    ("衬衫", ["shirt"]),
    ("外套", ["jacket"]),
    ("风衣", ["trench", "coat"]),
    ("大衣", ["coat"]),
    ("半裙", ["skirt"]),
    ("灰裙", ["gray", "skirt"]),
    ("裙", ["skirt"]),
    ("裹身裙", ["wrap", "dress"]),
    ("连衣裙", ["dress"]),
    ("礼服", ["dress"]),
    ("手袋", ["bag"]),
    ("编织包", ["woven", "bag"]),
    ("运动鞋", ["sneakers"]),
    ("墨镜", ["sunglasses"]),
    ("高领", ["turtleneck"]),
    ("深 V", ["v-neck"]),
    ("深V", ["v-neck"]),
    ("V领", ["v-neck"]),
    ("收腰", ["waist"]),
    ("廓形", ["silhouette"]),
    ("叠穿", ["layered"]),
    ("通勤", ["commute"]),
    ("约会", ["date"]),
    ("展览", ["gallery"]),
    ("办公室", ["office"]),
    ("职场", ["office"]),
    ("基础款", ["basic"]),
    ("极简", ["minimal"]),
]

FASHION_KEYWORD_STOPWORDS = {
    "fashion",
    "editorial",
    "photography",
    "style",
    "look",
    "outfit",
    "visual",
    "reference",
    "only",
    "for",
    "the",
    "and",
    "with",
}

IMAGE_SEARCH_DROPWORDS = {
    "waist",
    "silhouette",
    "tailoring",
    "tailored",
    "proportion",
    "editorial",
    "photography",
    "reference",
    "visual",
    "outfit",
    "style",
    "details",
    "close",
    "texture",
    "minimal",
    "background",
}

IMAGE_SEARCH_KEEPWORDS = {
    "black",
    "white",
    "red",
    "blue",
    "green",
    "teal",
    "yellow",
    "burgundy",
    "gray",
    "grey",
    "sleeveless",
    "belted",
    "jumpsuit",
    "blazer",
    "trousers",
    "pants",
    "jeans",
    "denim",
    "dress",
    "skirt",
    "shirt",
    "tank",
    "top",
    "coat",
    "jacket",
    "trench",
    "leather",
    "knit",
}

DRIFT_NEEDLES = {
    "羊毛": ["wool"],
    "毛呢": ["wool"],
    "针织": ["knit"],
    "约会": ["date"],
    "展览": ["gallery"],
    "通勤": ["commute"],
    "办公室": ["office"],
    "职场": ["office"],
    "职业": ["office"],
    "旅行": ["travel"],
    "社交": ["social"],
    "西装": ["blazer"],
    "背心": ["tank"],
    "衬衫": ["shirt"],
    "牛仔裤": ["jeans"],
    "半裙": ["skirt"],
    "连衣裙": ["dress"],
    "风衣": ["trench", "coat"],
    "外套": ["jacket", "blazer", "coat"],
}

DRIFT_REPLACEMENTS = {
    "羊毛": "挺括面料",
    "毛呢": "挺括面料",
    "针织": "柔软面料",
    "约会": "稍放松穿法",
    "展览": "走动状态",
    "通勤": "日常穿法",
    "办公室": "正式穿法",
    "职场": "正式穿法",
    "职业": "正式",
    "旅行": "走动状态",
    "社交": "稍正式穿法",
    "灰裙": "下装线条",
}


def _has_latin_word(value: str) -> bool:
    return bool(re.search(r"[A-Za-z]{3,}", str(value or "")))


def _append_unique(tokens: list[str], values: list[str], limit: int) -> None:
    for value in values:
        normalized = str(value or "").strip().lower()
        if not normalized or normalized in FASHION_KEYWORD_STOPWORDS:
            continue
        if normalized not in tokens:
            tokens.append(normalized)
        if len(tokens) >= limit:
            break


def _short_english_fashion_keyword(*values: object, fallback: str = "fashion outfit", limit: int = 4) -> str:
    joined = " ".join(str(value or "") for value in values if str(value or "").strip())
    tokens: list[str] = []

    for needle, mapped_tokens in FASHION_KEYWORD_MAP:
        if needle == "绿色" and ("青绿色" in joined or "青绿" in joined):
            continue
        if needle.lower() in joined.lower():
            _append_unique(tokens, mapped_tokens, limit)
        if len(tokens) >= limit:
            break

    if len(tokens) < limit:
        latin_tokens = [
            token
            for token in re.split(r"[^A-Za-z0-9-]+", joined.lower())
            if len(token) > 2 and token not in FASHION_KEYWORD_STOPWORDS
        ]
        _append_unique(tokens, latin_tokens, limit)

    if not tokens:
        fallback_tokens = [
            token
            for token in re.split(r"[^A-Za-z0-9-]+", str(fallback or "fashion outfit").lower())
            if len(token) > 2 and token not in FASHION_KEYWORD_STOPWORDS
        ]
        _append_unique(tokens, fallback_tokens, limit)

    return " ".join(tokens[:limit]) or "fashion outfit"


def _normalize_visual_anchor(angle_result: dict, raw_topic: str = "") -> dict:
    source = angle_result.get("visual_anchor") if isinstance(angle_result, dict) else {}
    source = source if isinstance(source, dict) else {}
    style_en = str(angle_result.get("style_en") or "").strip() if isinstance(angle_result, dict) else ""
    primary_outfit = str(source.get("primary_outfit") or source.get("primaryLook") or "").strip()
    if not primary_outfit:
        primary_outfit = style_en or str(raw_topic or "fashion outfit").strip() or "fashion outfit"
    if not _has_latin_word(primary_outfit):
        primary_outfit = _short_english_fashion_keyword(primary_outfit, style_en, raw_topic)
    keywords = source.get("visual_keywords") or source.get("visualKeywords") or []
    if isinstance(keywords, str):
        keywords = [keywords]
    keywords = [str(item).strip() for item in keywords if str(item or "").strip()]
    if not keywords and style_en:
        keywords = [style_en]
    normalized_keywords = []
    for keyword in keywords:
        if _has_latin_word(keyword):
            normalized_keywords.append(keyword)
        else:
            normalized_keywords.append(_short_english_fashion_keyword(keyword, primary_outfit, raw_topic))
    image_boundary = str(
        source.get("image_boundary")
        or source.get("imageBoundary")
        or "Images are visual styling references only, not proof of a real event, brand case, street-style sighting, runway look, or market data."
    ).strip()
    return {
        "primary_outfit": primary_outfit,
        "visual_keywords": normalized_keywords[:6],
        "image_boundary": image_boundary,
    }


def _query_mentions_anchor(search_keyword: str, primary_outfit: str) -> bool:
    query_words = {word for word in re.split(r"[^a-z0-9]+", search_keyword.lower()) if len(word) > 2}
    anchor_words = {word for word in re.split(r"[^a-z0-9]+", primary_outfit.lower()) if len(word) > 2}
    if not anchor_words:
        return True
    return bool(query_words & anchor_words)


def _anchor_tokens(primary_outfit: str) -> set[str]:
    return {word for word in re.split(r"[^a-z0-9-]+", str(primary_outfit or "").lower()) if len(word) > 2}


def _compact_image_search_keyword(primary_outfit: str, visual_keywords: list[str] | None = None) -> str:
    source = " ".join([primary_outfit, *(visual_keywords or [])])
    raw_tokens = [
        token
        for token in re.split(r"[^A-Za-z0-9-]+", source.lower())
        if len(token) > 2 and token not in IMAGE_SEARCH_DROPWORDS and token not in FASHION_KEYWORD_STOPWORDS
    ]
    tokens: list[str] = []
    for token in raw_tokens:
        if token in IMAGE_SEARCH_KEEPWORDS and token not in tokens:
            tokens.append(token)
        if len(tokens) >= 4:
            break
    if not tokens:
        tokens = [
            token
            for token in re.split(r"[^A-Za-z0-9-]+", str(primary_outfit or "fashion outfit").lower())
            if len(token) > 2 and token not in IMAGE_SEARCH_DROPWORDS and token not in FASHION_KEYWORD_STOPWORDS
        ][:4]
    if "woman" not in tokens and "menswear" not in tokens and "man" not in tokens:
        tokens.append("woman")
    if "fashion" not in tokens:
        tokens.append("fashion")
    return " ".join(tokens[:6]).strip() or "woman fashion outfit"


def normalize_image_queries(image_queries: object, *, visual_anchor: dict, images_required: int = 1) -> list[dict]:
    primary_outfit = str((visual_anchor or {}).get("primary_outfit") or "fashion outfit").strip() or "fashion outfit"
    if not _has_latin_word(primary_outfit):
        primary_outfit = _short_english_fashion_keyword(primary_outfit)
    boundary = str((visual_anchor or {}).get("image_boundary") or "").strip()
    visual_keywords = (visual_anchor or {}).get("visual_keywords") or []
    if isinstance(visual_keywords, str):
        visual_keywords = [visual_keywords]
    required_count = max(0, int(images_required or 0))
    if required_count == 0:
        return []
    source_queries = image_queries if isinstance(image_queries, list) else []
    normalized = []
    anchor_search_keyword = _compact_image_search_keyword(primary_outfit, [str(item) for item in visual_keywords])
    for query in source_queries[:required_count]:
        if isinstance(query, dict):
            item = dict(query)
            search_keyword = str(item.get("search_keyword") or item.get("query") or "").strip()
        else:
            item = {}
            search_keyword = str(query or "").strip()
        if not search_keyword or not _query_mentions_anchor(search_keyword, primary_outfit):
            search_keyword = anchor_search_keyword
        if not _has_latin_word(search_keyword):
            search_keyword = anchor_search_keyword
        if UNSOURCED_BRAND_PATTERN.search(search_keyword) or re.search(r"\b(?:runway|street\s*style\s*sighting|market\s*data)\b", search_keyword, re.IGNORECASE):
            search_keyword = anchor_search_keyword
        item["search_keyword"] = anchor_search_keyword
        item["visual_anchor"] = primary_outfit
        if boundary:
            item["image_boundary"] = boundary
        if item.get("image_caption"):
            item["image_caption"] = sanitize_unsourced_claims(item.get("image_caption"))
            item["image_caption"] = sanitize_visual_anchor_drift(item.get("image_caption"), {"primary_outfit": primary_outfit, "visual_keywords": visual_keywords})
        if item.get("image_alt"):
            item["image_alt"] = sanitize_unsourced_claims(item.get("image_alt"))
            item["image_alt"] = sanitize_visual_anchor_drift(item.get("image_alt"), {"primary_outfit": primary_outfit, "visual_keywords": visual_keywords})
        normalized.append(item)
    while len(normalized) < required_count:
        normalized.append(
            {
                "search_keyword": anchor_search_keyword,
                "visual_anchor": primary_outfit,
                "image_boundary": boundary,
                "image_caption": "同一主造型的视觉参考，强调廓形、比例和穿着状态",
                "image_alt": "同一主造型的图片参考",
            }
        )
    return normalized


def find_visual_anchor_drift(text: object, visual_anchor: dict | None) -> list[str]:
    primary_outfit = str((visual_anchor or {}).get("primary_outfit") or "").strip()
    if not primary_outfit:
        return []
    anchor_words = _anchor_tokens(_compact_image_search_keyword(primary_outfit, (visual_anchor or {}).get("visual_keywords") or []))
    if not anchor_words:
        return []
    text_value = str(text or "")
    drift = []
    for needle, mapped_tokens in DRIFT_NEEDLES.items():
        if needle not in text_value:
            continue
        if anchor_words.isdisjoint({token.lower() for token in mapped_tokens}):
            drift.append(needle)
    return list(dict.fromkeys(drift))


def sanitize_visual_anchor_drift(text: object, visual_anchor: dict | None) -> str:
    cleaned = str(text or "")
    for term in find_visual_anchor_drift(cleaned, visual_anchor):
        replacement = DRIFT_REPLACEMENTS.get(term, "主造型")
        cleaned = cleaned.replace(term, replacement)
    return cleaned


def find_forbidden_unsourced_claims(text: object) -> list[str]:
    matches = FORBIDDEN_UNSOURCED_CLAIM_PATTERN.findall(str(text or ""))
    seen = []
    for match in matches:
        value = str(match).strip()
        if value and value not in seen:
            seen.append(value)
    return seen


def assess_post_quality(
    post: dict,
    *,
    has_source: bool = False,
    missing_hero: bool | None = None,
    missing_media: list[dict] | None = None,
    visual_anchor: dict | None = None,
) -> dict:
    paragraphs = post.get("paragraphs", []) if isinstance(post, dict) else []
    forbidden_claims = []
    paragraph_too_long = []
    theme_drift = []
    title_text = str(post.get("title") or "") if isinstance(post, dict) else ""
    if title_text and not has_source:
        for term in find_forbidden_unsourced_claims(title_text):
            forbidden_claims.append({"paragraph_index": "title", "term": term})
    for term in find_visual_anchor_drift(title_text, visual_anchor):
        theme_drift.append({"paragraph_index": "title", "term": term})
    for idx, paragraph in enumerate(paragraphs):
        if not isinstance(paragraph, dict):
            continue
        text = str(paragraph.get("text") or "")
        if not has_source:
            for term in find_forbidden_unsourced_claims(text):
                forbidden_claims.append({"paragraph_index": idx, "term": term})
        if len(text) > PARAGRAPH_CHAR_LIMIT:
            paragraph_too_long.append(
                {
                    "paragraph_index": idx,
                    "length": len(text),
                    "limit": PARAGRAPH_CHAR_LIMIT,
                }
            )
        for term in find_visual_anchor_drift(text, visual_anchor):
            theme_drift.append({"paragraph_index": idx, "term": term})

    if missing_hero is None:
        first = paragraphs[0] if paragraphs and isinstance(paragraphs[0], dict) else {}
        has_hero_query = bool(first.get("image_queries") or first.get("image_urls") or first.get("imageUrls"))
        missing_hero = not has_hero_query

    missing_media = list(missing_media or [])
    failed = bool(forbidden_claims or paragraph_too_long or missing_hero or missing_media or theme_drift)
    return {
        "missing_hero": bool(missing_hero),
        "missing_media": missing_media,
        "forbidden_claims": forbidden_claims,
        "paragraph_too_long": paragraph_too_long,
        "theme_drift": theme_drift,
        "quality_gate_status": "failed" if failed else "passed",
    }


def attach_quality_report(post: dict, report: dict) -> dict:
    if isinstance(post, dict):
        post["quality_report"] = report
        post["_quality_gate_failed"] = report.get("quality_gate_status") != "passed"
    return post


def sanitize_unsourced_claims(text: object) -> str:
    """Soften autonomous AI copy that looks like sourced fashion evidence."""
    cleaned = str(text or "")
    if not cleaned:
        return ""

    replacements = [
        (r"肩宽\s*[≤<=＜＞>=]+\s*胸围\s*\d+\s*/\s*\d+", "肩线不过度外扩"),
        (r"肩线与腰线保持\s*\d+\s*[:：]\s*\d+\s*的垂直落差", "肩线与腰线保持明确但不紧绷的上下关系"),
        (r"\d+(?:\.\d+)?\s*(?:cm|厘米)\s*(?:与|和|到|至|-)\s*\d+(?:\.\d+)?\s*(?:cm|厘米)\s*身高差", "不同身高"),
        (r"显高\s*\d+(?:\.\d+)?\s*(?:cm|厘米)", "拉长视觉比例"),
        (r"\d+(?:\.\d+)?\s*[–-]\s*\d+(?:\.\d+)?\s*(?:cm|厘米)", "清晰的尺寸差"),
        (r"(?:上午|下午)?\d+点，[^，。；;]*(?:公司|写字楼|电梯口|CBD|街头|街角|咖啡馆)[^，。；;]*，一位", "通勤场景里，一位"),
        (r"右襟比左襟长出\d+(?:\.\d+)?厘米", "右襟与左襟形成明确长短差"),
        (r"腰线却?向[^，。；;]*?偏移\d+(?:\.\d+)?厘米", "腰线向一侧微微偏移"),
        (r"下摆长度差[≥><=＜＞]*\d+(?:\.\d+)?cm", "下摆长短差足够清晰"),
        (r"腰线位置偏移[≥><=＜＞]*\d+(?:\.\d+)?cm", "腰线位置有清晰偏移"),
        (r"下摆差\d+(?:\.\d+)?[–-]\d+(?:\.\d+)?cm", "清晰的下摆长短差"),
        (r"高跟鞋（>\d+(?:\.\d+)?cm）", "高跟鞋"),
        (r"肩宽\d+(?:\.\d+)?倍", "肩线稳定"),
        (r"腰线偏移\d+(?:\.\d+)?cm", "腰线轻微偏移"),
        (r"裙长控制在膝上\d+(?:\.\d+)?cm", "裙长控制在膝上附近"),
        (r"下摆差[＜<]\d+(?:\.\d+)?cm", "下摆差过小"),
        (r"袖窿预留\d+(?:\.\d+)?cm", "袖窿保留活动余量"),
        (r"腋下弧度达\d+(?:\.\d+)?°", "腋下弧度更顺畅"),
    ]
    for pattern, replacement in replacements:
        cleaned = re.sub(pattern, replacement, cleaned, flags=re.IGNORECASE)

    cleaned = re.sub(
        r"从?\s*20\d{2}(?:春夏|秋冬)\s*(?:到|至|-)\s*20\d{2}(?:春夏|秋冬)[，,、]?",
        "在近季造型语境里，",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r"(?:对比|参考|来自|源自)?\s*20\d{2}(?:春夏|秋冬)造型参考[^，。；;]*",
        "对比更松垮的造型参考",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r"20\d{2}(?:春夏|秋冬)[^，。；;]*(?:趋势|回归|复兴|深化|常见|流行)[^，。；;]*",
        "近季造型讨论中可以看到相似方向",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = UNSOURCED_BRAND_PATTERN.sub("从 2025-2026 的廓形趋势观察", cleaned)
    cleaned = re.sub(
        r"20\d{2}(?:春夏|秋冬)[^，。；;]*，从 2025-2026 的廓形趋势观察",
        "从 2025-2026 的廓形趋势观察",
        cleaned,
    )
    cleaned = re.sub(
        r"20\d{2}(?:春夏|秋冬)[^，。；;]*?(?:秀场|runway)[^，。；;]*",
        "从近季廓形观察看",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r"20\d{2}年[‘']([^’']+)[’']趋势",
        r"近季“\1”讨论",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r"正如20\d{2}年[^，。；;]*?所强调的[——，,:：]*",
        "换一种更日常的说法，",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r"Instagram\s*#[^，。；;]*?(?:的热度)?(?:在\d+月达峰值)?[^，。；;]*",
        "社媒穿搭讨论中",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r"(?:社媒平台|小红书|微博|TikTok|Instagram)?\s*#[A-Za-z0-9_\-\u4e00-\u9fff]+[^，。；;]*(?:UGC|热度|话题|内容)[^，。；;]*",
        "社媒穿搭讨论中",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(r"#[A-Za-z0-9_\-\u4e00-\u9fff]+", "社媒穿搭讨论", cleaned)
    cleaned = re.sub(r"用户平均上传\d+(?:\.\d+)?张不同搭配图", "不少穿搭示例", cleaned)
    cleaned = re.sub(r"其中\d+(?:\.\d+)?%选择", "其中不少人选择", cleaned)
    cleaned = re.sub(r"超?\d+(?:\.\d+)?万?条\s*UGC内容", "大量穿搭内容", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"(?:每日)?久坐\d+(?:\.\d+)?小时以上", "长期久坐", cleaned)
    cleaned = re.sub(r"\d+(?:\.\d+)?小时以上久坐", "长期久坐", cleaned)
    cleaned = re.sub(r"\d+(?:\.\d+)?\s*(?:cm|厘米)", "可见的尺寸差", cleaned)
    cleaned = re.sub(r"\d+(?:\.\d+)?\s*(?:°|度)", "清晰的角度", cleaned)
    cleaned = re.sub(r"\d+\s*/\s*\d+", "稳定比例", cleaned)
    cleaned = re.sub(r"\d+\s*[:：]\s*\d+", "稳定比例", cleaned)
    cleaned = re.sub(r"\d+(?:\.\d+)?\s*%", "一部分", cleaned)
    cleaned = re.sub(r"\d+(?:\.\d+)?\s*张", "多组", cleaned)
    cleaned = re.sub(r"\d+(?:\.\d+)?\s*倍", "更稳定的比例", cleaned)
    cleaned = re.sub(r"数据显示[^，。；;]*", "从造型观察看", cleaned)
    cleaned = re.sub(r"销售[^，。；;]*(?:排名|榜|增长)[^，。；;]*", "零售语境里的可见度", cleaned)
    cleaned = re.sub(
        r"正如时尚理论家[^：:，。；;]*[：:][“‘\"]?[^”’\"。]*[”’\"]?",
        "换一种更日常的说法",
        cleaned,
    )
    cleaned = cleaned.replace("这不是偶然的街拍", "这不是单纯的造型姿态")
    cleaned = cleaned.replace("因含适度桑蚕丝", "借由带有光泽的混纺纤维")
    cleaned = cleaned.replace("从 2025-2026 的廓形趋势观察，均以同款微喇裤为收尾", "从 2025-2026 的廓形趋势观察，微喇裤常被用作收束下半身比例的单品")
    cleaned = cleaned.replace("当适度职场女性", "当职场女性")
    cleaned = cleaned.replace("腰线高于肚脐适度", "腰线略高于肚脐")
    cleaned = cleaned.replace("至少适度脚踝空隙", "清晰的脚踝空隙")
    cleaned = cleaned.replace("裤脚留白约适度", "裤脚保留清晰留白")
    cleaned = cleaned.replace("裤脚留白约可见的尺寸差", "裤脚保留清晰留白")
    cleaned = cleaned.replace("超过肩宽适度", "明显超过肩宽")
    cleaned = cleaned.replace("全网正在流行", "近季穿搭讨论中可以看到")
    cleaned = cleaned.replace("全网", "近季穿搭讨论")
    cleaned = cleaned.replace("业内认为", "可以把它理解为")
    cleaned = re.sub(r"20\d{2}早春", "近季", cleaned)
    cleaned = re.sub(r"(?:19|20)\d{2}年代", "过往时期", cleaned)
    cleaned = re.sub(r"(?:19|20)\d{2}年", "近年", cleaned)
    cleaned = cleaned.replace("高频出现", "可以被看到")
    cleaned = cleaned.replace("实现可见的尺寸差与可见的尺寸差身高差的视觉平衡", "适配不同身高的视觉平衡")
    cleaned = cleaned.replace("可见的尺寸差与可见的尺寸差身高差", "不同身高")
    cleaned = cleaned.replace("实测对比", "比例对比")
    cleaned = cleaned.replace("实测", "比例观察")
    cleaned = cleaned.replace("1–可见的尺寸差", "清晰的尺寸差")
    cleaned = cleaned.replace("3–可见的尺寸差", "低跟鞋")
    cleaned = cleaned.replace("≥清晰的角度", "清晰的转折角")
    cleaned = cleaned.replace("＞清晰的角度", "更明确的转折角")
    cleaned = cleaned.replace(">清晰的角度", "更明确的转折角")
    cleaned = cleaned.replace("肩线微抬清晰的角度", "肩线微微抬起")
    cleaned = cleaned.replace("清晰的角度", "明确的转折")
    cleaned = cleaned.replace("＞可见的尺寸差", "具备可见位移")
    cleaned = cleaned.replace(">可见的尺寸差", "具备可见位移")
    cleaned = cleaned.replace("高于肚脐清晰的尺寸差", "略高于肚脐")
    cleaned = cleaned.replace("自然腰围清晰的尺寸差", "自然腰围上方")
    cleaned = cleaned.replace("腰线克制收紧可见的尺寸差", "腰线克制收紧")
    cleaned = cleaned.replace("下摆留白可见的尺寸差", "下摆保留清晰留白")
    cleaned = cleaned.replace("可见的尺寸差", "清晰的比例差")
    cleaned = cleaned.replace("肩线低清晰的比例差以上", "肩线至少低于自然肩线")
    cleaned = cleaned.replace("缝线偏移清晰的比例差以上", "缝线偏移足够明显")
    cleaned = cleaned.replace("从 2025-2026 的廓形趋势观察，从 2025-2026 的廓形趋势观察", "从 2025-2026 的廓形趋势观察")
    cleaned = cleaned.replace("当前审美正经历一次显著转向", "这套造型可以被读作一次更具体的比例转向")
    cleaned = cleaned.replace("当下审美对‘女性表达’的新共识", "一种更克制的造型判断")
    cleaned = cleaned.replace("当下审美对“女性表达”的新共识", "一种更克制的造型判断")
    cleaned = cleaned.replace("从 2025-2026 的廓形趋势观察，将此廓形从实验设计推向主流审美共识", "从造型本身看，这类收腰廓形的价值更适合落在日常选择")
    cleaned = cleaned.replace("从 2025-2026 的廓形趋势观察。", "从近季廓形观察看。")
    cleaned = cleaned.replace("从 2025-2026 的廓形趋势观察", "从近季廓形观察看")
    cleaned = cleaned.replace("品牌不再强调‘修身’", "造型重点不再只看‘修身’")
    cleaned = cleaned.replace("品牌不再强调“修身”", "造型重点不再只看“修身”")
    cleaned = cleaned.replace("2025年社媒中可以被看到‘反向剪裁’挑战，如社媒穿搭讨论，", "一些穿搭内容会把")
    cleaned = cleaned.replace("2025年社媒中可以被看到“反向剪裁”挑战，如社媒穿搭讨论，", "一些穿搭内容会把")
    cleaned = re.sub(r"20\d{2}年社媒中可以被看到[^，。；;]*", "一些穿搭内容会把腰线与肩线作为造型重点", cleaned)
    cleaned = re.sub(r"近年社媒中可以被看到[^，。；;]*", "一些穿搭内容会把腰线与肩线作为造型重点", cleaned)
    cleaned = re.sub(r"近季预告中[^：:，。；;]*[：:]", "从可见廓形看，", cleaned)
    cleaned = cleaned.replace("‘微廓型收腰’趋势信号明确", "微廓型收腰更适合用细节判断")
    cleaned = cleaned.replace("“微廓型收腰”趋势信号明确", "微廓型收腰更适合用细节判断")
    cleaned = cleaned.replace("新身体政治正在成型", "一种更清晰的穿着边界正在形成")
    cleaned = cleaned.replace("身体政治", "穿着边界")
    cleaned = cleaned.replace("身体自主权", "穿着主动感")
    cleaned = cleaned.replace("身体主权", "穿着主动感")
    cleaned = cleaned.replace("身体凝视权", "穿着主动感")
    cleaned = cleaned.replace("凝视权", "穿着主动感")
    cleaned = cleaned.replace("穿着主动感", "穿着判断")
    cleaned = cleaned.replace("社会心理的晴雨表", "比例判断的切入点")
    cleaned = cleaned.replace("社会心理晴雨表", "比例判断")
    cleaned = cleaned.replace("被凝视定义", "被单一比例定义")
    cleaned = cleaned.replace("凝视定义", "单一比例定义")
    cleaned = cleaned.replace("身体宣言", "造型判断")
    cleaned = cleaned.replace("身体真实状态", "真实穿着状态")
    cleaned = cleaned.replace("身体缺陷", "身体特征")
    cleaned = cleaned.replace("女性主义、非二元美学与去性别化潮流", "更松弛的日常审美")
    cleaned = cleaned.replace("女性主义", "日常审美")
    cleaned = cleaned.replace("非二元美学", "更开放的廓形审美")
    cleaned = cleaned.replace("去性别化潮流", "中性化穿着语境")
    cleaned = cleaned.replace("舒适即正义，边界即自由", "舒适与清晰边界同样重要")
    cleaned = cleaned.replace("身体语言", "造型语言")
    cleaned = cleaned.replace("精密实验", "比例练习")
    cleaned = cleaned.replace("呼吸权", "活动余量")
    cleaned = cleaned.replace("空间活动余量", "活动余量")
    cleaned = cleaned.replace("适应性进化", "实际适配")
    cleaned = cleaned.replace("服装系统对人类运动路径的实际适配", "服装对行走和转身的适配")
    cleaned = cleaned.replace("精密实验", "比例练习")
    cleaned = cleaned.replace("呼吸权", "活动余量")
    cleaned = cleaned.replace("空间活动余量", "活动余量")
    cleaned = cleaned.replace("适应性进化", "实际适配")
    cleaned = cleaned.replace("服装系统对人类运动路径的实际适配", "服装对行走和转身的适配")
    cleaned = cleaned.replace("服饰也该学会让位", "服饰也需要保留活动余量")
    cleaned = cleaned.replace("精密实验", "比例练习")
    cleaned = cleaned.replace("呼吸权", "活动余量")
    cleaned = cleaned.replace("空间活动余量", "活动余量")
    cleaned = cleaned.replace("适应性进化", "实际适配")
    cleaned = cleaned.replace("服装系统对人类运动路径的实际适配", "服装对行走和转身的适配")
    cleaned = cleaned.replace("标准身材的压迫", "单一比例标准")
    cleaned = cleaned.replace("标准身材", "单一比例标准")
    cleaned = cleaned.replace("压迫", "限制")
    cleaned = cleaned.replace("具象化仪式", "具体表达")
    cleaned = cleaned.replace("重新校准自己的边界", "找到更清晰的穿着边界")
    cleaned = cleaned.replace("显高公式", "比例公式")
    cleaned = cleaned.replace("悄然退场", "不再是唯一答案")
    cleaned = cleaned.replace("身高管理语言", "比例调整方法")
    cleaned = cleaned.replace("身高管理", "比例调整")
    cleaned = cleaned.replace("隐秘语言", "具体方法")
    cleaned = cleaned.replace("底层逻辑", "关键逻辑")
    cleaned = cleaned.replace("工具化", "单一化")
    cleaned = cleaned.replace("单一审美霸权的克制抵抗", "单一比例标准的温和修正")
    cleaned = cleaned.replace("单一审美霸权", "单一比例标准")
    cleaned = cleaned.replace("无声抵抗", "更松弛的选择")
    cleaned = cleaned.replace("无声回应", "具体回应")
    cleaned = cleaned.replace("沉默说话", "轮廓和留白发挥作用")
    cleaned = cleaned.replace("自主", "主动选择")
    cleaned = cleaned.replace("身份叙事", "穿着语气")
    cleaned = cleaned.replace("规训", "旧式穿衣规则")
    cleaned = cleaned.replace("无声抗议", "更松弛的选择")
    cleaned = cleaned.replace("自我赋权", "自我表达")
    cleaned = cleaned.replace("自我导演", "自我整理")
    cleaned = cleaned.replace("导演，而非被动接受者", "整理者，而非被动跟随者")
    cleaned = cleaned.replace("穿着者成为自己身体的导演", "穿着者更主动地整理身体比例")
    cleaned = cleaned.replace("一场对穿着判断的主动切割", "一次对肩线与腰线的主动整理")
    cleaned = cleaned.replace("一场对穿着主动感的主动切割", "一次对肩线与腰线的主动整理")
    cleaned = cleaned.replace("dropped shoulder", "无袖肩线")
    cleaned = cleaned.replace("high-waisted tapered waist", "高腰收束腰线")
    cleaned = cleaned.replace("高腰线对比强化", "高腰线强化")
    cleaned = cleaned.replace("高于肚脐明确的比例关系", "略高于肚脐")
    cleaned = cleaned.replace("高于腰线明确的比例关系", "略高于腰线")
    cleaned = cleaned.replace("低于肚脐清楚的上下关系", "低于肚脐附近")
    cleaned = cleaned.replace("肚脐上清楚的上下关系", "肚脐上方")
    cleaned = cleaned.replace("锁骨上方腰侧位置", "锁骨附近")
    cleaned = cleaned.replace("肚脐上腰侧位置", "肚脐上方")
    cleaned = cleaned.replace("超过头宽更稳定的比例", "明显超过头宽")
    cleaned = cleaned.replace("现代性承诺", "日常价值")
    cleaned = cleaned.replace("肩线继续后移明确宽度", "肩线略向后收")
    cleaned = cleaned.replace("腰线宽度收缩至明确宽度区间", "腰线保持窄幅收束")
    cleaned = cleaned.replace("明确的比例关系留白", "自然留白")
    cleaned = cleaned.replace("明确的比例关系", "清晰比例关系")
    cleaned = cleaned.replace("小个子（清楚的上下关系以下）", "小个子")
    cleaned = cleaned.replace("小个子（明确宽度以下）", "小个子")
    cleaned = cleaned.replace("明确宽度者", "中等身高者")
    cleaned = cleaned.replace("清楚的上下关系以上", "高个子")
    cleaned = cleaned.replace("肚脐以上明确宽度", "肚脐以上一小段")
    cleaned = cleaned.replace("肚脐上方明确宽度", "肚脐上方一小段")
    cleaned = cleaned.replace("高领口与落肩设计", "深 V 领口与无袖肩线")
    cleaned = cleaned.replace("高领口", "深 V 领口")
    cleaned = cleaned.replace("2024年从造型观察看", "近季观察里")
    cleaned = cleaned.replace("投诉率下降一部分", "接受度提高")
    cleaned = cleaned.replace("\\n- ", "\n- ")
    cleaned = cleaned.replace("\\n-", "\n-")
    cleaned = cleaned.replace("清晰的比例差处", "腰侧位置")
    cleaned = cleaned.replace("肘上清晰的比例差", "肘上附近")
    cleaned = cleaned.replace("袖口在肘上清晰的比例差", "袖口停在肘上附近")
    cleaned = cleaned.replace("袖口在肘上附近", "袖口停在肘上附近")
    cleaned = cleaned.replace("肘上明确的比例关系", "肘上附近")
    cleaned = cleaned.replace("袖口在肘上明确的比例关系", "袖口停在肘上附近")
    cleaned = cleaned.replace("结构回归趋势持续深化", "结构化剪裁仍适合用具体细节来讨论")
    cleaned = cleaned.replace("趋势持续深化", "仍适合用具体细节来讨论")
    cleaned = cleaned.replace("清晰的比例差", "清晰比例差")
    cleaned = cleaned.replace("行业共识", "更普遍的造型判断")
    cleaned = cleaned.replace("后疫情时代", "近年")
    cleaned = cleaned.replace("清晰的尺寸差为宜", "保持窄幅为宜")
    cleaned = cleaned.replace("清晰的尺寸差", "清晰宽度")
    cleaned = cleaned.replace("（社媒穿搭讨论）", "")
    cleaned = cleaned.replace("(社媒穿搭讨论)", "")
    cleaned = cleaned.replace("； - ", "\n- ")
    cleaned = cleaned.replace("东京涩谷", "城市通勤场景")
    cleaned = cleaned.replace("涩谷", "城市街区")
    cleaned = cleaned.replace("东京", "城市")
    cleaned = cleaned.replace("T台模特", "造型参考中的人物")
    cleaned = cleaned.replace("T 台模特", "造型参考中的人物")
    cleaned = cleaned.replace("T台", "造型展示")
    cleaned = cleaned.replace("T 台", "造型展示")
    cleaned = re.sub(r"(?:左图|右图)[：:]\s*", "", cleaned)
    cleaned = cleaned.replace("约清楚的上下关系空隙", "清晰留白")
    cleaned = cleaned.replace("略长清楚的上下关系", "形成清晰比例")
    cleaned = cleaned.replace("清楚的上下关系空隙", "清晰留白")
    cleaned = cleaned.replace("full-body街拍", "全身造型参考")
    cleaned = cleaned.replace("街拍", "造型参考")
    cleaned = cleaned.replace("秀场", "造型展示")
    cleaned = cleaned.replace("适度", "克制")
    cleaned = re.sub(r"^>\s*", "", cleaned)
    cleaned = re.sub(r"[“\"]([^”\"]{6,80})[”\"]——[^，。；;\n]*", r"\1", cleaned)
    cleaned = cleaned.replace("清楚的上下关系以下人群", "小个子")
    cleaned = cleaned.replace("清楚的上下关系以下", "小个子")
    cleaned = cleaned.replace("清楚的上下关系以上", "高个子")
    cleaned = cleaned.replace("清晰比例差以下身高", "小个子")
    cleaned = cleaned.replace("清晰比例差以下", "小个子")
    cleaned = cleaned.replace("清晰比例差以上", "高个子")
    cleaned = cleaned.replace("裤长微短清楚的上下关系", "裤长略短一截")
    cleaned = cleaned.replace("微短清楚的上下关系", "略短一截")
    cleaned = cleaned.replace("肩线前移清晰宽度", "肩线略向前移")
    cleaned = cleaned.replace("腰线偏移清晰宽度", "腰线轻微偏移")
    cleaned = cleaned.replace("保持膝盖上方清晰宽度露出", "保持裤脚适度留白")
    cleaned = cleaned.replace("脚踝上方明确宽度", "脚踝上方一小段")
    cleaned = cleaned.replace("肋骨下方约明确宽度处", "肋骨下方附近")
    cleaned = cleaned.replace("肋骨下方明确宽度处", "肋骨下方附近")
    cleaned = cleaned.replace("明确宽度空隙", "清晰留白")
    cleaned = cleaned.replace("稳定比例.5比例", "适度比例")
    cleaned = cleaned.replace("保持稳定比例比例", "保持适度比例")
    cleaned = cleaned.replace("自然腰线，比例", "自然腰线，整体比例")
    cleaned = cleaned.replace("身体不再被单一化，而是成为表达的主体", "造型不再只服务显高，而是服务穿着者的节奏")
    cleaned = cleaned.replace("比前摆长比例差异", "比前摆略长")
    cleaned = cleaned.replace("从近季廓形观察看，或后摆比前摆略长，正是为强化这种", "风衣后摆比前摆略长，可以强化这种")
    cleaned = cleaned.replace("下摆长比例差异", "下摆略有长短变化")
    cleaned = cleaned.replace("距鞋面比例差异左右", "与鞋面保持自然留白")
    cleaned = cleaned.replace("裤脚距鞋面比例差异", "裤脚与鞋面保持自然留白")
    cleaned = re.sub(r"测量肩宽\s*÷\s*2\s*=\s*[^；。\n]*", "肩线偏移以不压低肩部为上限", cleaned)
    cleaned = re.sub(r"腰围\s*÷\s*4\s*=\s*[^；。\n]*", "腰线偏移以不破坏自然腰线为准", cleaned)
    cleaned = re.sub(r"腿长\s*[−-]\s*脚踝高度\s*=\s*[^；。\n]*", "裤长以脚踝附近的自然留白为准", cleaned)
    cleaned = cleaned.replace("通勤装", "日常造型")
    cleaned = cleaned.replace("日常日常穿法", "日常穿法")
    cleaned = cleaned.replace("棉质主造型", "棉质内搭")
    cleaned = cleaned.replace("流动叙事", "流动感")
    cleaned = cleaned.replace("艺术展演", "更有设计感的穿法")
    cleaned = cleaned.replace("艺术活动", "更有设计感的场合")
    cleaned = cleaned.replace("比例公式", "比例判断方法")
    cleaned = cleaned.replace("显高公式", "比例判断方法")
    cleaned = cleaned.replace("公式", "判断方法")
    cleaned = cleaned.replace("形成清楚的上下关系", "形成清晰比例")
    cleaned = cleaned.replace("清楚的上下关系", "清晰比例")
    cleaned = cleaned.replace("清晰比例差", "比例差异")
    cleaned = cleaned.replace("清晰宽度：", "中等身高：")
    cleaned = cleaned.replace("清晰宽度", "自然留白")
    cleaned = cleaned.replace("明确宽度", "适度距离")
    cleaned = re.sub(r"Visual reference for [A-Za-z0-9\- ]+", "同一主造型的视觉参考，强调廓形、比例和穿着状态", cleaned)
    cleaned = re.sub(r"Visible outfit reference for [A-Za-z0-9\- ]+", "同一主造型的图片参考", cleaned)
    cleaned = re.sub(r"[ \t\r\f\v]+", " ", cleaned)
    cleaned = re.sub(r" *\n *", "\n", cleaned)
    return cleaned.strip()


def sanitize_autonomous_post(post: dict) -> dict:
    if isinstance(post, dict):
        if "title" in post:
            post["title"] = sanitize_unsourced_claims(post.get("title", ""))
        if "subtitle" in post:
            post["subtitle"] = sanitize_unsourced_claims(post.get("subtitle", ""))
    paragraphs = post.get("paragraphs", []) if isinstance(post, dict) else []
    for paragraph in paragraphs:
        if isinstance(paragraph, dict):
            paragraph["text"] = sanitize_unsourced_claims(paragraph.get("text", ""))
            if paragraph.get("section_name"):
                paragraph["section_name"] = sanitize_unsourced_claims(paragraph.get("section_name", ""))
    return post


class PromptChainRunner:
    def __init__(self, prompts_dir: str = "services/ai_blogger/agents", profile_name: str = "editorial_styling", locale: str = "zh-CN"):
        normalized_locale = "zh-CN" if locale == "zh-CN" else "en-US"
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
        resolved_prompts_dir = prompts_dir
        if not os.path.isabs(resolved_prompts_dir):
            if os.path.exists(resolved_prompts_dir):
                resolved_prompts_dir = os.path.abspath(resolved_prompts_dir)
            else:
                candidate = os.path.join(project_root, resolved_prompts_dir)
                if os.path.exists(candidate):
                    resolved_prompts_dir = candidate
        if normalized_locale == "en-US":
            normalized_path = os.path.normpath(resolved_prompts_dir)
            if os.path.basename(normalized_path) != "en-US":
                resolved_prompts_dir = os.path.join(resolved_prompts_dir, "en-US")
        self.prompts_dir = resolved_prompts_dir
        self.profile_name = profile_name
        self.locale = normalized_locale
        self.profile = self._load_profile(profile_name)
        self.prompts = self._load_prompts()
        self._layout_registry = None
        self._llm_client = None
        
    def _load_profile(self, profile_name: str) -> dict:
        import json
        profile_path = os.path.join(os.path.dirname(__file__), "profiles", f"{profile_name}.json")
        if not os.path.exists(profile_path):
            logging.warning(f"Profile '{profile_name}' not found, falling back to 'editorial_styling'")
            profile_path = os.path.join(os.path.dirname(__file__), "profiles", "editorial_styling.json")
            
        with open(profile_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _load_prompts(self) -> Dict[str, str]:
        """Loads the prompt templates and their knowledge base dependencies from the filesystem."""
        import re
        prompts = {}
        # Map phase keys to the new agent markdown files
        phase_map = {
            "phase1_angle": "@agent_angle_editor.md",
            "phase2_outline": "@agent_outline_planner.md",
            "phase3_drafting": "@agent_draft_writer.md"
        }
        for phase_key, filename in phase_map.items():
            path = os.path.join(self.prompts_dir, filename)
            if os.path.exists(path):
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Inject dynamic knowledge base from profile instead of prompt tags
                kb_files = self.profile.get("kb_files", [])
                context_blocks = []
                
                for kb_file in kb_files:
                    abs_path = kb_file
                    if not os.path.isabs(kb_file):
                        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
                        candidate = os.path.join(project_root, kb_file)
                        if os.path.exists(candidate):
                            abs_path = candidate
                            
                    if os.path.exists(abs_path):
                        try:
                            with open(abs_path, 'r', encoding='utf-8') as f_kb:
                                kb_content = f_kb.read()
                                context_blocks.append(f"--- BEGIN CONTEXT: {kb_file} ---\n{kb_content}\n--- END CONTEXT: {kb_file} ---")
                        except Exception as e:
                            logging.warning(f"Failed to read knowledge base file {kb_file}: {e}")
                    else:
                        logging.warning(f"Knowledge base file not found: {kb_file}")
                
                if context_blocks:
                    context_str = "\n\n<context>\n" + "\n\n".join(context_blocks) + "\n</context>\n"
                    content += context_str
                
                # Interpolate profile constraints into prompt
                constraints = self.profile.get("constraints", {})
                allowed_sections_str = "\n   - ".join(constraints.get("allowed_sections", []))
                if allowed_sections_str:
                    allowed_sections_str = "   - " + allowed_sections_str
                    
                layout_pool_str = "\n   - ".join([f"`{l}`" for l in self.profile.get("layout_pool", [])])
                if layout_pool_str:
                    layout_pool_str = "   - " + layout_pool_str
                    
                visual_strategy = self.profile.get("visual_strategy", "")
                
                content = content.replace("{paragraph_count_rules}", constraints.get("paragraph_count_rules", ""))
                content = content.replace("{allowed_sections}", allowed_sections_str)
                content = content.replace("{layout_pool}", layout_pool_str)
                content = content.replace("{visual_strategy}", visual_strategy)

                prompts[phase_key] = content
            else:
                logging.warning(f"Agent prompt file not found: {path}")
        return prompts
        
    def run_chain(self, raw_topic: str, seed_material: dict = None) -> Dict:
        """
        Executes the 3-step prompt chain based on the blogger_experience docs.
        """
        logging.info(f"Starting Prompt Chain for topic: '{raw_topic}'")
        
        # Inject seed material if provided
        angle_input = f"Topic: {raw_topic}"
        if seed_material:
            logging.info("Injecting real news seed material into Phase 1...")
            angle_input += f"\n\nContext/Source: {seed_material.get('source', '')}\nLink: {seed_material.get('link', '')}\nSummary: {seed_material.get('summary', '')}"
            angle_input += "\n\nCRITICAL INSTRUCTION: You must base your angle and thesis strictly on the real news context provided above. Do not invent unrelated stories."
        
        # Step 1: Angle Generation
        logging.info("Executing Phase 1: Angle & Thesis Generation...")
        angle_result = self._call_llm(
            system_prompt=self.prompts.get("phase1_angle", ""),
            user_input=angle_input,
            phase="1"
        )
        visual_anchor = _normalize_visual_anchor(angle_result, raw_topic)
        angle_result["visual_anchor"] = visual_anchor
        if angle_result.get("angle_title"):
            angle_result["angle_title"] = sanitize_unsourced_claims(angle_result.get("angle_title"))
            angle_result["angle_title"] = sanitize_visual_anchor_drift(angle_result.get("angle_title"), visual_anchor)

        real_image_urls = []
        if seed_material:
            if seed_material.get("image_urls"):
                real_image_urls = list(seed_material.get("image_urls") or [])
            elif seed_material.get("image_url"):
                real_image_urls = [seed_material.get("image_url")]
            
        # Step 2: Outline & Visual Strategy
        logging.info("Executing Phase 2: Structural Outline & Image Queries...")
        outline_input = json.dumps(angle_result, ensure_ascii=False)
        outline_result = self._call_llm(
            system_prompt=self.prompts.get("phase2_outline", ""),
            user_input=outline_input,
            phase="2"
        )
        
        # Step 3: Drafting & Stylization
        logging.info("Executing Phase 3: Editorial Drafting & Tone Polish...")
        draft_input = json.dumps(outline_result, ensure_ascii=False)
        final_post = self._call_llm(
            system_prompt=self.prompts.get("phase3_drafting", ""),
            user_input=draft_input,
            phase="3"
        )
        if not seed_material:
            final_post = sanitize_autonomous_post(final_post)
        final_post["visual_anchor"] = visual_anchor
        
        if real_image_urls:
            queue = list(real_image_urls)
            for i, p in enumerate(final_post.get("paragraphs", [])):
                queries = p.get("image_queries", [])
                     
                if not queries or not queue:
                    continue
                new_queries = []
                for q in queries:
                    if not queue:
                        new_queries.append(q)
                        continue
                    if isinstance(q, dict):
                        q2 = dict(q)
                        q2["_direct_url"] = queue.pop(0)
                        new_queries.append(q2)
                    else:
                        new_queries.append({"search_keyword": str(q), "_direct_url": queue.pop(0)})
                p["image_queries"] = new_queries
                    
        style_en = str(final_post.get("style_en") or outline_result.get("style_en") or angle_result.get("style_en") or "street style").strip() or "street style"
        section_map = {
            "导语": "introduction",
            "深度解析": "deep dive",
            "穿搭实操": "styling tips",
            "穿搭误区": "common mistakes",
            "新闻速递": "runway news",
            "事件还原": "event recap",
            "行业影响": "fashion industry",
            "核心观点": "key takeaway",
            "引言": "introduction",
            "概念溯源": "archive reference",
            "历史对照": "historical comparison",
            "当代语境": "contemporary context",
            "理论交锋": "critical debate",
            "结语": "conclusion"
        }
        paragraphs = list(final_post.get("paragraphs", []) or [])
        for para in paragraphs:
            if not isinstance(para, dict):
                continue
            queries = para.get("image_queries")
            raw_images_required = para.get("images_required")
            try:
                images_required = 1 if raw_images_required is None else int(raw_images_required)
            except (TypeError, ValueError):
                images_required = 1
            if images_required <= 0:
                para["image_queries"] = []
                para["text"] = sanitize_visual_anchor_drift(para.get("text", ""), visual_anchor)
                continue
            if isinstance(queries, list) and len(queries) > 0:
                para["image_queries"] = normalize_image_queries(
                    queries,
                    visual_anchor=visual_anchor,
                    images_required=images_required,
                )
                para["text"] = sanitize_visual_anchor_drift(para.get("text", ""), visual_anchor)
                continue
            section_name = str(para.get("section_name") or "").strip()
            section_en = section_map.get(section_name, "fashion editorial")
            para["image_queries"] = normalize_image_queries(
                [{
                    "search_keyword": f"{visual_anchor['primary_outfit']} {section_en} fashion editorial photography".strip()
                }],
                visual_anchor=visual_anchor,
                images_required=images_required,
            )
            para["text"] = sanitize_visual_anchor_drift(para.get("text", ""), visual_anchor)

        quality_report = assess_post_quality(
            {"title": angle_result.get("angle_title", ""), "paragraphs": paragraphs},
            has_source=bool(seed_material),
            missing_hero=None,
            visual_anchor=visual_anchor,
        )
        final_post = attach_quality_report(final_post, quality_report)

        return {
            "metadata": angle_result,
            "title": angle_result.get("angle_title", "Untitled Editorial"),
            "paragraphs": paragraphs,
            "visual_anchor": visual_anchor,
            "quality_report": final_post.get("quality_report", {}),
            "_quality_gate_failed": final_post.get("_quality_gate_failed", False),
        }

    def _call_llm(self, system_prompt: str, user_input: str, phase: str) -> Dict:
        """
        Wrapper to call the LLM API.
        Uses UniversalLLMClient.
        """
        if not self._llm_client:
            from services.ai_blogger.llm_client import UniversalLLMClient
            self._llm_client = UniversalLLMClient()
            
        enable_search = self.profile_name == "fashion_news"
        
        if phase == "1":
            return self._llm_client.generate_json(system_prompt, user_input, enable_search=enable_search)
            
        if phase == "2":
            # Phase 2: Call LLM for outline, then validate layouts
            angle = json.loads(user_input)
            style_en = angle.get("style_en", "street style")
            angle_title = angle.get("angle_title", "Untitled")
            visual_anchor = _normalize_visual_anchor(angle)
            
            outline_response = self._llm_client.generate_json(system_prompt, user_input, enable_search=enable_search)
            
            from services.ai_blogger.layouts.registry import LayoutRegistry
            if self._layout_registry is None:
                self._layout_registry = LayoutRegistry()
                
            processed_paragraphs = []
            for p in outline_response.get("paragraphs", []):
                layout_name = p.get("layout_name", "hero_full_bleed")
                layout_pool = self.profile.get("layout_pool", [])
                
                if layout_pool and layout_name not in layout_pool:
                    logging.warning(f"LLM suggested layout '{layout_name}' not in profile pool, falling back to '{layout_pool[0]}'")
                    layout_name = layout_pool[0]
                    
                try:
                    layout = self._layout_registry.get_layout(layout_name)
                except KeyError:
                    fallback = layout_pool[0] if layout_pool else "hero_full_bleed"
                    logging.warning(f"LLM suggested invalid layout '{layout_name}', falling back to '{fallback}'")
                    layout_name = fallback
                    layout = self._layout_registry.get_layout(layout_name)
                
                processed_paragraphs.append({
                    "section_name": p.get("section_name", "段落"),
                    "summary_intent": p.get("summary_intent", ""),
                    "reader_job": p.get("reader_job", ""),
                    "evidence_type": normalize_evidence_type(p.get("evidence_type", ""), p.get("section_name", "")),
                    "layout_name": layout_name,
                    "images_required": layout.images_required,
                    "visual_anchor": visual_anchor.get("primary_outfit", ""),
                })
            
            # Post-processing: Ensure the last paragraph of the outline is marked as "结语" if required
            if self.profile.get("constraints", {}).get("conclusion_required", False):
                if processed_paragraphs and processed_paragraphs[-1].get("section_name") != "结语":
                    processed_paragraphs[-1]["section_name"] = "结语"
                
            return {
                "angle_title": angle_title,
                "style_en": style_en,
                "visual_anchor": visual_anchor,
                "paragraphs": processed_paragraphs
            }
            
        if phase == "3":
            # Phase 3: Call LLM for final draft
            outline_json = json.loads(user_input)
            style_en = outline_json.get("style_en", "street style")
            visual_anchor = _normalize_visual_anchor(outline_json)
            outline_paras = outline_json.get("paragraphs", [])
            
            draft_response = None
            draft_paras = []
            
            for attempt in range(2):
                draft_response = self._llm_client.generate_json(system_prompt, user_input, enable_search=enable_search)
                draft_paras = draft_response.get("paragraphs", [])
                has_missing_text = any(not str((p or {}).get("text", "") or "").strip() for p in (draft_paras or []))
                if not has_missing_text and len(draft_paras) >= len(outline_paras):
                    break
                if attempt < 1:
                    logging.warning(f"LLM output quality issue detected (missing_text={has_missing_text}, paragraphs={len(draft_paras)}/{len(outline_paras)}). Retrying phase 3...")
            
            if len(draft_paras) < len(outline_paras):
                logging.warning(f"LLM truncation persists after retry. Truncating outline from {len(outline_paras)} to {len(draft_paras)} paragraphs.")
                outline_paras = outline_paras[:len(draft_paras)]
            
            final_paragraphs = []
            
            for i in range(len(outline_paras)):
                out_p = outline_paras[i]
                draft_p = draft_paras[i]
                fallback_text = out_p.get("summary_intent", "") or out_p.get("section_name", "")
                text_value = draft_p.get("text") if isinstance(draft_p, dict) else None
                text_value = str(text_value or "").strip()
                if not text_value:
                    text_value = str(draft_p.get("summary_intent") or "").strip() if isinstance(draft_p, dict) else ""
                if not text_value:
                    text_value = str(fallback_text or "").strip()
                
                final_paragraphs.append({
                    "section_name": draft_p.get("section_name", out_p.get("section_name", "")),
                    "text": text_value,
                    "layout_name": out_p.get("layout_name", "hero_full_bleed"),
                    "reader_job": out_p.get("reader_job", ""),
                    "evidence_type": normalize_evidence_type(out_p.get("evidence_type", ""), out_p.get("section_name", "")),
                    "images_required": out_p.get("images_required", 1),
                    "image_queries": normalize_image_queries(
                        draft_p.get("image_queries", []),
                        visual_anchor=visual_anchor,
                        images_required=out_p.get("images_required", 1),
                    ),
                })
            
            # Post-processing: Ensure the last paragraph is explicitly marked as "结语" if required by profile
            if self.profile.get("constraints", {}).get("conclusion_required", False):
                if final_paragraphs and final_paragraphs[-1].get("section_name") != "结语":
                    final_paragraphs[-1]["section_name"] = "结语"
                
            return {
                "paragraphs": final_paragraphs,
                "style_en": style_en,
                "visual_anchor": visual_anchor,
            }
            
        raise ValueError(f"Unknown phase: {phase}")
