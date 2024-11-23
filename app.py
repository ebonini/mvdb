from flask import Flask, jsonify
import requests
import os

app = Flask(__name__)

# Substitua 'YOUR_API_KEY' pela sua chave da API do TMDb
api_key = '6e2e6889fccce1a5b1d120f2d8f56b8c'
base_url = 'https://api.themoviedb.org/3/movie/'

@app.route('/metadata/<int:movie_id>', methods=['GET'])
def get_metadata(movie_id):
    url = f'{base_url}{movie_id}?api_key={api_key}'
    response = requests.get(url)
    data = response.json()

    movie_data = {
        "id": movie_id,
        "title": data.get("title"),
        "overview": data.get("overview"),
        "poster_path": f'https://image.tmdb.org/t/p/w500{data.get("poster_path")}',
        "homepage": data.get("homepage")  # Substitua pelo URL real do vídeo
    }

    return jsonify(movie_data)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
