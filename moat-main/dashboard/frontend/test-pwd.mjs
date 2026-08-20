import bcrypt from "bcryptjs";

async function run() {
  const password = "jo1122002@";
  const hash = "$2b$10$qq3H2VOJj3d.Bg1UVctzfOVq1GnH804XTnHuSWgi7Xk/p1SUeiu/C";
  
  const isValid = await bcrypt.compare(password, hash);
  console.log("Password is valid:", isValid);
}

run();
