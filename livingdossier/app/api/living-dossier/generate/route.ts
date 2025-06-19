import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { StrategyService } from "../../../../services/strategy/StrategyService"
import { v4 as uuidv4 } from "uuid"
import { config } from "../../../../config/config"

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const supabase = createClient(
      config.SUPABASE_URL,
      config.SUPABASE_KEY
    )
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }
    
    // Parse the request body
    const { query, domain } = await request.json()
    
    if (!query) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      )
    }
    
    // Generate a unique ID for the dossier
    const dossierId = uuidv4()
    
    // If domain is not provided, detect it
    let detectedDomain = domain
    if (!detectedDomain) {
      const strategyService = StrategyService.getInstance()
      detectedDomain = strategyService.detectDomainFromQuery(query)
    }
    
    // Insert initial dossier record
    await supabase
      .from("living_dossiers")
      .insert({
        id: dossierId,
        user_id: user.id,
        query,
        domain: detectedDomain,
        status: "pending",
        progress: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    
    // Start async generation process without waiting for completion
    generateDossierInBackground(dossierId, query, detectedDomain, user.id)
    
    return NextResponse.json({ 
      dossierId,
      status: "pending", 
      message: "Dossier generation started",
      domain: detectedDomain
    })
    
  } catch (error) {
    console.error("Error starting dossier generation:", error)
    return NextResponse.json(
      { error: "Failed to start dossier generation" },
      { status: 500 }
    )
  }
}

async function generateDossierInBackground(
  dossierId: string, 
  query: string,
  domain: string,
  userId: string
) {
  const supabase = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_KEY
  )
  
  try {
    // Update status to processing
    await supabase
      .from("living_dossiers")
      .update({ status: "processing", progress: 10, updated_at: new Date().toISOString() })
      .eq("id", dossierId)
    
    // Step 1: Generate refined query
    const refined = await generateRefinedQuery(query, domain)
    
    await supabase
      .from("living_dossiers")
      .update({ 
        refined_query: refined.refinedQuery, 
        title: refined.title,
        progress: 20, 
        updated_at: new Date().toISOString() 
      })
      .eq("id", dossierId)
    
    // Step 2: Generate executive summary
    const executiveSummary = await generateExecutiveSummary(refined.refinedQuery, domain)
    
    await supabase
      .from("living_dossiers")
      .update({ 
        executive_summary: executiveSummary,
        progress: 30, 
        updated_at: new Date().toISOString() 
      })
      .eq("id", dossierId)
    
    // Step 3: Generate supporting evidence
    const supportingEvidence = await generateSupportingEvidence(refined.refinedQuery, domain)
    
    await supabase
      .from("living_dossiers")
      .update({ 
        supporting_evidence: supportingEvidence,
        progress: 50, 
        updated_at: new Date().toISOString() 
      })
      .eq("id", dossierId)
    
    // Step 4: Generate simulator
    const simulator = await generateSimulator(refined.refinedQuery, domain)
    
    await supabase
      .from("living_dossiers")
      .update({ 
        simulator,
        progress: 70, 
        updated_at: new Date().toISOString() 
      })
      .eq("id", dossierId)
    
    // Step 5: Generate data appendix
    const dataAppendix = await generateDataAppendix(refined.refinedQuery, domain)
    
    await supabase
      .from("living_dossiers")
      .update({ 
        data_appendix: dataAppendix,
        progress: 90, 
        updated_at: new Date().toISOString() 
      })
      .eq("id", dossierId)
    
    // Step 6: Generate visualizations
    const visualizations = await generateVisualizations(
      refined.refinedQuery,
      domain,
      executiveSummary,
      supportingEvidence,
      simulator,
      dataAppendix
    )
    
    // Update with completed status and data
    await supabase
      .from("living_dossiers")
      .update({
        status: "completed",
        progress: 100,
        visualizations,
        updated_at: new Date().toISOString()
      })
      .eq("id", dossierId)
      
  } catch (error) {
    console.error("Error in background dossier generation:", error)
    
    // Update with error status
    await supabase
      .from("living_dossiers")
      .update({
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        updated_at: new Date().toISOString()
      })
      .eq("id", dossierId)
  }
}

async function generateRefinedQuery(query: string, domain: string) {
  try {
    // Use OpenAI to refine the query
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert at refining user queries into clear, specific questions that can be researched and analyzed. 
            Generate a refined version of the user's query that maintains the original intent but makes it more specific and actionable.
            Also generate a concise title for this research dossier related to the ${domain} domain.`
          },
          {
            role: "user",
            content: `Refine this query: "${query}"`
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    })
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    
    const data = await response.json()
    const result = JSON.parse(data.choices[0].message.content)
    
    return {
      refinedQuery: result.refinedQuery || query,
      title: result.title || `Research on: ${query}`
    }
  } catch (error) {
    console.error("Error refining query:", error)
    return {
      refinedQuery: query,
      title: `Research on: ${query}`
    }
  }
}

async function generateExecutiveSummary(query: string, domain: string) {
  try {
    // Use OpenAI to generate an executive summary
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert researcher in the ${domain} domain. Generate a concise executive summary for the following query.
            Include key points and recommendations. Format your response as JSON with 'text', 'keyPoints', and 'recommendations' properties.`
          },
          {
            role: "user",
            content: query
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    })
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    
    const data = await response.json()
    return JSON.parse(data.choices[0].message.content)
  } catch (error) {
    console.error("Error generating executive summary:", error)
    return {
      text: "An error occurred while generating the executive summary.",
      keyPoints: ["Could not generate key points"],
      recommendations: ["Could not generate recommendations"]
    }
  }
}

