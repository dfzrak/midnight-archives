#!/bin/bash
# 网站监控脚本

echo "🔍 开始监控 https://dfzrak.github.io/midnight-archives/"
echo "=========================================="

# 检查HTTP状态
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://dfzrak.github.io/midnight-archives/)
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ 网站状态: 正常 (HTTP $HTTP_STATUS)"
else
    echo "❌ 网站状态: 异常 (HTTP $HTTP_STATUS)"
    exit 1
fi

# 检查安全头部
HEADERS=$(curl -s -I https://dfzrak.github.io/midnight-archives/)
echo "🔒 安全头部检查:"

if echo "$HEADERS" | grep -q "X-Frame-Options: DENY"; then
    echo "  ✅ X-Frame-Options: DENY"
else
    echo "  ❌ X-Frame-Options: 未设置或错误"
fi

if echo "$HEADERS" | grep -q "X-Content-Type-Options: nosniff"; then
    echo "  ✅ X-Content-Type-Options: nosniff"
else
    echo "  ❌ X-Content-Type-Options: 未设置或错误"
fi

if echo "$HEADERS" | grep -q "Strict-Transport-Security:"; then
    echo "  ✅ Strict-Transport-Security: 已启用"
else
    echo "  ❌ Strict-Transport-Security: 未启用"
fi

# 检查响应时间
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" https://dfzrak.github.io/midnight-archives/)
echo "⏱️  响应时间: ${RESPONSE_TIME}秒"

if (( $(echo "$RESPONSE_TIME < 2.0" | bc -l) )); then
    echo "  ✅ 响应时间: 良好 (< 2秒)"
else
    echo "  ⚠️  响应时间: 偏慢 (>= 2秒)"
fi

echo "=========================================="
echo "🎯 监控完成"
