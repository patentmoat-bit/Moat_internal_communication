const { BigQuery } = require('@google-cloud/bigquery');
require('dotenv').config({ path: '.env.local' });

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

async function query() {
  const q = `
    SELECT 
      publication_number,
      application_number,
      country_code,
      title_localized,
      inventor,
      assignee,
      publication_date
    FROM \`patents-public-data.patents.publications\`
    CROSS JOIN UNNEST(title_localized) as t
    WHERE LOWER(t.text) LIKE '%a system and method for generating and evaluating synthetic cyber-threat behaviors%'
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
