import os
import json
import urllib.request
import urllib.error
import logging
import time

class UniversalLLMClient:
    """
    A zero-dependency client for OpenAI-compatible APIs (DeepSeek, Qwen, GPT-4o, etc.).
    Uses urllib.request to avoid needing pip install openai in restricted environments.
    """
    def __init__(self, api_key: str = None, base_url: str = None, model: str = None):
        self.api_key = api_key or os.getenv("LLM_API_KEY")
        self.base_url = base_url or os.getenv("LLM_BASE_URL", "https://api.deepseek.com/v1")
        self.model = model or os.getenv("LLM_MODEL_NAME", "deepseek-chat")
        self.history = []
        
        if not self.api_key:
            logging.warning("No LLM_API_KEY provided. LLM calls will fail unless the endpoint is unauthenticated.")
            
    def clear_memory(self):
        """Clears the conversation history."""
        self.history = []

    def generate_json(self, system_prompt: str, user_prompt: str, use_memory: bool = False) -> dict:
        """
        Sends a request to the LLM and strictly expects a JSON object back.
        If use_memory is True, the system will append to self.history and send the full history.
        """
        url = f"{self.base_url.rstrip('/')}/chat/completions"
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        messages = []
        
        if use_memory:
            if not self.history:
                self.history.append({"role": "system", "content": system_prompt})
            self.history.append({"role": "user", "content": user_prompt})
            messages = self.history
        else:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]

        # Build payload. We ask the model to reply in JSON format.
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.7
        }
        
        # Only some models support response_format strict json
        if "deepseek" in self.model.lower() or "gpt" in self.model.lower():
            payload["response_format"] = {"type": "json_object"}
        
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        
        max_retries = 3
        for attempt in range(max_retries):
            try:
                with urllib.request.urlopen(req, timeout=120) as response:
                    result = json.loads(response.read().decode('utf-8'))
                    content = result['choices'][0]['message']['content']
                    
                    if use_memory:
                        self.history.append({"role": "assistant", "content": content})
                        
                    # Try to parse the content as JSON
                    try:
                        return json.loads(content)
                    except json.JSONDecodeError:
                        # Sometime the model wraps JSON in markdown block ```json ... ```
                        if "```json" in content:
                            clean_content = content.split("```json")[1].split("```")[0].strip()
                            return json.loads(clean_content)
                        raise ValueError(f"Failed to parse JSON from LLM response: {content}")
                        
            except urllib.error.HTTPError as e:
                error_body = e.read().decode('utf-8')
                logging.error(f"LLM API HTTPError {e.code}: {error_body}")
                if attempt == max_retries - 1:
                    raise RuntimeError(f"LLM API Error: {e.code} - {error_body}")
            except Exception as e:
                logging.error(f"LLM request failed (attempt {attempt + 1}/{max_retries}): {e}")
                if attempt == max_retries - 1:
                    raise RuntimeError(f"LLM request completely failed after {max_retries} attempts: {e}")
            
            # Exponential backoff
            time.sleep(2 ** attempt)
            
        raise RuntimeError("Unexpected end of generate_json")
