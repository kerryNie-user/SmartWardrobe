import pytest
import os
import json
from unittest.mock import patch, MagicMock
from services.ai_blogger.llm_client import UniversalLLMClient

@patch('urllib.request.urlopen')
def test_universal_llm_client_success(mock_urlopen):
    # Mock successful JSON response
    mock_response = MagicMock()
    mock_response.read.return_value = json.dumps({
        "choices": [
            {"message": {"content": '{"test": "ok"}'}}
        ]
    }).encode('utf-8')
    mock_urlopen.return_value.__enter__.return_value = mock_response

    client = UniversalLLMClient(api_key="fake-key")
    res = client.generate_json("System prompt", "User prompt")
    
    assert res == {"test": "ok"}
    mock_urlopen.assert_called_once()

@patch('urllib.request.urlopen')
def test_universal_llm_client_markdown_json(mock_urlopen):
    # Mock markdown wrapped JSON
    mock_response = MagicMock()
    mock_response.read.return_value = json.dumps({
        "choices": [
            {"message": {"content": "```json\n{\"test\": \"ok\"}\n```"}}
        ]
    }).encode('utf-8')
    mock_urlopen.return_value.__enter__.return_value = mock_response

    client = UniversalLLMClient(api_key="fake-key")
    res = client.generate_json("System prompt", "User prompt")
    
    assert res == {"test": "ok"}

@patch('urllib.request.urlopen')
def test_universal_llm_client_memory(mock_urlopen):
    client = UniversalLLMClient(api_key="fake-key")
    
    # First call
    mock_response_1 = MagicMock()
    mock_response_1.read.return_value = json.dumps({
        "choices": [{"message": {"content": '{"phase": 1}'}}]
    }).encode('utf-8')
    mock_urlopen.return_value.__enter__.return_value = mock_response_1
    
    res1 = client.generate_json("Sys Prompt", "User Prompt 1", use_memory=True)
    assert res1 == {"phase": 1}
    assert len(client.history) == 3
    assert client.history[0] == {"role": "system", "content": "Sys Prompt"}
    assert client.history[1] == {"role": "user", "content": "User Prompt 1"}
    assert client.history[2] == {"role": "assistant", "content": '{"phase": 1}'}
    
    # Second call
    mock_response_2 = MagicMock()
    mock_response_2.read.return_value = json.dumps({
        "choices": [{"message": {"content": '{"phase": 2}'}}]
    }).encode('utf-8')
    mock_urlopen.return_value.__enter__.return_value = mock_response_2
    
    res2 = client.generate_json("Sys Prompt", "User Prompt 2", use_memory=True)
    assert res2 == {"phase": 2}
    assert len(client.history) == 5
    assert client.history[3] == {"role": "user", "content": "User Prompt 2"}
    assert client.history[4] == {"role": "assistant", "content": '{"phase": 2}'}
    
    # Verify the payload sent on the second call included history
    # The last call to urlopen should have been made with a payload containing 4 messages 
    # (since the 5th message is the assistant's reply which is appended AFTER the request)
    args, kwargs = mock_urlopen.call_args
    req = args[0]
    payload = json.loads(req.data.decode('utf-8'))
    assert len(payload["messages"]) == 4
