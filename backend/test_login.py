import urllib.request
import urllib.parse
import json
url = 'http://127.0.0.1:8000/api/v1/auth/login'
data = json.dumps({'email': 'admin@nippon.test', 'password': 'password123'}).encode()
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as response:
        print(response.status)
        print(response.read().decode())
except urllib.error.HTTPError as e:
    print(e.code)
    print(e.read().decode())
