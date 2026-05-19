
@echo off
chcp 65001 > nul
echo 开始初始化数据库...
python scripts/init_database.py
if %errorlevel% equ 0 (
    echo 数据库初始化成功！
) else (
    echo 数据库初始化失败，请检查错误信息。
)
pause
