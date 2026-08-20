const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function initStorage() {
  console.log("Creating patent_documents bucket...");
  const { data, error } = await supabase.storage.createBucket('patent_documents', {
    public: true,
    fileSizeLimit: 50 * 1024 * 1024,
  });
  
  if (error && error.message !== 'Bucket already exists') {
    console.error("Error creating bucket:", error);
  } else {
    console.log("Bucket created or already exists.");
  }
}

initStorage();
