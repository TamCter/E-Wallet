const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://noctdqzhvnlaaqnixmni.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vY3RkcXpodm5sYWFxbml4bW5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MDExNjksImV4cCI6MjA4ODE3NzE2OX0.uPkF-nkQe88Vfonedhet0banNQxlNfMvZsP-W5DknDU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  if (process.env.NODE_ENV !== 'test' && process.env.ENABLE_TEST_RPCS !== 'true') {
    console.warn('Skipping state-changing RPC tests: NODE_ENV is not "test" and ENABLE_TEST_RPCS is not "true".');
    return;
  }

  console.log('Testing RPCs...');
  
  // Try calling process_deposit with a mock/safe check or list what functions are available
  // We don't have a logged-in user, but if the RPC exists, it should fail with auth/session error rather than "function does not exist"
  try {
    const { data, error } = await supabase.rpc('process_deposit', { deposit_amount: 1000 });
    console.log('process_deposit response:', { data, error });
  } catch (err) {
    console.error('process_deposit exception:', err.message);
  }

  try {
    const { data, error } = await supabase.rpc('process_withdrawal', { withdrawal_amount: 1000 });
    console.log('process_withdrawal response:', { data, error });
  } catch (err) {
    console.error('process_withdrawal exception:', err.message);
  }
}

main();
