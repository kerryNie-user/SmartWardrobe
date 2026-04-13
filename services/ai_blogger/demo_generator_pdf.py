import os
import requests
from io import BytesIO
from datetime import datetime
from fpdf import FPDF
from services.ai_blogger.content_generator import generate_blog_post
from services.ai_blogger.image_sourcer import get_image_for_topic
from services.ai_blogger.utils.config import load_config

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

class PDF(FPDF):
    def header(self):
        self.set_font('Helvetica', 'B', 15)
        self.cell(0, 10, 'SmartWardrobe - AI Fashion Blogger Demo', ln=True, align='C')
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

def generate_demo_pdf():
    config = load_config()
    config["image_provider"] = "unsplash_source"
    config["llm_provider"] = "mock"
    
    output_dir = config.get("output_dir", "services/ai_blogger/output")
    images_dir = os.path.join(output_dir, "images")
    
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(images_dir, exist_ok=True)
    
    pdf_filename = os.path.join(output_dir, f"demo_10_blogs_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf")
    
    print(f"Generating 10 demo blog posts into PDF...")
    print(f"All images will be downloaded and saved to: {images_dir}")
    
    pdf = PDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    for i, topic in enumerate(DEMO_TOPICS, 1):
        print(f"[{i}/10] Generating PDF Section: {topic['title']}")
        
        post = generate_blog_post([topic], config)
        
        # Title
        pdf.set_font('Helvetica', 'B', 16)
        pdf.cell(0, 10, f"{i}. {post['title']}", ln=True)
        pdf.ln(2)
        
        for p_idx, p in enumerate(post.get("paragraphs", [])):
            # Text
            pdf.set_font('Helvetica', '', 12)
            # Remove any characters that might break latin-1 encoding for Helvetica
            safe_text = p['text'].encode('latin-1', 'replace').decode('latin-1')
            pdf.multi_cell(0, 8, safe_text)
            pdf.ln(5)
            
            # Image Downloading and embedding
            image_url = get_image_for_topic(p["image_query"], config)
            try:
                # 明确地将真实图片下载并永久保存到硬盘上
                headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}
                response = requests.get(image_url, headers=headers, timeout=15)
                
                # Unsplash sometimes redirects or fails without a valid key, fallback to a reliable random image
                if response.status_code != 200:
                    fallback_url = f"https://picsum.photos/800/600?random={i}{p_idx}"
                    response = requests.get(fallback_url, headers=headers, timeout=15)
                    
                if response.status_code == 200:
                    local_img_filename = f"blog_{i}_img_{p_idx + 1}.jpg"
                    local_img_path = os.path.join(images_dir, local_img_filename)
                    
                    with open(local_img_path, 'wb') as f:
                        f.write(response.content)
                        
                    print(f"  -> Downloaded: {local_img_filename}")
                    
                    # 将这个保存在本地的真实图片渲染进 PDF
                    pdf.image(local_img_path, x='C', w=120)
                    pdf.ln(5)
                else:
                    pdf.set_font('Helvetica', 'I', 10)
                    pdf.cell(0, 8, f"[Image download failed: HTTP {response.status_code}]", ln=True)
            except Exception as e:
                print(f"  -> Failed to download image {image_url}: {e}")
                pdf.set_font('Helvetica', 'I', 10)
                pdf.cell(0, 8, f"[Image download error: {str(e)}]", ln=True)
                
        pdf.ln(10)
        
    pdf.output(pdf_filename)
    print(f"\nSuccess! Your PDF has been created at: {pdf_filename}")

if __name__ == "__main__":
    generate_demo_pdf()
