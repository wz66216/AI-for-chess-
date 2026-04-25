import urllib.request
import json
import urllib.error

url = 'http://127.0.0.1:8000/api/v1/analyze-move'
data = json.dumps({'fen': 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', 'move': 'e2e4'}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
try:
    urllib.request.urlopen(req)
except urllib.error.HTTPError as e:
    print(e.read().decode('utf-8'))
