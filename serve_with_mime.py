
import http.server
import socketserver
import mimetypes
import os

# Ensure JS and WASM are served with correct MIME types
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/wasm', '.wasm')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('text/html', '.html')
mimetypes.add_type('application/json', '.json')
mimetypes.add_type('image/png', '.png')
mimetypes.add_type('image/jpeg', '.jpg')
mimetypes.add_type('image/webp', '.webp')
mimetypes.add_type('text/csv', '.csv')

PORT = 8080
Handler = http.server.SimpleHTTPRequestHandler

os.chdir(os.path.dirname(os.path.abspath(__file__)) or '.')

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving HTTP on port {PORT} (http://localhost:{PORT}/)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('Shutting down')
