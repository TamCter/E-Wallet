const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://noctdqzhvnlaaqnixmni.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vY3RkcXpodm5sYWFxbml4bW5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MDExNjksImV4cCI6MjA4ODE3NzE2OX0.uPkF-nkQe88Vfonedhet0banNQxlNfMvZsP-W5DknDU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('Logging in as admin...');
  const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'admin@gmail.com',
    password: '071020041'
  });

  if (signInError) {
    console.error('Sign in error:', signInError.message);
    return;
  }

  console.log('Sign in successful. User ID:', authData.user.id);

  console.log('Fetching users...');
  const { data: dbUsers, error: usersError } = await supabase
    .from('users')
    .select('*');

  if (usersError) {
    console.error('Fetch users error:', usersError.message);
    return;
  }

  console.log('Users list:');
  console.log(JSON.stringify(dbUsers, null, 2));
}

main();
