import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Bulk update patient VIP status
 * PATCH /api/patients/bulk/vip
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function PATCH(_request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // const { patientIds, isVIP } = await request.json(); // Will be used when database column is added
    
    // if (!Array.isArray(patientIds) || patientIds.length === 0) {
    //   return NextResponse.json({ 
    //     error: 'Invalid patient IDs. Must be non-empty array.' 
    //   }, { status: 400 });
    // }

    // if (typeof isVIP !== 'boolean') {
    //   return NextResponse.json({ 
    //     error: 'Invalid VIP status. Must be boolean.' 
    //   }, { status: 400 });
    // }

    // // Limit bulk operations to reasonable size
    // if (patientIds.length > 100) {
    //   return NextResponse.json({ 
    //     error: 'Too many patients. Maximum 100 allowed per bulk operation.' 
    //   }, { status: 400 });
    // }

    // TODO: Implement bulk VIP status update when database column is created
    // For now, return a placeholder response
    return NextResponse.json({
      error: 'VIP patient feature requires database migration. Column is_vip does not exist on patients table.'
    }, { status: 501 });

  } catch (error) {
    console.error('Error in bulk VIP status endpoint:', error);
    
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}