"""Dev server with no-cache headers so JS module changes reflect immediately."""
import http.server
import os
import sys

ROOT = r"S:\fitx-tracker"
PORT = 3001

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def log_message(self, format, *args):
        pass  # suppress request logs

if __name__ == "__main__":
    with http.server.HTTPServer(("", PORT), NoCacheHandler) as httpd:
        print(f"FitX dev server: http://localhost:{PORT}", flush=True)
        httpd.serve_forever()
