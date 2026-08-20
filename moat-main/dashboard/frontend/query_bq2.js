const { BigQuery } = require('@google-cloud/bigquery');
require('dotenv').config({ path: '.env.local' });

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

async function query() {
  const q = `
    SELECT 
      publication_number,
      title_localized
    FROM \`patents-public-data.patents.publications\`
    CROSS JOIN UNNEST(title_localized) as t
    WHERE LOWER(t.text) LIKE '%semantic-distance-driven generative modelling%'
    LIMIT 10
  `;

  try {
    const [rows] = await bigquery.query(q);
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  }
}

query();
