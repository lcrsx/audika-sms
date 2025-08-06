// Database connection test script
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vepyqttpljhjdzipervw.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test basic query
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Connection failed:', error);
      return false;
    }
    
    console.log('✅ Database connection successful');
    console.log('Connection details:', {
      url: supabaseUrl,
      keyPresent: !!supabaseKey
    });
    
    return true;
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
}

testConnection();