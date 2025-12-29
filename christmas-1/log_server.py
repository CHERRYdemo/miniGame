from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
from datetime import datetime

LOG_FILE = 'client_debug.log'

class LogHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            log_entry = json.loads(post_data.decode('utf-8'))
            message = log_entry.get('message', '')
            level = log_entry.get('level', 'INFO')
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
            
            log_line = f"[{timestamp}] [{level}] {message}\n"
            
            with open(LOG_FILE, 'a') as f:
                f.write(log_line)
                
            # print(log_line.strip()) # Optional: print to terminal
            
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            
        except Exception as e:
            print(f"Error handling log: {e}")
            self.send_response(500)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == '__main__':
    # Clear old log
    if os.path.exists(LOG_FILE):
        os.remove(LOG_FILE)
        
    server_address = ('', 3002)
    print(f'Starting log server on port 3002...')
    httpd = HTTPServer(server_address, LogHandler)
    httpd.serve_forever()

