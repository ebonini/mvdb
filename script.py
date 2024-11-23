import requests
import os
import json  # Certifique-se de importar o módulo json

# Lista de IDs dos filmes para capturar metadados
movie_ids = ['550', '500', '600']  # Adicione mais IDs conforme necessário

# Substitua 'YOUR_API_KEY' pela sua chave da API do TMDb
api_key = os.getenv('6e2e6889fccce1a5b1d120f2d8f56b8c')
base_url = 'https://api.themoviedb.org/3/movie/'

# Inicializa uma lista para armazenar os dados dos filmes
movies_data = []

for movie_id in movie_ids:
    url = f'{base_url}{movie_id}?api_key={api_key}'
    response = requests.get(url)
    data = response.json()
    
    # Captura dos metadados necessários
    movie_data = {
        "id": movie_id,
        "title": data.get("title"),
        "overview": data.get("overview"),
        "poster_path": f'https://image.tmdb.org/t/p/w500{data.get("poster_path")}',
        "homepage": data.get("homepage")  # Substitua pelo URL real do vídeo
    }
    movies_data.append(movie_data)

# Salva os metadados em um arquivo JSON
with open('movies_metadata.json', 'w') as file:
    json.dump(movies_data, file, indent=4)
