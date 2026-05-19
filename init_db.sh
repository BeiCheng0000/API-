
#!/bin/bash

echo "开始初始化数据库..."
python scripts/init_database.py

if [ $? -eq 0 ]; then
    echo "数据库初始化成功！"
else
    echo "数据库初始化失败，请检查错误信息。"
    exit 1
fi
