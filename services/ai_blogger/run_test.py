from services.ai_blogger.chain_runner import PromptChainRunner

if __name__ == "__main__":
    runner = PromptChainRunner()
    result = runner.run_chain(raw_topic="极简风")
    
    print(f"\n✅ Phase 1 Output: {result['metadata']}")
    print(f"\n✅ Final Title: {result['title']}")
    print(f"✅ Final Paragraph Count: {len(result['paragraphs'])}")
    print(f"✅ Preview first paragraph: {result['paragraphs'][0]['text'][:50]}...")
