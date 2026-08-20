const { BigQuery } = require('@google-cloud/bigquery');
require('dotenv').config({ path: '.env.local' });

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

async function query() {
  const q = `
    SELECT 
      publication_number,
      (SELECT text FROM UNNEST(title_localized) WHERE language = 'en' LIMIT 1) AS title,
      (SELECT text FROM UNNEST(abstract_localized) WHERE language = 'en' LIMIT 1) AS abstract,
      publication_date
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
    LIMIT 5
  `;

  try {
    const [rows] = await bigquery.query(q);
    console.log("RESULT_1:", JSON.stringify(rows, null, 2));

    if (rows.length === 0) {
      // Fallback query: just generative and threat
      const q2 = `
        SELECT 
          publication_number,
          (SELECT text FROM UNNEST(title_localized) WHERE language = 'en' LIMIT 1) AS title,
          (SELECT text FROM UNNEST(abstract_localized) WHERE language = 'en' LIMIT 1) AS abstract,
          publication_date
        FROM \`patents-public-data.patents.publications\`
        WHERE 
          EXISTS (
            SELECT 1 FROM UNNEST(abstract_localized) AS a 
            WHERE a.language = 'en' 
              AND LOWER(a.text) LIKE '%generative%'
              AND LOWER(a.text) LIKE '%cyber%'
          )
        ORDER BY publication_date DESC
        LIMIT 5
      `;
      const [rows2] = await bigquery.query(q2);
      console.log("RESULT_2:", JSON.stringify(rows2, null, 2));
    }
    
    // Test known patent
    const qTest = `
      SELECT 
          publication_number,
          (SELECT text FROM UNNEST(title_localized) WHERE language = 'en' LIMIT 1) AS title
      FROM \`patents-public-data.patents.publications\`
      WHERE publication_number = 'US-8723321-B2'
      LIMIT 1
    `;
    const [testRow] = await bigquery.query(qTest);
    console.log("TEST_KNOWN:", JSON.stringify(testRow, null, 2));

  } catch (err) {
    console.error(err);
  }
}

query();
