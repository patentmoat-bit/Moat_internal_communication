const { BigQuery } = require('@google-cloud/bigquery');
require('dotenv').config({ path: '.env.local' });

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

async function query() {
  const strictQuery = `
    SELECT 
      publication_number,
      (SELECT text FROM UNNEST(title_localized) WHERE language = 'en' LIMIT 1) AS title,
      (SELECT text FROM UNNEST(abstract_localized) WHERE language = 'en' LIMIT 1) AS abstract
    FROM \`patents-public-data.patents.publications\`
    WHERE 
      EXISTS (
        SELECT 1 FROM UNNEST(abstract_localized) AS a 
        WHERE a.language = 'en' 
          AND LOWER(a.text) LIKE '%generative%'
          AND (LOWER(a.text) LIKE '%threat%' OR LOWER(a.text) LIKE '%cyber%')
          AND LOWER(a.text) LIKE '%synthetic%'
      )
    ORDER BY publication_date DESC
    LIMIT 10
  `;

  const broaderQuery = `
    SELECT 
      publication_number,
      (SELECT text FROM UNNEST(title_localized) WHERE language = 'en' LIMIT 1) AS title,
      (SELECT text FROM UNNEST(abstract_localized) WHERE language = 'en' LIMIT 1) AS abstract
    FROM \`patents-public-data.patents.publications\`
    WHERE 
      EXISTS (
        SELECT 1 FROM UNNEST(abstract_localized) AS a 
        WHERE a.language = 'en' 
          AND LOWER(a.text) LIKE '%generative%'
          AND (LOWER(a.text) LIKE '%threat%' OR LOWER(a.text) LIKE '%cyber%')
          AND LOWER(a.text) NOT LIKE '%synthetic%'
      )
    ORDER BY publication_date DESC
    LIMIT 5
  `;

  try {
    const [strictRows] = await bigquery.query(strictQuery);
    const [broaderRows] = await bigquery.query(broaderQuery);
    
    require('fs').writeFileSync('bq_methodology.json', JSON.stringify({
      strict: strictRows,
      broader: broaderRows
    }, null, 2));
  } catch (err) {
    console.error(err);
  }
}

query();
