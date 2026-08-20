const { BigQuery } = require('@google-cloud/bigquery');
require('dotenv').config({ path: '.env.local' });

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

async function query() {
  const q1 = `
    SELECT COUNT(DISTINCT publication_number) as total
    FROM \`patents-public-data.patents.publications\`
    WHERE 
      EXISTS (
        SELECT 1 FROM UNNEST(abstract_localized) AS a 
        WHERE a.language = 'en' 
          AND LOWER(a.text) LIKE '%generative%'
          AND (LOWER(a.text) LIKE '%threat%' OR LOWER(a.text) LIKE '%cyber%')
          AND LOWER(a.text) LIKE '%synthetic%'
      )
  `;

  const q2 = `
    SELECT COUNT(DISTINCT publication_number) as total
    FROM \`patents-public-data.patents.publications\`
    WHERE 
      EXISTS (
        SELECT 1 FROM UNNEST(abstract_localized) AS a 
        WHERE a.language = 'en' 
          AND LOWER(a.text) LIKE '%generative%'
          AND (LOWER(a.text) LIKE '%threat%' OR LOWER(a.text) LIKE '%cyber%')
      )
  `;

  try {
    const [rows1] = await bigquery.query(q1);
    const [rows2] = await bigquery.query(q2);
    console.log("Strict_Match_Total:", rows1[0].total);
    console.log("Broader_Match_Total:", rows2[0].total);
  } catch (err) {
    console.error(err);
  }
}

query();
