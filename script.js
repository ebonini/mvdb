const { google } = require('googleapis');
const axios = require('axios');
const fs = require('fs');
const zlib = require('zlib');

const apiKey = process.env.TMDB_API_KEY; // Obtém a chave de API do TMDb do secret do GitHub Actions
const docId = 'SEU_DOC_ID'; // ID da planilha do Google Sheets
const credentials = process.env.GOOGLE_SHEETS_CREDENTIALS;

if (!credentials) {
    console.error("Credenciais não fornecidas");
    process.exit(1);
}

try {
    const parsedCredentials = JSON.parse(credentials); // Parseia as credenciais JSON
    console.log("Credenciais parseadas com sucesso");

    // Autenticação com a API do Google
    const auth = new google.auth.GoogleAuth({
        credentials: parsedCredentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });
    console.log("Autenticação configurada com sucesso");

    const sheets = google.sheets({ version: 'v4', auth });

    async function accessSheet() {
        try {
            const range = 'Planilha1!A:D'; // Ajuste o nome da planilha e o intervalo conforme necessário
            console.log(`Tentando acessar o intervalo: ${range}`);
            const res = await sheets.spreadsheets.values.get({
                spreadsheetId: docId,
                range: range,
            });
            console.log("Dados da planilha carregados com sucesso");

            const rows = res.data.values;
            if (!rows || rows.length === 0) {
                console.error('Nenhum dado encontrado na planilha.');
                return;
            }

            const contents = rows.slice(1).map(row => ({
                id: row[0],
                type: row[1],
                title: row[2],
                description: row[3]
            }));
            console.log(`Dados processados da planilha: ${JSON.stringify(contents, null, 2)}`);

            const movies = [];
            const tvShows = [];

            for (const content of contents) {
                const url = content.type === 'movie'
                    ? `https://api.themoviedb.org/3/movie/${content.id}`
                    : `https://api.themoviedb.org/3/tv/${content.id}`;
                console.log(`Requisitando URL: ${url}`);

                try {
                    const response = await axios.get(url, {
                        params: {
                            api_key: apiKey,
                            language: 'pt-BR' // Solicitar dados em português do Brasil
                        }
                    });

                    if (content.type === 'movie') {
                        movies.push(response.data);
                    } else {
                        tvShows.push(response.data);
                    }
                    console.log(`Dados recebidos do TMDb para ID: ${content.id}`);
                } catch (error) {
                    if (error.response && error.response.status === 404) {
                        console.error(`Recurso não encontrado para o ID: ${content.id}`);
                    } else {
                        console.error(`Erro ao requisitar URL: ${url}`, error);
                    }
                }
            }
            console.log(`Filmes carregados: ${JSON.stringify(movies, null, 2)}`);
            console.log(`Séries carregadas: ${JSON.stringify(tvShows, null, 2)}`);

            // Gere o conteúdo XML
            const xmlContent = generateXML(movies, tvShows);
            saveXML(xmlContent, 'epg.xml');
            compressXML('epg.xml', 'epg.xml.gz');
        } catch (error) {
            console.error("Erro ao acessar a planilha:", error);
        }
    }

    function generateXML(movies, tvShows) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<tv>\n';
        
        movies.forEach(movie => {
            const tvgId = movie.id;
            const description = movie.overview;
            const title = movie.title;
            
            xml += `<programme tvg-id="${tvgId}" title="${title}">\n`;
            xml += `  <description><![CDATA[${description}]]></description>\n`;
            xml += `</programme>\n`;
        });

        tvShows.forEach(show => {
            const tvgId = show.id;
            const description = show.overview;
            const title = show.name;
            
            xml += `<programme tvg-id="${tvgId}" title="${title}">\n`;
            xml += `  <description><![CDATA[${description}]]></description>\n`;
            xml += `</programme>\n`;
        });

        xml += '</tv>\n';
        console.log("Conteúdo XML gerado");
        return xml;
    }

    function saveXML(content, filename) {
        try {
            fs.writeFileSync(filename, content);
            console.log(`Arquivo XML salvo como ${filename}`);
        } catch (error) {
            console.error("Erro ao salvar o arquivo XML:", error);
        }
    }

    function compressXML(input, output) {
        try {
            console.log(`Iniciando compressão do arquivo: ${input}`);
            const fileContents = fs.createReadStream(input);
            const writeStream = fs.createWriteStream(output);
            const zip = zlib.createGzip();

            fileContents.pipe(zip).pipe(writeStream).on('finish', (err) => {
                if (err) return console.error("Erro ao comprimir o arquivo:", err);
                console.log(`Arquivo comprimido salvo como ${output}`);
            });
        } catch (error) {
            console.error("Erro ao comprimir o arquivo XML:", error);
        }
    }

    // Execute a função para acessar a planilha e atualizar o EPG
    accessSheet();
} catch (error) {
    console.error("Erro ao parsear as credenciais:", error);
    process.exit(1);
}
