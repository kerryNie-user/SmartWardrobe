import os
import json
import logging
from typing import Dict, List

# Setup simple logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class PromptChainRunner:
    def __init__(self, prompts_dir: str = "services/ai_blogger_new/prompts"):
        self.prompts_dir = prompts_dir
        self.prompts = self._load_prompts()
        self._mock_layout_registry = None
        self._llm_client = None
        
    def _load_prompts(self) -> Dict[str, str]:
        """Loads the prompt templates from the filesystem."""
        prompts = {}
        for phase in ["phase1_angle", "phase2_outline", "phase3_drafting"]:
            path = os.path.join(self.prompts_dir, f"{phase}.txt")
            if os.path.exists(path):
                with open(path, 'r', encoding='utf-8') as f:
                    prompts[phase] = f.read()
            else:
                logging.warning(f"Prompt file not found: {path}")
        return prompts
        
    def run_chain(self, raw_topic: str, llm_provider: str = "mock") -> Dict:
        """
        Executes the 3-step prompt chain based on the blogger_experience docs.
        """
        logging.info(f"Starting Prompt Chain for topic: '{raw_topic}'")
        
        # Step 1: Angle Generation
        logging.info("Executing Phase 1: Angle & Thesis Generation...")
        angle_result = self._call_llm(
            system_prompt=self.prompts.get("phase1_angle", ""),
            user_input=f"Topic: {raw_topic}",
            provider=llm_provider,
            phase="1"
        )
        
        # Step 2: Outline & Visual Strategy
        logging.info("Executing Phase 2: Structural Outline & Image Queries...")
        outline_input = json.dumps(angle_result, ensure_ascii=False)
        outline_result = self._call_llm(
            system_prompt=self.prompts.get("phase2_outline", ""),
            user_input=outline_input,
            provider=llm_provider,
            phase="2"
        )
        
        # Step 3: Drafting & Stylization
        logging.info("Executing Phase 3: Editorial Drafting & Tone Polish...")
        draft_input = json.dumps(outline_result, ensure_ascii=False)
        final_post = self._call_llm(
            system_prompt=self.prompts.get("phase3_drafting", ""),
            user_input=draft_input,
            provider=llm_provider,
            phase="3"
        )
        
        # Assemble final artifact
        return {
            "metadata": angle_result,
            "title": angle_result.get("angle_title", "Untitled Editorial"),
            "paragraphs": final_post.get("paragraphs", [])
        }

    def _call_llm(self, system_prompt: str, user_input: str, provider: str, phase: str) -> Dict:
        """
        Wrapper to call the LLM API.
        If provider is 'mock', uses the hardcoded deterministic logic.
        Otherwise, uses UniversalLLMClient.
        """
        if provider == "mock":
            return self._mock_llm_response(user_input, phase)
            
        if not self._llm_client:
            from services.ai_blogger.llm_client import UniversalLLMClient
            self._llm_client = UniversalLLMClient()
            
        if phase == "1":
            # Phase 1: Direct LLM Call
            return self._llm_client.generate_json(system_prompt, user_input)
            
        if phase == "2":
            # Phase 2: Call LLM for outline, then assign layouts via Python
            outline_response = self._llm_client.generate_json(system_prompt, user_input)
            
            # The LLM gives us a list of 10 paragraphs. We need to assign layouts to them.
            angle = json.loads(user_input)
            style_en = angle.get("style_en", "street style")
            angle_title = angle.get("angle_title", "Untitled")
            
            from services.ai_blogger.layouts.registry import LayoutRegistry
            if self._mock_layout_registry is None:
                self._mock_layout_registry = LayoutRegistry()
                
            # Get layouts for the paragraphs
            num_paragraphs = len(outline_response.get("paragraphs", []))
            if num_paragraphs == 0:
                logging.warning("LLM returned 0 paragraphs in Phase 2. Falling back to mock outline.")
                return self._mock_phase2_outline(angle_title, style_en)
                
            layouts = self._mock_layout_registry.pick_layouts_for_article(paragraph_count=num_paragraphs, min_unique=min(6, num_paragraphs))
            
            processed_paragraphs = []
            for idx, p in enumerate(outline_response.get("paragraphs", [])):
                layout_name = layouts[idx]
                layout = self._mock_layout_registry.get_layout(layout_name)
                
                processed_paragraphs.append({
                    "section_name": p.get("section_name", "段落"),
                    "summary_intent": p.get("summary_intent", ""),
                    "layout_name": layout_name,
                    "images_required": layout.images_required
                })
                
            return {
                "angle_title": angle_title,
                "style_en": style_en,
                "paragraphs": processed_paragraphs
            }
            
        if phase == "3":
            # Phase 3: Call LLM for final draft, preserve layout logic
            outline_json = json.loads(user_input)
            style_en = outline_json.get("style_en", "street style")
            
            draft_response = self._llm_client.generate_json(system_prompt, user_input)
            
            # The draft_response contains {"paragraphs": [{"section_name":..., "text":..., "image_queries":...}]}
            # We need to map the layout_names back from the outline
            final_paragraphs = []
            draft_paras = draft_response.get("paragraphs", [])
            outline_paras = outline_json.get("paragraphs", [])
            
            for i in range(len(outline_paras)):
                out_p = outline_paras[i]
                draft_p = draft_paras[i] if i < len(draft_paras) else {}
                
                final_paragraphs.append({
                    "section_name": draft_p.get("section_name", out_p.get("section_name", "")),
                    "text": draft_p.get("text", "【内容生成失败】"),
                    "layout_name": out_p.get("layout_name", "hero_full_bleed"),
                    "image_queries": draft_p.get("image_queries", [])
                })
                
            return {
                "paragraphs": final_paragraphs,
                "style_en": style_en
            }
            
        raise ValueError(f"Unknown phase: {phase}")

    def _mock_llm_response(self, user_input: str, phase: str) -> Dict:
        topic_label, style_en = self._mock_detect_topic(user_input)

        if phase == "1":
            return self._mock_phase1_angle(topic_label, style_en)

        if phase == "2":
            angle = {}
            try:
                angle = json.loads(user_input)
            except Exception:
                angle = {}
            return self._mock_phase2_outline(angle_title=angle.get("angle_title", topic_label), style_en=style_en)

        if phase == "3":
            outline = {}
            try:
                outline = json.loads(user_input)
            except Exception:
                outline = {}
            return self._mock_phase3_draft(outline)

        return {}

    def _mock_detect_topic(self, s: str) -> tuple[str, str]:
        # Strip "Topic: " prefix if present
        if s.startswith("Topic: "):
            s = s[7:]
            
        # Keep the full title for rendering, but guess a style_en for images
        style_en = "quiet luxury minimalist"
        if "Y2K" in s or "千禧" in s:
            style_en = "y2k cyberpunk dystopian"
        elif "法式" in s or "Paris" in s or "Chic" in s:
            style_en = "parisian chic effortless"
        elif "无性别" in s or "Genderless" in s or "Oversize" in s:
            style_en = "genderless oversized tailoring"
        elif "学院" in s or "Preppy" in s or "常春藤" in s:
            style_en = "neo preppy vintage"
        elif "新中式" in s or "中式" in s:
            style_en = "modern chinese style"
        elif "机能" in s or "gorpcore" in s.lower():
            style_en = "gorpcore technical urban"
        elif "甜酷" in s:
            style_en = "edgy chic"
            
        return s, style_en

    def _mock_phase1_angle(self, topic_label: str, style_en: str) -> Dict:
        return {
            "angle_title": topic_label,
            "core_thesis": f"当{topic_label}成为一种集体选择，它早已不是“风格”这么简单，而是对消费逻辑、身体秩序与社会情绪的一次重新分配；面料的肌理、廓形的留白与垂坠感，都是你在现实里争取呼吸感的方式。",
            "emotional_hook": "克制、力量感与自我确立",
            "style_en": style_en
        }

    def _mock_phase2_outline(self, angle_title: str, style_en: str) -> Dict:
        from services.ai_blogger.layouts.registry import LayoutRegistry

        if self._mock_layout_registry is None:
            self._mock_layout_registry = LayoutRegistry(rng_seed=0)

        layouts = self._mock_layout_registry.pick_layouts_for_article(paragraph_count=10, min_unique=6)
        paragraphs = []

        plan = [
            ("导语", "抛出现象与个人感受，把读者带进这股风潮的情绪密度里。"),
            ("深度解析", "从历史与文化的回潮谈起：它为何在此刻出现，它在反对什么。"),
            ("深度解析", "从面料与工艺的角度拆解：触感、垂坠与挺括如何改变身体叙事。"),
            ("深度解析", "从阶层与权力结构切入：谁在定义“好品味”，谁在被排除。"),
            ("穿搭实操", "给出可复用公式：上半身与下半身的比例、留白与收束。"),
            ("穿搭实操", "给出材质组合：硬与软、哑光与微光的温差对冲。"),
            ("穿搭实操", "给出配饰策略：用20%的锐利来打破80%的沉闷。"),
            ("穿搭误区", "指出最常见的失败：用力过猛、堆叠过度、忽略肩线与裤长。"),
            ("结语", "把风格收回到个人：它最终要服务的是你的生活与精神姿态。"),
            ("结语", "用一句有力度的短句收尾，形成杂志式的余韵。")
        ]

        for idx, (section_name, summary_intent) in enumerate(plan):
            layout_name = layouts[idx]
            layout = self._mock_layout_registry.get_layout(layout_name)
            image_queries = self._mock_image_queries(style_en=style_en, section_name=section_name, images_required=layout.images_required)
            paragraphs.append(
                {
                    "section_name": section_name,
                    "summary_intent": summary_intent,
                    "layout_name": layout_name,
                    "images_required": layout.images_required,
                    "image_queries": image_queries
                }
            )

        return {"angle_title": angle_title, "style_en": style_en, "paragraphs": paragraphs}

    def _mock_phase3_draft(self, outline: Dict) -> Dict:
        angle_title = outline.get("angle_title", "未命名专栏")
        style_en = outline.get("style_en", "fashion street style")
        out = []

        for p in outline.get("paragraphs", []):
            section_name = p.get("section_name", "")
            summary_intent = p.get("summary_intent", "")
            text = self._mock_write_paragraph(angle_title=angle_title, section_name=section_name, summary_intent=summary_intent)
            out.append(
                {
                    "section_name": section_name,
                    "text": text,
                    "layout_name": p.get("layout_name", "hero_full_bleed"),
                    "image_queries": list(p.get("image_queries", [])),
                }
            )

        return {"paragraphs": out, "style_en": style_en}

    def _mock_image_queries(self, style_en: str, section_name: str, images_required: int) -> List[str]:
        if images_required <= 0:
            return []
        base = {
            "导语": f"woman wearing {style_en} street style full body",
            "深度解析": f"close up {style_en} fabric texture detail",
            "穿搭实操": f"woman wearing {style_en} layered outfit street style",
            "穿搭误区": "street style outfit proportions mistake fix fashion",
            "结语": f"confident woman walking {style_en} street style full body"
        }.get(section_name, f"woman wearing {style_en} street style full body")

        variants = [
            base,
            base + " neutral palette",
            base + " accessories close up",
            base + " tailoring detail",
            base + " rainy day urban"
        ]
        return variants[:images_required]

    def _mock_write_paragraph(self, angle_title: str, section_name: str, summary_intent: str) -> str:
        core = f"{summary_intent} 以《{angle_title}》为轴心，我们需要先承认：穿衣从来不是纯粹的审美游戏，它更像一套被日常反复验证的社会语法。你选择的廓形，决定他人如何读取你的边界；你偏爱的材质肌理，暴露你对世界的信任程度；而一件衣服的垂坠感与挺括度，则把“呼吸感”或“压迫感”写在身体的第二层肌肤上。"
        follow = "当你开始用剪裁而不是 logo 来表达立场，用留白而不是堆叠来制造张力，你会发现所谓“高级”并非昂贵，而是克制。克制不是退让，而是一种更精准的控制：控制光泽出现的时机，控制线条收束的角度，控制你在城市里行走时的节奏与重心。"
        close = "这就是风格的意义：不是复制，而是把生活的焦虑、欲望与野心，翻译成一套你愿意长期实践的穿搭方法。"

        text = core + follow + close
        if len(text) < 200:
            text = text + " 你不需要解释，你只需要让它成立。"
        return text
