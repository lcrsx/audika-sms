import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Update patient VIP status
 * PATCH /api/patients/[id]/vip
 */
export async function PATCH(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  { params: _params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    // const { id } = await params; // Will be used when database column is added
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // const { isVIP } = await request.json(); // Will be used when database column is added
    
    // if (typeof isVIP !== 'boolean') {
    //   return NextResponse.json({ 
    //     error: 'Invalid VIP status. Must be boolean.' 
    //   }, { status: 400 });
    // }

    // TODO: Implement VIP status update when database column is created
    // For now, return a placeholder response
    return NextResponse.json({
      error: 'VIP patient feature requires database migration. Column is_vip does not exist on patients table.'
    }, { status: 501 });

  } catch (error) {
    console.error('Error in VIP status endpoint:', error);
    
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}