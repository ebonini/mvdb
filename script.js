const { GoogleSpreadsheet } = require('google-spreadsheet');
const axios = require('axios');
const fs = require('fs');
const zlib = require('zlib');

const apiKey = 'SUA_CHAVE_DE_API';
const docId = 'SEU_DOC_ID'; // ID da planilha do Google Sheets
const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS); // Obtém as credenciais do secret do GitHub Actions

// Inicialize a planilha
const doc = new GoogleSpreadsheet(docId);

async function accessSheet() {
    await doc.useServiceAccountAuth(credentials);
    await doc.loadInfo(); // Carrega a planilha e suas metadados
    const sheet = doc.sheetsByIndex[0]; // Pega a primeira aba da planilha

    // Leia as linhas da planilha
    const rows = await sheet.getRows();
    const contents = rows.map(row => ({
        id: row['Content ID'],
        type: row['Content Type'],
        title: row['Title'],
        description: row['Description']
    }));

    const movies = [];
    const tvShows = [];

    for (const content of contents) {
        const url = content.type === 'movie'
            ? `https://api.themoviedb.org/3/movie/${content.id}`
            : `https://api.themoviedb.org/3/tv/${content.id}`;
        const response = await axios.get(url, {
            params: { api_key: apiKey }
        });

        if (content.type === 'movie') {
            movies.push(response.data);
        } else {
            tvShows.push(response.data);
        }
    }

    // Gere o conteúdo XML
    const xmlContent = generateXML(movies, tvShows);
    saveXML(xmlContent, 'epg.xml');
    compressXML('epg.xml', 'epg.xml.gz');
}

function generateXML(movies, tvShows) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<tv>\n';
    
    movies.forEach(movie => {
        const tvgId = movie.id;
        const description = movie.overview;
        const title = movie.title;
        
        xml += `<programme id="${tvgId}" title="${title}">\n`;
        xml += `  <description><![CDATA[${description}]]></description>\n`;
        xml += `</programme>\n`;
    });

    tvShows.forEach(show => {
        const tvgId = show.id;
        const description = show.overview;
        const title = show.name;
        
        xml += `<programme id="${tvgId}" title="${title}">\n`;
        xml += `  <description><![CDATA[${description}]]></description>\n`;
        xml += `</programme>\n`;
    });

    xml += '</tv>\n';
    return xml;
}

function saveXML(content, filename) {
    fs.writeFileSync(filename, content);
    console.log(`Arquivo XML salvo como ${filename}`);
}

function compressXML(input, output) {
    const fileContents = fs.createReadStream(input);
    const writeStream = fs.createWriteStream(output);
    const zip = zlib.createGzip();

    fileContents.pipe(zip).pipe(writeStream).on('finish', (err) => {
        if (err) return console.error(err);
        console.log(`Arquivo comprimido salvo como ${output}`);
    });
}

// Execute a função para acessar a planilha e atualizar o EPG
accessSheet();
