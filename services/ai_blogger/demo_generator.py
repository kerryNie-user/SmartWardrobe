import os
from datetime import datetime
from services.ai_blogger.content_generator import generate_blog_post
from services.ai_blogger.image_sourcer import get_image_for_topic
from services.ai_blogger.utils.config import load_config

# 10 Different Fashion Topics to simulate
DEMO_TOPICS = [
    {"title": "The Return of 90s Minimalist Denim", "summary": "Why everyone is wearing straight leg jeans and white tees this spring."},
    {"title": "Cyberpunk Streetwear 2026", "summary": "Tech-wear meets high fashion on the streets of Neo-Tokyo."},
    {"title": "Sustainable Linen for Summer", "summary": "Breathable, organic, and effortlessly chic summer essentials."},
    {"title": "Oversized Tailoring", "summary": "The bigger the blazer, the better the look. Mastering proportions."},
    {"title": "Vintage Leather Jackets", "summary": "How to source and style the perfect thrifted leather jacket."},
    {"title": "Athleisure Evolution", "summary": "Elevating gym wear to everyday luxury."},
    {"title": "Monochrome Winter Layering", "summary": "Staying warm while looking sharp in all-black or all-beige outfits."},
    {"title": "Bohemian Desert Chic", "summary": "Flowing fabrics, earthy tones, and festival-ready aesthetics."},
    {"title": "Preppy Academia", "summary": "Sweater vests, pleated skirts, and the return of the Ivy League look."},
    {"title": "Y2K Grunge Revival", "summary": "Low-rise jeans, cargo pants, and rebellious textures."}
]

def generate_demo_markdown():
    config = load_config()
    # Force the image provider to be real Unsplash Source
    config["image_provider"] = "unsplash_source"
    config["llm_provider"] = "mock"
    
    output_dir = config.get("output_dir", "services/ai_blogger/output")
    os.makedirs(output_dir, exist_ok=True)
    
    md_filename = os.path.join(output_dir, f"demo_10_blogs_{datetime.now().strftime('%Y%m%d%H%M%S')}.md")
    
    print(f"Generating 10 demo blog posts into {md_filename}...")
    
    with open(md_filename, "w", encoding="utf-8") as f:
        f.write("# AI Fashion Blogger - 10 Demo Posts\n\n")
        f.write("> *Note: Images are dynamically sourced from Unsplash using real-time search queries.*\n\n")
        f.write("---\n\n")
        
        for i, topic in enumerate(DEMO_TOPICS, 1):
            print(f"[{i}/10] Generating: {topic['title']}")
            
            # Pass a single mock trend to our generator
            post = generate_blog_post([topic], config)
            
            f.write(f"## {i}. {post['title']}\n\n")
            
            for p in post.get("paragraphs", []):
                # Fetch image URL dynamically based on the paragraph's query
                image_url = get_image_for_topic(p["image_query"], config)
                
                f.write(f"{p['text']}\n\n")
                f.write(f"![{p['image_query']}]({image_url})\n\n")
                f.write(f"*Search Query: `{p['image_query']}`*\n\n")
                
            f.write("---\n\n")
            
    print(f"\nDone! You can preview the file at: {md_filename}")

if __name__ == "__main__":
    generate_demo_markdown()
