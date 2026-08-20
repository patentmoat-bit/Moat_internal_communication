"use server";

import { BigQuery } from '@google-cloud/bigquery';

// Initialize the BigQuery client lazily to ensure env vars are loaded by Next.js
let bigqueryInstance: BigQuery | null = null;

function getBigQueryClient(): BigQuery {
  if (!bigqueryInstance) {
    bigqueryInstance = new BigQuery({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'patent-506006',
      credentials: process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_CLIENT_EMAIL ? {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      } : undefined,
    });
  }
  return bigqueryInstance;
}

export async function getPatentDetailsFromBigQuery(patentNumber: string) {
  // Ensure the patent number is clean (uppercase, no whitespace)
  const cleanNumber = patentNumber.replace(/\s+/g, '').toUpperCase();
  
  // Format the patent number to match the Google Patents BigQuery format
  // Typically, format is CC-NNNNNNN-KK (e.g., US-8765432-B2)
  // If the user inputs US8765432B2, we might need to query it using LIKE or exact match if it exists.
  // The query below tries an exact match on publication_number or application_number
  
  const query = `
    SELECT 
      publication_number,
      application_number,
      country_code,
      title_localized,
      abstract_localized,
      inventor,
      assignee,
      filing_date,
      grant_date,
      publication_date,
      claims_localized,
      description_localized
    FROM \`patents-public-data.patents.publications\`
    WHERE publication_number = @patentNumber 
       OR REPLACE(publication_number, '-', '') = @cleanNumber
    LIMIT 1
  `;

  const options = {
    query: query,
    params: { 
      patentNumber: patentNumber,
      cleanNumber: cleanNumber 
    },
    // Location must match that of the dataset(s) referenced in the query.
    location: 'US',
  };

  try {
    const bq = getBigQueryClient();
    const [rows] = await bq.query(options);
    
    if (rows && rows.length > 0) {
      const patent = rows[0];
      
      // Extract English text from localized arrays
      const getEnglishText = (arr: any[]) => {
        if (!arr || !Array.isArray(arr) || arr.length === 0) return null;
        const enItem = arr.find((item: any) => item.language === 'en');
        return enItem ? enItem.text : arr[0].text;
      };

      // Extract names from assignee and inventor arrays
      const extractNames = (arr: any[]) => {
        if (!arr || !Array.isArray(arr)) return [];
        return arr.map(item => item.name).filter(Boolean);
      };

      return {
        publication_number: patent.publication_number,
        application_number: patent.application_number,
        country_code: patent.country_code,
        title: getEnglishText(patent.title_localized),
        abstract: getEnglishText(patent.abstract_localized),
        claims: getEnglishText(patent.claims_localized),
        description: getEnglishText(patent.description_localized),
        inventors: extractNames(patent.inventor),
        assignees: extractNames(patent.assignee),
        filing_date: patent.filing_date ? String(patent.filing_date.value) : null,
        grant_date: patent.grant_date ? String(patent.grant_date.value) : null,
        publication_date: patent.publication_date ? String(patent.publication_date.value) : null,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching patent from BigQuery:', error);
    throw error;
  }
}

export async function searchPatentsFromBigQuery(queryString: string) {
  const cleanStr = queryString.toLowerCase().trim();
  const terms = cleanStr.split(/[\s\-]+/).filter(t => t.length > 2);
  
  if (terms.length === 0) return [];

  // Build the AND conditions for the abstract
  const conditions = terms.map((t, i) => `LOWER(a.text) LIKE @term${i}`).join(' AND ');
  const titleConditions = terms.map((t, i) => `LOWER(t.text) LIKE @term${i}`).join(' AND ');
  
  const query = `
    SELECT 
      publication_number,
      application_number,
      country_code,
      title_localized,
      abstract_localized,
      inventor,
      assignee,
      filing_date,
      grant_date,
      publication_date
    FROM \`patents-public-data.patents.publications\`
    WHERE 
      EXISTS (
        SELECT 1 FROM UNNEST(abstract_localized) AS a 
        WHERE a.language = 'en' AND ${conditions}
      )
      OR
      EXISTS (
        SELECT 1 FROM UNNEST(title_localized) AS t 
        WHERE t.language = 'en' AND ${titleConditions}
      )
    ORDER BY publication_date DESC
  `;

  const params: Record<string, any> = {};
  terms.forEach((t, i) => {
    params[`term${i}`] = `%${t}%`;
  });

  const options = {
    query: query,
    params: params,
    location: 'US',
  };

  try {
    const bq = getBigQueryClient();
    const [rows] = await bq.query(options);
    
    return rows.map(patent => {
      const getEnglishText = (arr: any[]) => {
        if (!arr || !Array.isArray(arr) || arr.length === 0) return null;
        const enItem = arr.find((item: any) => item.language === 'en');
        return enItem ? enItem.text : arr[0].text;
      };

      const extractNames = (arr: any[]) => {
        if (!arr || !Array.isArray(arr)) return [];
        return arr.map(item => item.name).filter(Boolean);
      };

      return {
        patent_number: patent.publication_number ? patent.publication_number.replace(/-/g, '') : "Unknown",
        title: getEnglishText(patent.title_localized) || "Unknown Title",
        assignee: extractNames(patent.assignee).join(", ") || "Unknown Assignee",
        inventors: extractNames(patent.inventor),
        filing_date: patent.filing_date?.value ? String(patent.filing_date.value) : (patent.filing_date ? String(patent.filing_date) : "Unknown"),
        publication_date: patent.publication_date?.value ? String(patent.publication_date.value) : (patent.publication_date ? String(patent.publication_date) : "Unknown"),
        status: "Active",
        abstract: getEnglishText(patent.abstract_localized) || "No abstract available.",
        jurisdiction: patent.country_code || "US",
        ai_match_score: 95,
        relevance_reason: "Keyword match in BigQuery public dataset"
      };
    });
  } catch (error) {
    console.error('Error searching BigQuery:', error);
    throw error;
  }
}

