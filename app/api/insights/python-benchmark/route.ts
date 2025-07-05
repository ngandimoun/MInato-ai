import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSmartPythonExecutor } from '@/lib/services/SmartPythonExecutor';
import { logger } from '@/memory-framework/config';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logger.warn('[PythonBenchmark] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info(`[PythonBenchmark] Starting benchmark for user: ${user.id}`);

    const smartExecutor = getSmartPythonExecutor();

    // Run comprehensive benchmark
    const benchmarkResults = await smartExecutor.benchmarkEngines();

    // Get current performance stats
    const performanceStats = smartExecutor.getPerformanceStats();

    // Get recommendations
    const recommendations = smartExecutor.getRecommendations();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      benchmarkResults,
      performanceStats,
      recommendations,
      summary: {
        totalEngines: Object.keys(benchmarkResults).length,
        availableEngines: Object.entries(benchmarkResults)
          .filter(([_, result]: [string, any]) => result.available)
          .map(([engine, _]) => engine),
        fastestEngine: Object.entries(benchmarkResults)
          .filter(([_, result]: [string, any]) => result.success)
          .sort(([_a, a]: [string, any], [_b, b]: [string, any]) => a.executionTime - b.executionTime)[0]?.[0],
        recommendedEngine: 'browser' // Default recommendation
      }
    });

  } catch (error: any) {
    logger.error('[PythonBenchmark] Error:', error);
    return NextResponse.json({ 
      error: 'Benchmark failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const smartExecutor = getSmartPythonExecutor();

    // Get current performance stats without running new benchmark
    const performanceStats = smartExecutor.getPerformanceStats();
    const recommendations = smartExecutor.getRecommendations();

    return NextResponse.json({
      performanceStats,
      recommendations,
      lastBenchmark: null, // Would need to store this in database
      availableEngines: ['browser', 'docker', 'cloud']
    });

  } catch (error: any) {
    logger.error('[PythonBenchmark] Status check failed:', error);
    return NextResponse.json({ 
      error: 'Status check failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
} 