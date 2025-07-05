import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSmartPythonExecutor, ExecutionRequirements } from '@/lib/services/SmartPythonExecutor';
import { logger } from '@/memory-framework/config';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logger.warn('[PythonExecution] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code, data, requirements } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Python code is required' }, { status: 400 });
    }

    logger.info(`[PythonExecution] Executing code for user: ${user.id}`);

    const smartExecutor = getSmartPythonExecutor();

    // Set default requirements with user context
    const executionRequirements: ExecutionRequirements = {
      userId: user.id,
      securityLevel: 'high',
      fallbackAllowed: true,
      concurrent: true,
      ...requirements
    };

    // Execute Python code with smart routing
    const result = await smartExecutor.executeCode(code, data || [], executionRequirements);

    return NextResponse.json({
      success: result.success,
      output: result.output,
      error: result.error,
      executionTime: result.executionTime,
      engine: result.engine,
      charts: result.charts,
      insights: result.insights,
      metadata: result.metadata
    });

  } catch (error: any) {
    logger.error('[PythonExecution] Error:', error);
    return NextResponse.json({ 
      error: 'Python execution failed',
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

    // Get engine status and recommendations
    const performanceStats = smartExecutor.getPerformanceStats();
    const recommendations = smartExecutor.getRecommendations();

    return NextResponse.json({
      performanceStats,
      recommendations,
      availableEngines: ['browser', 'docker', 'cloud']
    });

  } catch (error: any) {
    logger.error('[PythonExecution] Status check failed:', error);
    return NextResponse.json({ 
      error: 'Status check failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
} 