import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { JobApplication, MasterResume } from '@/types';
import type { TimeRangeFilter } from '@/types/analytics';
import { calculateAnalyticsSummary } from '@/lib/analytics';
import { dbRowToApplication, dbRowToMasterResume } from '@/lib/supabase/mappers';
import { INITIAL_APPLICATIONS, INITIAL_MASTER_RESUME } from '@/data/mockData';

// ---------------------------------------------------------------------------
// GET Handler
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const range = (searchParams.get('range') || 'all') as TimeRangeFilter;

    let apps: JobApplication[] = [];
    let master: MasterResume | undefined = undefined;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Fetch authenticated user applications and master resume
      const [appsRes, masterRes] = await Promise.all([
        supabase
          .from('applications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('master_resumes').select('*').eq('user_id', user.id).maybeSingle(),
      ]);

      if (!appsRes.error && appsRes.data?.length) {
        apps = appsRes.data.map(dbRowToApplication);
      }
      if (!masterRes.error && masterRes.data) {
        master = dbRowToMasterResume(masterRes.data);
      }
    }

    // If unauthenticated or user has no DB rows yet, fall back to mock data
    if (apps.length === 0) {
      apps = INITIAL_APPLICATIONS;
      master = INITIAL_MASTER_RESUME;
    }

    const summary = calculateAnalyticsSummary(apps, master, range);
    return NextResponse.json(summary);
  } catch (error: any) {
    console.error('Error in /api/analytics/summary:', error);
    // Return mock calculated fallback
    const fallbackSummary = calculateAnalyticsSummary(
      INITIAL_APPLICATIONS,
      INITIAL_MASTER_RESUME,
      'all'
    );
    return NextResponse.json(fallbackSummary);
  }
}
