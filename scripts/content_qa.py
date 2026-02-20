
import re
import os
import glob

def is_chinese(char):
    return '\u4e00' <= char <= '\u9fff'

def scan_file(filepath):
    issues = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        for i, line in enumerate(lines):
            line_num = i + 1
            line = line.strip()
            
            # Skip comments (simple check)
            if line.startswith('//') or line.startswith('/*') or line.startswith('*'):
                continue

            # 1. Chinese followed by English/Number without space
            # Exception: username, h1, span, div tags themselves
            # Regex: [\u4e00-\u9fff][a-zA-Z0-9]
            matches = re.finditer(r'([\u4e00-\u9fff])([a-zA-Z0-9])', line)
            for m in matches:
                issues.append(f"Line {line_num}: Chinese '{m.group(1)}' followed by English/Number '{m.group(2)}' without space.")

            # 2. English/Number followed by Chinese without space
            matches = re.finditer(r'([a-zA-Z0-9])([\u4e00-\u9fff])', line)
            for m in matches:
                issues.append(f"Line {line_num}: English/Number '{m.group(1)}' followed by Chinese '{m.group(2)}' without space.")

            # 3. Half-width punctuation in Chinese context
            # Simplistic check: if line has Chinese, check for , . ? ! : ; (except in code logic)
            # This is tricky in code files.
            # Only check in JSON values or HTML text content?
            if filepath.endswith('.json') or filepath.endswith('.html'):
                if any(is_chinese(c) for c in line):
                    # Check for half-width comma, period, question mark
                    # But exclude if inside html tags or json keys
                    # This is hard to do perfectly with regex, so just flagging potential issues
                    if ',' in line and '，' not in line:
                        # issues.append(f"Line {line_num}: Potential half-width comma in Chinese text.")
                        pass
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        
    return issues

def main():
    target_dirs = [
        'App/WebApp',
        'App/WebApp/js'
    ]
    
    extensions = ['*.html', '*.js', '*.json']
    
    all_issues = {}
    
    for d in target_dirs:
        for ext in extensions:
            files = glob.glob(os.path.join(d, ext))
            for f in files:
                issues = scan_file(f)
                if issues:
                    all_issues[f] = issues
                    
    # Output report
    print("# Content QA Report\n")
    if not all_issues:
        print("No issues found.")
    else:
        for f, issues in all_issues.items():
            print(f"## {f}")
            for issue in issues:
                print(f"- {issue}")
            print("")

if __name__ == '__main__':
    main()
