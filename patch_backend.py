#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""临时脚本：在后端apis_add函数中添加调试日志"""

import os

file_path = os.path.join(os.path.dirname(__file__), 'web_app.py')

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 在 apis_add 函数中添加调试日志
old_text = "    expected = request.form.get('expected', '{}')

    if not all"
new_text = """    expected = request.form.get('expected', '{}')

    # 调试日志：打印接收到的原始数据
    logger.info(f'[apis_add] 接收到的原始数据 - headers: {headers}, data: {data}, expected: {expected}')

    if not all"""

if old_text in content:
    content = content.replace(old_text, new_text, 1)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('后端调试日志添加成功')
else:
    print('未找到目标内容，尝试查找...')
    # 查找所有 expected = request.form.get 的位置
    idx = 0
    count = 0
    while True:
        idx = content.find("expected = request.form.get('expected'", idx)
        if idx == -1:
            break
        count += 1
        print(f'找到第{count}处，位置: {idx}')
        print(repr(content[idx-100:idx+150]))
        idx += 1
