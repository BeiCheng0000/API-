import re

with open('web_app.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 在 apis_add 函数中添加调试日志
old = "    expected = request.form.get('expected', '{}')

    if not all([case_name, url, method]):"
new = "    expected = request.form.get('expected', '{}')

    # 调试日志：打印接收到的原始数据
    logger.info(f'[apis_add] 接收到的原始数据 - headers: {headers}, data: {data}, expected: {expected}')

    if not all([case_name, url, method]):"

if old in content:
    content = content.replace(old, new, 1)
    with open('web_app.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print('替换成功')
else:
    print('未找到目标内容')
    # 查找附近内容
    idx = content.find("expected = request.form.get('expected'")
    if idx >= 0:
        print(repr(content[idx-50:idx+200]))
    else:
        print('完全找不到')
