#!/usr/bin/env python3
"""
Simple HTTP server for testing the Word Builder Game locally
Run with: python3 server.py
Then open: http://localhost:8000
"""

import http.server
import socketserver
import webbrowser
import os
from pathlib import Path

PORT = 8000

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

if __name__ == "__main__":
    # Change to the directory containing this script
    os.chdir(Path(__file__).parent)
    
    with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
        print(f"🎮 Word Builder Game Server")
        print(f"📍 Serving at: http://localhost:{PORT}")
        print(f"🎯 Game URL: http://localhost:{PORT}/index.html")
        print(f"👩‍🏫 Teacher Dashboard: http://localhost:{PORT}/teacher.html")
        print(f"⏹️  Press Ctrl+C to stop the server")
        print()
        
        # Try to open the browser automatically
        try:
            webbrowser.open(f'http://localhost:{PORT}/index.html')
            print("🌐 Opening game in your default browser...")
        except:
            print("💡 Manually open http://localhost:{PORT}/index.html in your browser")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 Server stopped. Thanks for testing!")