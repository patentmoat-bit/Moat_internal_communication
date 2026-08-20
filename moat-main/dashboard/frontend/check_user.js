const bcrypt = require('bcryptjs');

async function gen() {
  const hash = await bcrypt.hash('Admin@123!', 10);
  console.log("Correct Hash:", hash);
  const isValid = await bcrypt.compare('Admin@123!', hash);
  console.log("Valid?", isValid);
}
gen();
