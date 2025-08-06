// Test endpoint to debug database connection and player table structure
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    console.log('Starting database test...');
    
    // Test 1: Create Supabase client
    const supabase = await createClient();
    console.log('✅ Supabase client created');
    
    // Test 2: Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json({ 
        error: 'Authentication failed', 
        details: authError.message 
      }, { status: 401 });
    }
    
    if (!user) {
      return NextResponse.json({ 
        error: 'No user logged in' 
      }, { status: 401 });
    }
    
    console.log('✅ User authenticated:', user.id);
    
    // Test 3: Query players table structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('players')
      .select('*')
      .limit(0);
      
    if (tableError) {
      console.error('❌ Table query error:', tableError);
      return NextResponse.json({ 
        error: 'Table query failed', 
        details: tableError.message,
        hint: tableError.hint
      }, { status: 500 });
    }
    
    // Test 4: Try to get player data
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .select('id, full_name, preferred_language')
      .eq('id', user.id)
      .single();
      
    if (playerError) {
      console.error('❌ Player query error:', playerError);
      
      // If player doesn't exist, try to see what columns are available
      const { data: anyPlayer, error: anyError } = await supabase
        .from('players')
        .select('*')
        .limit(1)
        .single();
        
      return NextResponse.json({ 
        success: false,
        userId: user.id,
        playerQueryError: {
          message: playerError.message,
          code: playerError.code,
          details: playerError.details,
          hint: playerError.hint
        },
        samplePlayerStructure: anyError ? null : Object.keys(anyPlayer || {})
      });
    }
    
    // Success response
    return NextResponse.json({
      success: true,
      userId: user.id,
      playerData: playerData,
      availableColumns: playerData ? Object.keys(playerData) : [],
      hasPreferredLanguage: playerData?.preferred_language !== undefined
    });
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}