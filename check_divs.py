from html.parser import HTMLParser

class DivCounter(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        if tag == 'div':
            attrs_dict = dict(attrs)
            id_val = attrs_dict.get('id', '')
            class_val = attrs_dict.get('class', '')
            label = id_val or class_val[:30] if class_val else 'div'
            self.stack.append(label)

    def handle_endtag(self, tag):
        if tag == 'div':
            if self.stack:
                self.stack.pop()
            else:
                self.errors.append('Extra closing </div>')

with open('templates/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

parser = DivCounter()
parser.feed(content)

if parser.stack:
    print(f'Unclosed divs ({len(parser.stack)}):')
    for s in parser.stack:
        print(f'  - {s}')
if parser.errors:
    for e in parser.errors:
        print(f'Error: {e}')
if not parser.stack and not parser.errors:
    print('All divs are properly closed!')