async function generateSupportingEvidence(query: string, domain: string) {
  try {
    // Use OpenAI to generate supporting evidence
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert researcher in the ${domain} domain. Generate supporting evidence for the following query.
            Include multiple sections with different aspects of the topic. Also provide reputable sources.
            Format your response as JSON with 'sections' and 'sources' properties.`
          },
          {
            role: "user",
            content: query
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    })
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    
    const data = await response.json()
    return JSON.parse(data.choices[0].message.content)
  } catch (error) {
    console.error("Error generating supporting evidence:", error)
    return {
      sections: [{
        title: "Error",
        content: "An error occurred while generating supporting evidence."
      }],
      sources: []
    }
  }
}

async function generateSimulator(query: string, domain: string) {
  try {
    // Use OpenAI to generate a simulator definition
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert in creating interactive simulators for the ${domain} domain.
            Design a simulator related to the query with parameters that users can adjust.
            Format your response as JSON with 'title', 'description', 'params', and 'outputs' properties.
            Each param should have a name, default value, min, max, and step.
            Also include a simple formula description of how inputs affect outputs.`
          },
          {
            role: "user",
            content: query
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    })
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    
    const data = await response.json()
    const result = JSON.parse(data.choices[0].message.content)
    
    // Convert the formula description to an actual function
    result.formula = new Function(
      'params',
      `
        try {
          const outputs = {};
          // Extract params for easier access
          ${Object.keys(result.params).map(key => `const ${key} = params.${key};`).join('\n')}
          
          // Calculate outputs
          ${Object.keys(result.outputs).map(key => {
            // This is a simplified calculation, in reality you'd have more complex logic here
            return `outputs.${key} = ${result.outputs[key].formula || result.outputs[key].defaultFormula || '0'};`;
          }).join('\n')}
          
          return outputs;
        } catch (error) {
          console.error('Error in simulator formula:', error);
          return ${JSON.stringify(result.outputs)};
        }
      `
    );
    
    return result
  } catch (error) {
    console.error("Error generating simulator:", error)
    return {
      title: "Simple Simulator",
      description: "This is a fallback simulator due to an error in generation.",
      params: {
        param1: 10,
        param2: 20
      },
      outputs: {
        output1: 30,
        output2: 200
      },
      formula: function(params: any) {
        return { 
          output1: params.param1 + params.param2, 
          output2: params.param1 * params.param2 
        };
      }
    }
  }
}

async function generateDataAppendix(query: string, domain: string) {
  try {
    // Use OpenAI to generate a data appendix
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert in data analysis for the ${domain} domain.
            Create a data appendix with datasets that would be useful for analyzing the query.
            Format your response as JSON with a 'datasets' array containing objects with 'name', 'description', 'source', and 'fields' properties.`
          },
          {
            role: "user",
            content: query
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    })
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    
    const data = await response.json()
    return JSON.parse(data.choices[0].message.content)
  } catch (error) {
    console.error("Error generating data appendix:", error)
    return {
      datasets: [{
        name: "Example Dataset",
        description: "This is a placeholder dataset due to an error in generation.",
        source: "N/A",
        fields: [
          { name: "field1", type: "string", description: "First field" },
          { name: "field2", type: "number", description: "Second field" }
        ]
      }]
    }
  }
}

async function generateVisualizations(
  query: string,
  domain: string,
  executiveSummary: any,
  supportingEvidence: any,
  simulator: any,
  dataAppendix: any
) {
  try {
    // Use OpenAI to generate visualization definitions
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert in data visualization for the ${domain} domain.
            Create visualization definitions for each section of a research dossier.
            Each visualization should have a unique ID, type, title, sample data, and placement.
            Generate at least one visualization for each section: executiveSummary, supportingEvidence, simulator, dataAppendix.
            Format your response as a JSON object where keys are visualization IDs and values are visualization definitions.`
          },
          {
            role: "user",
            content: JSON.stringify({
              query,
              domain,
              executiveSummaryTopics: executiveSummary.keyPoints,
              supportingEvidenceSections: supportingEvidence.sections.map((s: any) => s.title),
              simulatorParams: Object.keys(simulator.params),
              simulatorOutputs: Object.keys(simulator.outputs),
              datasetNames: dataAppendix.datasets.map((d: any) => d.name)
            })
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    })
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    
    const data = await response.json()
    return JSON.parse(data.choices[0].message.content)
  } catch (error) {
    console.error("Error generating visualizations:", error)
    return {
      "vis1": {
        type: "bar",
        title: "Sample Visualization",
        data: {
          labels: ["Category 1", "Category 2", "Category 3"],
          datasets: [{
            label: "Values",
            data: [10, 20, 30]
          }]
        },
        sectionPlacement: "executiveSummary"
      }
    }
  }
} 