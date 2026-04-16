import os
import json
import logging
from typing import Dict, List

# Setup simple logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class PromptChainRunner:
    def __init__(self, prompts_dir: str = "services/ai_blogger/agents"):
        self.prompts_dir = prompts_dir
        self.prompts = self._load_prompts()
        self._layout_registry = None
        self._llm_client = None
        
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
                
                # Parse <knowledge_base> tags to inject external context (Vibe Coding style)
                kb_match = re.search(r'<knowledge_base>(.*?)</knowledge_base>', content, re.DOTALL)
                if kb_match:
                    kb_text = kb_match.group(1)
                    context_blocks = []
                    # Extract file paths, ignoring empty lines or markdown list dashes
                    for line in kb_text.split('\n'):
                        line = line.strip().lstrip('-').strip()
                        if not line:
                            continue
                        
                        # Resolve path relative to project root or current dir
                        # Assume paths in knowledge_base are like 'services/ai_blogger/experience/...'
                        abs_path = line
                        if not os.path.isabs(line):
                            # Try to find it relative to the project root (assuming chain_runner.py is in services/ai_blogger)
                            project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
                            candidate = os.path.join(project_root, line)
                            if os.path.exists(candidate):
                                abs_path = candidate

                        if os.path.exists(abs_path):
                            try:
                                with open(abs_path, 'r', encoding='utf-8') as kb_file:
                                    kb_content = kb_file.read()
                                    context_blocks.append(f"--- BEGIN CONTEXT: {line} ---\n{kb_content}\n--- END CONTEXT: {line} ---")
                            except Exception as e:
                                logging.warning(f"Failed to read knowledge base file {line}: {e}")
                        else:
                            logging.warning(f"Knowledge base file not found: {line}")
                    
                    if context_blocks:
                        context_str = "\n\n<context>\n" + "\n\n".join(context_blocks) + "\n</context>\n"
                        # Append context to the end of the prompt
                        content += context_str

                prompts[phase_key] = content
            else:
                logging.warning(f"Agent prompt file not found: {path}")
        return prompts
        
    def run_chain(self, raw_topic: str) -> Dict:
        """
        Executes the 3-step prompt chain based on the blogger_experience docs.
        """
        logging.info(f"Starting Prompt Chain for topic: '{raw_topic}'")
        
        # Step 1: Angle Generation
        logging.info("Executing Phase 1: Angle & Thesis Generation...")
        angle_result = self._call_llm(
            system_prompt=self.prompts.get("phase1_angle", ""),
            user_input=f"Topic: {raw_topic}",
            phase="1"
        )
        
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
        
        # Assemble final artifact
        return {
            "metadata": angle_result,
            "title": angle_result.get("angle_title", "Untitled Editorial"),
            "paragraphs": final_post.get("paragraphs", [])
        }

    def _call_llm(self, system_prompt: str, user_input: str, phase: str) -> Dict:
        """
        Wrapper to call the LLM API.
        Uses UniversalLLMClient.
        """
        if not self._llm_client:
            from services.ai_blogger.llm_client import UniversalLLMClient
            self._llm_client = UniversalLLMClient()
            
        if phase == "1":
            # Phase 1: Direct LLM Call
            return self._llm_client.generate_json(system_prompt, user_input)
            
        if phase == "2":
            # Phase 2: Call LLM for outline, then validate layouts
            outline_response = self._llm_client.generate_json(system_prompt, user_input)
            
            angle = json.loads(user_input)
            style_en = angle.get("style_en", "street style")
            angle_title = angle.get("angle_title", "Untitled")
            
            from services.ai_blogger.layouts.registry import LayoutRegistry
            if self._layout_registry is None:
                self._layout_registry = LayoutRegistry()
                
            processed_paragraphs = []
            for p in outline_response.get("paragraphs", []):
                layout_name = p.get("layout_name", "hero_full_bleed")
                try:
                    layout = self._layout_registry.get_layout(layout_name)
                except KeyError:
                    logging.warning(f"LLM suggested invalid layout '{layout_name}', falling back to 'hero_full_bleed'")
                    layout_name = "hero_full_bleed"
                    layout = self._layout_registry.get_layout(layout_name)
                
                processed_paragraphs.append({
                    "section_name": p.get("section_name", "段落"),
                    "summary_intent": p.get("summary_intent", ""),
                    "layout_name": layout_name,
                    "images_required": layout.images_required
                })
            
            # Post-processing: Ensure the last paragraph of the outline is marked as "结语"
            if processed_paragraphs and processed_paragraphs[-1].get("section_name") != "结语":
                processed_paragraphs[-1]["section_name"] = "结语"
                
            return {
                "angle_title": angle_title,
                "style_en": style_en,
                "paragraphs": processed_paragraphs
            }
            
        if phase == "3":
            # Phase 3: Call LLM for final draft
            outline_json = json.loads(user_input)
            style_en = outline_json.get("style_en", "street style")
            outline_paras = outline_json.get("paragraphs", [])
            
            draft_response = None
            draft_paras = []
            
            for attempt in range(2):
                draft_response = self._llm_client.generate_json(system_prompt, user_input)
                draft_paras = draft_response.get("paragraphs", [])
                if len(draft_paras) >= len(outline_paras):
                    break
                if attempt == 0:
                    logging.warning(f"LLM output truncation detected ({len(draft_paras)}/{len(outline_paras)}). Retrying phase 3...")
            
            if len(draft_paras) < len(outline_paras):
                logging.warning(f"LLM truncation persists after retry. Truncating outline from {len(outline_paras)} to {len(draft_paras)} paragraphs.")
                outline_paras = outline_paras[:len(draft_paras)]
            
            final_paragraphs = []
            
            for i in range(len(outline_paras)):
                out_p = outline_paras[i]
                draft_p = draft_paras[i]
                
                final_paragraphs.append({
                    "section_name": draft_p.get("section_name", out_p.get("section_name", "")),
                    "text": draft_p.get("text", "【内容生成失败】"),
                    "layout_name": out_p.get("layout_name", "hero_full_bleed"),
                    "image_queries": draft_p.get("image_queries", [])
                })
            
            # Post-processing: Ensure the last paragraph is explicitly marked as "结语"
            if final_paragraphs and final_paragraphs[-1].get("section_name") != "结语":
                final_paragraphs[-1]["section_name"] = "结语"
                
            return {
                "paragraphs": final_paragraphs,
                "style_en": style_en
            }
            
        raise ValueError(f"Unknown phase: {phase}")
