const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const WebSocket = require('ws');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket }
});

async function run() {
  const tables = [
    { name: 'inventions', type: 'PATENT' },
    { name: 'trademarks', type: 'TRADEMARK' },
    { name: 'copyrights', type: 'COPYRIGHT' }
  ];

  const approvedStatuses = ['Approved', 'CEO_APPROVED', 'Completed'];

  for (const table of tables) {
    console.log(`Checking ${table.name}...`);
    const { data: projects, error } = await supabase
      .from(table.name)
      .select('id, title, status');
    
    if (error) {
      console.error(`Error fetching ${table.name}:`, error);
      continue;
    }

    const approvedProjects = projects.filter(p => approvedStatuses.includes(p.status));
    
    for (const project of approvedProjects) {
      // Check if it exists in finance_transactions
      const { data: existingTx } = await supabase
        .from('finance_transactions')
        .select('id')
        .eq('project_id', project.id)
        .single();

      if (!existingTx) {
        console.log(`Inserting finance transaction for ${project.title} (${project.id})`);
        const { error: insertError } = await supabase
          .from('finance_transactions')
          .insert({
            project_id: project.id,
            project_title: project.title,
            ip_type: table.type,
            payment_status: 'PENDING',
            ceo_approval_status: 'APPROVED',
            ceo_approved_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.error(`Error inserting for ${project.id}:`, insertError);
        } else {
          console.log(`Successfully inserted transaction for ${project.id}`);
        }
      } else {
        console.log(`Transaction already exists for ${project.title} (${project.id})`);
      }
    }
  }
}

run();
