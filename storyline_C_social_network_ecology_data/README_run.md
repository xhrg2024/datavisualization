本地预览说明

1. 进入数据文件夹：

```powershell
cd "e:\ADMIN\Downloads\archive (3)\storyline_C_social_network_ecology_data"
```

2. 启动简单 HTTP 服务器（Python 3 已配置虚拟环境）：

```powershell
# 如果使用系统 python
python -m http.server 8000
# 或者使用工作区的虚拟环境 python
"e:/ADMIN/Downloads/archive (3)/.venv/Scripts/python.exe" -m http.server 8000
```

3. 在浏览器打开：

http://localhost:8000/index.html

说明：

- 直接用 file:// 打开 HTML 可能无法加载本地 CSV（浏览器跨域限制），因此请使用 HTTP 服务器。 
- 如果页面出现性能问题，可调整控件中的阈值（如合著者最小权重、互引最小权重）。
