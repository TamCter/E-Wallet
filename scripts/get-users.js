const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://noctdqzhvnlaaqnixmni.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vY3RkcXpodm5sYWFxbml4bW5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MDExNjksImV4cCI6MjA4ODE3NzE2OX0.uPkF-nkQe88Vfonedhet0banNQxlNfMvZsP-W5DknDU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error('Error: ADMIN_EMAIL and ADMIN_PASSWORD environment variables must be set.');
    process.exit(1);
  }

  console.log('Logging in as admin...');
  const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword
  });

  if (signInError) {
    console.error('Sign in error:', signInError.message);
    return;
  }

  console.log('Sign in successful. User ID:', authData.user.id);

  console.log('Fetching users...');
  const { data: dbUsers, error: usersError } = await supabase
    .from('users')
    .select('id, username, created_at');

  if (usersError) {
    console.error('Fetch users error:', usersError.message);
    return;
  }

  console.log(`Fetched ${dbUsers.length} users.`);
  console.log('Users list:');
  console.log(dbUsers.map(u => ({ id: u.id, username: u.username })));
}

main();
