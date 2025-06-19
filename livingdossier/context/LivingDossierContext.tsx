import React, { createContext, useContext, useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { v4 as uuidv4 } from "uuid"

// Define the dossier structure
export interface LivingDossier {
  id: string
  userId: string
  title: string
  query: string
  refinedQuery?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  error?: string
  createdAt: string
  updatedAt: string
  
  // Content sections
  executiveSummary?: {
    text: string
    keyPoints: string[]
    recommendations: string[]
  }
  supportingEvidence?: {
    sections: Array<{
      title: string
      content: string
      visualizations?: string[] // References to visualization IDs
    }>
    sources: Array<{
      title: string
      url: string
      relevance: number
    }>
  }
  simulator?: {
    title: string
    description: string
    params: Record<string, number>
    outputs: Record<string, number>
    formula: (params: Record<string, number>) => Record<string, number>
    visualizations: string[] // References to visualization IDs
  }
  dataAppendix?: {
    datasets: Array<{
      name: string
      description: string
      source: string
      fields: Array<{
        name: string
        type: string
        description: string
      }>
      sampleData?: any[]
    }>
    visualizations: string[] // References to visualization IDs
  }
  
  // Visualizations
  visualizations: Record<string, any>
  
  // Metadata
  domain?: string
  tags?: string[]
  collaborators?: string[]
}

interface DossierState {
  isLoading: boolean
  progress: number
  dossier: LivingDossier | null
  error: string | null
  isGenerating: boolean
  recentDossiers: LivingDossier[]
  loadingRecentDossiers: boolean
}

interface SimulatorParams {
  paramId: string
  value: number
}

interface LivingDossierContextType {
  state: DossierState
  generateDossier: (query: string, domain?: string) => Promise<string | undefined>
  getDossier: (id: string) => Promise<void>
  updateSimulatorParam: (paramId: string, value: number) => void
  batchUpdateSimulatorParams: (params: SimulatorParams[]) => void
  resetSimulator: () => void
  saveDossierAnnotation: (annotation: { text: string, position: any }) => Promise<void>
  shareWithCollaborator: (email: string) => Promise<void>
  loadRecentDossiers: () => Promise<void>
}

const LivingDossierContext = createContext<LivingDossierContextType | undefined>(undefined)

export function LivingDossierProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DossierState>({
    isLoading: false,
    progress: 0,
    dossier: null,
    error: null,
    isGenerating: false,
    recentDossiers: [],
    loadingRecentDossiers: false
  })

  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )

  // Subscribe to dossier updates via Supabase Realtime
  useEffect(() => {
    if (!state.dossier?.id) return
    
    const channel = supabase.channel(`dossier_${state.dossier.id}`)
    
    channel
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'living_dossiers',
        filter: `id=eq.${state.dossier.id}`
      }, payload => {
        const updatedDossier = payload.new as unknown as LivingDossier
        
        setState(s => ({
          ...s,
          dossier: updatedDossier,
          progress: updatedDossier.progress || 0,
          isLoading: updatedDossier.status !== 'completed' && updatedDossier.status !== 'failed',
          error: updatedDossier.status === 'failed' ? updatedDossier.error || 'Generation failed' : null
        }))
      })
      .subscribe()
    
    // Cleanup function
    return () => {
      channel.unsubscribe()
    }
  }, [state.dossier?.id, supabase])

  // Generate a new dossier
  const generateDossier = async (query: string, domain?: string): Promise<string | undefined> => {
    try {
      setState({ ...state, isGenerating: true, isLoading: true, progress: 0, error: null })
      
      // Progress updates simulation
      const progressInterval = setInterval(() => {
        setState(s => ({ 
          ...s, 
          progress: Math.min(s.progress + Math.random() * 5, 90) 
        }))
      }, 1000)
      
      // Call API to generate dossier
      const response = await fetch('/api/living-dossier/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, domain })
      })
      
      clearInterval(progressInterval)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Failed to generate dossier')
      }
      
      const responseData = await response.json()
      
      // Return the dossier ID for redirection
      return responseData.dossierId
    } catch (error) {
      setState(s => ({ 
        ...s,
        isLoading: false, 
        isGenerating: false,
        progress: 0, 
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }))
      return undefined
    }
  }
  
  // Get a specific dossier by ID
  const getDossier = async (id: string) => {
    try {
      setState(s => ({ ...s, isLoading: true, error: null }))
      
      const { data, error } = await supabase
        .from('living_dossiers')
        .select('*')
        .eq('id', id)
        .single()
        
      if (error) throw new Error(error.message)
      
      setState(s => ({ 
        ...s,
        isLoading: false,
        dossier: data as unknown as LivingDossier,
        progress: data.progress || 100
      }))
    } catch (error) {
      setState(s => ({ 
        ...s,
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to load dossier'
      }))
    }
  }

  // Update a single simulator parameter
  const updateSimulatorParam = (paramId: string, value: number) => {
    if (!state.dossier?.simulator) return
    
    setState(s => {
      if (!s.dossier?.simulator) return s
      
      const simulatorParams = { ...s.dossier.simulator.params, [paramId]: value }
      const newOutputs = calculateOutputs(simulatorParams)
      
      return {
        ...s,
        dossier: {
          ...s.dossier,
          simulator: {
            ...s.dossier.simulator,
            params: simulatorParams,
            outputs: newOutputs
          }
        }
      }
    })
  }
  
  // Update multiple simulator parameters at once
  const batchUpdateSimulatorParams = (params: SimulatorParams[]) => {
    if (!state.dossier?.simulator || params.length === 0) return
    
    setState(s => {
      if (!s.dossier?.simulator) return s
      
      const simulatorParams = { ...s.dossier.simulator.params }
      params.forEach(param => {
        simulatorParams[param.paramId] = param.value
      })
      
      const newOutputs = calculateOutputs(simulatorParams)
      
      return {
        ...s,
        dossier: {
          ...s.dossier,
          simulator: {
            ...s.dossier.simulator,
            params: simulatorParams,
            outputs: newOutputs
          }
        }
      }
    })
  }
  
  // Reset simulator to default values
  const resetSimulator = () => {
    if (!state.dossier?.simulator) return
    
    setState(s => {
      if (!s.dossier?.simulator) return s
      
      // Get the default params (this assumes the current params have the same structure as defaults)
      const defaultParams = Object.fromEntries(
        Object.keys(s.dossier.simulator.params).map(key => {
          // For each param, find its corresponding input in the visualizations to get the default value
          const visualization = Object.values(s.dossier.visualizations || {})
            .find(v => v.interactiveElements?.inputs?.some(input => input.id === key) ||
                         v.interactiveElements?.sliders?.some(slider => slider.id === key))
                         
          const input = visualization?.interactiveElements?.inputs?.find(input => input.id === key)
          const slider = visualization?.interactiveElements?.sliders?.find(slider => slider.id === key)
          
          return [key, (input?.defaultValue || slider?.defaultValue || 0)]
        })
      )
      
      const newOutputs = calculateOutputs(defaultParams)
      
      return {
        ...s,
        dossier: {
          ...s.dossier,
          simulator: {
            ...s.dossier.simulator,
            params: defaultParams,
            outputs: newOutputs
          }
        }
      }
    })
  }
  
  const calculateOutputs = (params: Record<string, number>) => {
    if (!state.dossier?.simulator?.formula) {
      return {}
    }
    
    // Apply the formula from the dossier
    try {
      return state.dossier.simulator.formula(params)
    } catch (error) {
      console.error('Error calculating simulator outputs:', error)
      return {}
    }
  }
  
  // Save an annotation to a dossier
  const saveDossierAnnotation = async (annotation: { text: string, position: any }) => {
    if (!state.dossier?.id) return
    
    try {
      const annotationId = uuidv4()
      
      const { error } = await supabase
        .from('living_dossier_annotations')
        .insert({
          id: annotationId,
          dossier_id: state.dossier.id,
          text: annotation.text,
          position: annotation.position,
          created_at: new Date().toISOString()
        })
        
      if (error) throw new Error(error.message)
      
      // Don't need to update state since the realtime subscription should handle it
    } catch (error) {
      console.error('Error saving annotation:', error)
      // Optionally show an error toast or alert
    }
  }
  
  // Share dossier with a collaborator
  const shareWithCollaborator = async (email: string) => {
    if (!state.dossier?.id) return
    
    try {
      // First get the user ID from the email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()
        
      if (userError || !userData) {
        throw new Error('User not found')
      }
      
      // Add the collaborator to the dossier
      const { error } = await supabase
        .from('living_dossier_collaborators')
        .insert({
          dossier_id: state.dossier.id,
          user_id: userData.id,
          access_level: 'viewer',
          created_at: new Date().toISOString()
        })
        
      if (error) throw new Error(error.message)
      
      // Update local state with the new collaborator
      setState(s => ({
        ...s,
        dossier: s.dossier ? {
          ...s.dossier,
          collaborators: [...(s.dossier.collaborators || []), userData.id]
        } : null
      }))
    } catch (error) {
      console.error('Error sharing dossier:', error)
      // Optionally show an error toast or alert
    }
  }
  
  // Load recent dossiers
  const loadRecentDossiers = async () => {
    setState(s => ({ ...s, loadingRecentDossiers: true }))
    
    try {
      const { data, error } = await supabase
        .from('living_dossiers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
        
      if (error) throw new Error(error.message)
      
      setState(s => ({ 
        ...s, 
        recentDossiers: data as unknown as LivingDossier[],
        loadingRecentDossiers: false
      }))
    } catch (error) {
      console.error('Error loading recent dossiers:', error)
      setState(s => ({ ...s, loadingRecentDossiers: false }))
    }
  }

  return (
    <LivingDossierContext.Provider value={{ 
      state, 
      generateDossier, 
      getDossier,
      updateSimulatorParam,
      batchUpdateSimulatorParams,
      resetSimulator,
      saveDossierAnnotation,
      shareWithCollaborator,
      loadRecentDossiers
    }}>
      {children}
    </LivingDossierContext.Provider>
  )
}

export function useLivingDossier() {
  const context = useContext(LivingDossierContext)
  if (context === undefined) {
    throw new Error('useLivingDossier must be used within a LivingDossierProvider')
  }
  return context
} 