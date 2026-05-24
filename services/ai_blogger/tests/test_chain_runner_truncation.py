import unittest
import json
from unittest.mock import patch, MagicMock
from services.ai_blogger.chain_runner import (
    PromptChainRunner,
    _normalize_visual_anchor,
    assess_post_quality,
    normalize_evidence_type,
    normalize_image_queries,
    sanitize_unsourced_claims,
)

class TestChainRunnerTruncation(unittest.TestCase):
    @patch('services.ai_blogger.llm_client.UniversalLLMClient')
    def test_llm_truncation_handling(self, mock_llm_client_class):
        mock_llm_client = MagicMock()
        mock_llm_client_class.return_value = mock_llm_client
        
        runner = PromptChainRunner(prompts_dir="services/ai_blogger/agents")
        
        outline_input = {
            "angle_title": "Test Angle",
            "style_en": "street style",
            "paragraphs": [
                {"section_name": "P1", "layout_name": "hero_full_bleed"},
                {"section_name": "P2", "layout_name": "split_image_text"},
                {"section_name": "P3", "layout_name": "float_left_photo"}
            ]
        }
        
        mock_llm_client.generate_json.return_value = {
            "paragraphs": [
                {"section_name": "P1", "text": "Text 1", "image_queries": ["q1"]},
                {"section_name": "P2", "text": "Text 2", "image_queries": ["q2"]}
            ]
        }
        
        result = runner._call_llm(
            system_prompt="sys", 
            user_input=json.dumps(outline_input), 
            phase="3"
        )
        
        self.assertEqual(len(result["paragraphs"]), 2)
        self.assertEqual(result["paragraphs"][0]["text"], "Text 1")
        self.assertEqual(result["paragraphs"][1]["text"], "Text 2")
        
        self.assertEqual(mock_llm_client.generate_json.call_count, 2)

    @patch('services.ai_blogger.llm_client.UniversalLLMClient')
    def test_conclusion_section_enforcement(self, mock_llm_client_class):
        mock_llm_client = MagicMock()
        mock_llm_client_class.return_value = mock_llm_client
        
        runner = PromptChainRunner(prompts_dir="services/ai_blogger/agents")
        
        # Mock phase 2 output where the last section is NOT "结语"
        outline_input = {
            "angle_title": "Test Angle",
            "style_en": "street style",
            "paragraphs": [
                {"section_name": "导语", "layout_name": "hero_full_bleed"},
                {"section_name": "深度解析", "layout_name": "split_image_text"},
                {"section_name": "总结", "layout_name": "float_left_photo"} # Note: "总结" instead of "结语"
            ]
        }
        
        mock_llm_client.generate_json.return_value = {
            "paragraphs": [
                {"section_name": "导语", "text": "Intro", "image_queries": []},
                {"section_name": "深度解析", "text": "Deep Dive", "image_queries": []},
                {"section_name": "总结", "text": "Final thoughts", "image_queries": []}
            ]
        }
        
        result = runner._call_llm(
            system_prompt="sys", 
            user_input=json.dumps(outline_input), 
            phase="3"
        )
        
        self.assertEqual(len(result["paragraphs"]), 3)
        # The last paragraph's section_name should be forced to "结语"
        self.assertEqual(result["paragraphs"][-1]["section_name"], "结语")

    @patch('services.ai_blogger.llm_client.UniversalLLMClient')
    def test_outline_evidence_type_is_normalized(self, mock_llm_client_class):
        mock_llm_client = MagicMock()
        mock_llm_client_class.return_value = mock_llm_client
        mock_llm_client.generate_json.return_value = {
            "paragraphs": [
                {
                    "section_name": "穿搭实操",
                    "summary_intent": "Use it",
                    "reader_job": "Want concrete styling guidance",
                    "evidence_type": "unsupported_value",
                    "layout_name": "hero_full_bleed"
                }
            ]
        }

        runner = PromptChainRunner(prompts_dir="services/ai_blogger/agents")
        result = runner._call_llm(
            system_prompt="sys",
            user_input=json.dumps({
                "angle_title": "Angle",
                "style_en": "street style",
                "paragraphs": [{"section_name": "穿搭实操", "layout_name": "hero_full_bleed"}]
            }),
            phase="2"
        )

        self.assertEqual(result["paragraphs"][0]["evidence_type"], "how_to")
        self.assertEqual(normalize_evidence_type("bad", "结语"), "closing")

    def test_autonomous_copy_sanitizer_softens_unsourced_facts(self):
        text = (
            "观察Lemaire 2025秋冬秀场，右襟比左襟长出7厘米，腰线却向左偏移2.5厘米。"
            "Instagram #asymmetryoffice 的热度在9月达峰值，用户平均上传12张不同搭配图，其中78%选择高领内搭。"
            "正如时尚理论家Julia Tscherny所言：‘结构上的偏移，是身体对凝视的最小抵抗。’"
        )

        sanitized = sanitize_unsourced_claims(text)

        self.assertIn("从近季廓形观察看", sanitized)
        self.assertIn("右襟与左襟形成明确长短差", sanitized)
        self.assertIn("腰线向一侧微微偏移", sanitized)
        self.assertIn("社媒穿搭讨论中", sanitized)
        self.assertIn("不少穿搭示例", sanitized)
        self.assertIn("其中不少人选择", sanitized)
        self.assertIn("换一种更日常的说法", sanitized)
        self.assertNotIn("Lemaire", sanitized)
        self.assertNotIn("Instagram", sanitized)
        self.assertNotIn("7厘米", sanitized)
        self.assertNotIn("78%", sanitized)
        self.assertNotIn("Julia", sanitized)
        self.assertNotIn("适度", sanitized)

    def test_autonomous_copy_sanitizer_removes_fake_scene_and_social_heat(self):
        text = (
            "上午10点，东京涩谷某金融公司电梯口，一位穿米白西装的女性静默站立。"
            "2025秋冬秀场中，Jil Sander 2025 Fall/Winter 均以同款微喇裤为收尾；"
            "社媒平台#OfficeRebel话题下，超7万条UGC内容呈现相似廓形。"
            "当8小时以上久坐成为常态，裤脚留白约3cm。"
        )

        sanitized = sanitize_unsourced_claims(text)

        self.assertIn("通勤场景里，一位", sanitized)
        self.assertIn("从近季廓形观察看", sanitized)
        self.assertIn("社媒穿搭讨论中", sanitized)
        self.assertIn("长期久坐", sanitized)
        self.assertIn("裤脚保留清晰留白", sanitized)
        self.assertNotIn("东京涩谷", sanitized)
        self.assertNotIn("Jil Sander", sanitized)
        self.assertNotIn("OfficeRebel", sanitized)
        self.assertNotIn("7万", sanitized)
        self.assertNotIn("3cm", sanitized)
        self.assertNotIn("适度", sanitized)

    def test_visual_anchor_is_applied_to_image_queries(self):
        queries = normalize_image_queries(
            [{"search_keyword": "city coffee shop", "image_caption": "A visible blazer look"}],
            visual_anchor={
                "primary_outfit": "boxy blazer straight trousers",
                "image_boundary": "visual reference only",
            },
            images_required=2,
        )

        self.assertEqual(len(queries), 2)
        self.assertTrue(all(q["visual_anchor"] == "boxy blazer straight trousers" for q in queries))
        self.assertEqual(queries[0]["search_keyword"], "blazer trousers woman fashion")
        self.assertEqual(queries[1]["search_keyword"], "blazer trousers woman fashion")

    def test_chinese_visual_anchor_becomes_short_english_fashion_keyword(self):
        anchor = _normalize_visual_anchor(
            {
                "visual_anchor": {
                    "primary_outfit": "青绿色无袖连体裤，深 V 领，强调收腰廓形",
                    "visual_keywords": ["青绿色连体裤", "收腰廓形"],
                }
            },
            raw_topic="青绿色连体裤怎么穿",
        )

        self.assertEqual(anchor["primary_outfit"], "teal sleeveless jumpsuit v-neck")
        self.assertEqual(anchor["visual_keywords"][0], "teal jumpsuit sleeveless v-neck")
        self.assertNotRegex(anchor["visual_keywords"][0], r"[\u4e00-\u9fff]")

    def test_chinese_image_query_is_normalized_before_external_lookup(self):
        queries = normalize_image_queries(
            [{"search_keyword": "青绿色无袖连体裤 收腰", "image_caption": "青绿色连体裤"}],
            visual_anchor={
                "primary_outfit": "青绿色无袖连体裤，强调收腰",
                "visual_keywords": ["连体裤", "收腰"],
            },
            images_required=1,
        )

        self.assertEqual(queries[0]["visual_anchor"], "teal sleeveless jumpsuit waist")
        self.assertEqual(queries[0]["search_keyword"], "teal sleeveless jumpsuit woman fashion")
        self.assertNotRegex(queries[0]["search_keyword"], r"[\u4e00-\u9fff]")

    def test_quality_gate_flags_visual_anchor_drift(self):
        post = {
            "title": "羊毛外套比例分析",
            "paragraphs": [
                {
                    "text": "这段突然转向羊毛外套和约会装，已经偏离主造型。",
                    "image_queries": [{"search_keyword": "teal jumpsuit woman fashion"}],
                }
            ],
        }

        report = assess_post_quality(
            post,
            has_source=False,
            missing_hero=False,
            visual_anchor={"primary_outfit": "teal sleeveless jumpsuit"},
        )

        self.assertEqual(report["quality_gate_status"], "failed")
        self.assertTrue(report["theme_drift"])
        self.assertIn({"paragraph_index": "title", "term": "羊毛"}, report["theme_drift"])

    def test_zero_image_layout_drops_model_image_queries(self):
        queries = normalize_image_queries(
            [{"search_keyword": "unrelated props"}],
            visual_anchor={"primary_outfit": "green jumpsuit"},
            images_required=0,
        )

        self.assertEqual(queries, [])

    def test_quality_gate_flags_forbidden_unsourced_claims_after_sanitizing(self):
        post = {
            "title": "显高10cm 的全网趋势",
            "paragraphs": [
                {
                    "text": sanitize_unsourced_claims("OfficeRebel 数据显示销售排名继续上升。"),
                    "image_queries": [{"search_keyword": "boxy blazer"}],
                }
            ]
        }

        report = assess_post_quality(post, has_source=False, missing_hero=False)

        self.assertEqual(report["quality_gate_status"], "failed")
        self.assertTrue(report["forbidden_claims"])

    def test_sanitizer_softens_precise_height_claims_in_titles(self):
        sanitized = sanitize_unsourced_claims("青绿色无袖连体裤如何显高10cm？基于full-body街拍的实测对比 #jumpsuitfit")

        self.assertIn("拉长视觉比例", sanitized)
        self.assertIn("全身造型参考", sanitized)
        self.assertIn("比例对比", sanitized)
        self.assertNotIn("10cm", sanitized)
        self.assertNotIn("街拍", sanitized)
        self.assertNotIn("#jumpsuitfit", sanitized)

    def test_sanitizer_softens_precise_height_pair(self):
        sanitized = sanitize_unsourced_claims("实现165cm与175cm身高差的视觉平衡")

        self.assertIn("不同身高", sanitized)
        self.assertNotIn("165cm", sanitized)
        self.assertNotIn("175cm", sanitized)

    def test_sanitizer_softens_unsourced_runway_brand_and_ranges(self):
        sanitized = sanitize_unsourced_claims(
            "2025春夏秀场中，Schiaparelli与Jil Sander、JW Anderson都采用1–2cm腰线差； - 小个子建议低跟鞋约3–5cm。肩线位移＞2cm。"
        )

        self.assertIn("从近季廓形观察看", sanitized)
        self.assertIn("自然留白", sanitized)
        self.assertIn("具备可见位移", sanitized)
        self.assertIn("\n- 小个子", sanitized)
        self.assertNotIn("Schiaparelli", sanitized)
        self.assertNotIn("Jil Sander", sanitized)
        self.assertNotIn("JW Anderson", sanitized)
        self.assertNotIn("2025春夏秀场", sanitized)
        self.assertNotIn("1–2cm", sanitized)

    def test_sanitizer_softens_claimy_trend_copy(self):
        sanitized = sanitize_unsourced_claims(
            "正如2026年‘自主美学’思潮所强调的——肩线微抬清晰的角度、腰线克制收紧可见的尺寸差、下摆留白可见的尺寸差。"
        )

        self.assertIn("换一种更日常的说法", sanitized)
        self.assertIn("肩线微微抬起", sanitized)
        self.assertIn("腰线克制收紧", sanitized)
        self.assertIn("下摆保留清晰留白", sanitized)

    def test_sanitizer_softens_fraction_thresholds_and_unsourced_seasons(self):
        sanitized = sanitize_unsourced_claims(
            "只要肩宽≤胸围1/2且袖口在肘上清晰的比例差，就能安全驾驭。"
            "从2024秋冬到2025春夏，结构回归趋势持续深化。"
        )

        self.assertIn("肩线不过度外扩", sanitized)
        self.assertIn("袖口停在肘上附近", sanitized)
        self.assertIn("在近季造型语境里", sanitized)
        self.assertNotIn("1/2", sanitized)
        self.assertNotIn("清晰的比例差", sanitized)
        self.assertNotIn("2024秋冬", sanitized)
        self.assertNotIn("2025春夏", sanitized)
        self.assertNotIn("趋势持续深化", sanitized)

    def test_sanitizer_softens_ratio_season_and_asset_mismatch_copy(self):
        sanitized = sanitize_unsourced_claims(
            "对比2024秋冬造型参考中的松垮无袖连体裤，当前审美正经历一次显著转向。"
            "当高领口与落肩设计形成视觉锚点，只要肩线与腰线保持3:1的垂直落差，就能自然拉长比例。"
        )

        self.assertIn("对比更松垮的造型参考", sanitized)
        self.assertIn("更具体的比例转向", sanitized)
        self.assertIn("深 V 领口与无袖肩线", sanitized)
        self.assertIn("明确但不紧绷的上下关系", sanitized)
        self.assertNotIn("2024秋冬", sanitized)
        self.assertNotIn("高领口", sanitized)
        self.assertNotIn("3:1", sanitized)

    def test_sanitizer_softens_image_caption_artifacts(self):
        sanitized = sanitize_unsourced_claims(
            "左图：T台模特身穿米色风衣与直筒裤，风衣下摆比裤脚略长清楚的上下关系，"
            "右图：裤脚之间约清楚的上下关系空隙清晰可见。"
        )

        self.assertIn("造型参考中的人物", sanitized)
        self.assertIn("形成清晰比例", sanitized)
        self.assertIn("清晰留白", sanitized)
        self.assertNotIn("左图", sanitized)
        self.assertNotIn("右图", sanitized)
        self.assertNotIn("T台", sanitized)

    @patch('services.ai_blogger.llm_client.UniversalLLMClient')
    def test_run_chain_keeps_zero_image_layout_without_synthetic_queries(self, mock_llm_client_class):
        mock_llm_client = MagicMock()
        mock_llm_client_class.return_value = mock_llm_client
        mock_llm_client.generate_json.side_effect = [
            {
                "angle_title": "黑色连衣裙的比例判断",
                "style_en": "black dress",
                "visual_anchor": {
                    "primary_outfit": "black dress",
                    "visual_keywords": ["black dress"],
                },
            },
            {
                "paragraphs": [
                    {
                        "section_name": "深度解析",
                        "summary_intent": "解释黑色连衣裙的比例判断。",
                        "reader_job": "理解腰线与裙长关系。",
                        "evidence_type": "silhouette",
                        "layout_name": "text_dense",
                    }
                ]
            },
            {
                "paragraphs": [
                    {
                        "section_name": "深度解析",
                        "text": "黑色连衣裙的重点不在装饰，而在腰线、裙长和鞋型共同形成的纵向秩序。",
                        "image_queries": [{"search_keyword": "unrelated street mood"}],
                    }
                ]
            },
        ]

        runner = PromptChainRunner(prompts_dir="services/ai_blogger/agents")
        result = runner.run_chain("黑色连衣裙的比例判断")

        self.assertEqual(result["paragraphs"][0]["images_required"], 0)
        self.assertEqual(result["paragraphs"][0]["image_queries"], [])

    def test_sanitizer_softens_abstract_ai_editorial_copy(self):
        sanitized = sanitize_unsourced_claims(
            "青绿色无袖连体裤以 dropped shoulder 与 high-waisted tapered waist 构成视觉锚点，"
            "这是一场对身体凝视权的主动切割。2025年社媒中可以被看到‘反向剪裁’挑战，如社媒穿搭讨论，"
            "穿着者刻意将腰线置于腹部上方。近季预告中，‘微廓型收腰’趋势信号明确："
            "肩线继续后移明确宽度，腰线宽度收缩至明确宽度区间。"
        )

        self.assertIn("无袖肩线", sanitized)
        self.assertIn("高腰收束腰线", sanitized)
        self.assertIn("肩线与腰线", sanitized)
        self.assertIn("一些穿搭内容", sanitized)
        self.assertIn("肩线略向后收", sanitized)
        self.assertIn("腰线保持窄幅收束", sanitized)
        self.assertNotIn("dropped shoulder", sanitized)
        self.assertNotIn("身体凝视权", sanitized)
        self.assertNotIn("2025年社媒", sanitized)
        self.assertNotIn("趋势信号明确", sanitized)

    def test_sanitizer_rehydrates_list_breaks(self):
        sanitized = sanitize_unsourced_claims("A； - B； - C")

        self.assertIn("\n- B", sanitized)
        self.assertIn("\n- C", sanitized)

if __name__ == '__main__':
    unittest.main()
