/**
 * Receipt and Invoice Processor
 * Specialized service for extracting structured financial data from business documents
 */

import OpenAI from 'openai';
import { logger } from '@/memory-framework/config';
import { getInsightsService, InsightsDocument } from './InsightsService';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ExtractedFinancialData {
  // Basic transaction info
  type: 'receipt' | 'invoice' | 'financial_document';
  amount: number;
  currency: string;
  date: string;
  
  // Business entities
  vendor: string;
  customer?: string;
  business_name?: string;
  
  // Detailed breakdown
  line_items: Array<{
    description: string;
    quantity?: number;
    unit_price?: number;
    total: number;
    category?: string;
  }>;
  
  // Financial details
  subtotal?: number;
  tax_amount?: number;
  tax_rate?: number;
  tip_amount?: number;
  discount_amount?: number;
  total_amount: number;
  
  // Document metadata
  invoice_number?: string;
  receipt_number?: string;
  payment_method?: string;
  reference_number?: string;
  
  // Business categorization
  business_category: string;
  expense_category: string;
  tags: string[];
  
  // Analysis
  confidence_score: number;
  extracted_text: string;
  processing_notes: string[];
}

export interface FinancialPatternAnalysis {
  vendor_patterns: Array<{
    vendor: string;
    frequency: number;
    total_spent: number;
    average_amount: number;
    categories: string[];
    trend: 'increasing' | 'decreasing' | 'stable';
  }>;
  
  spending_patterns: Array<{
    category: string;
    total_amount: number;
    transaction_count: number;
    average_amount: number;
    percentage_of_total: number;
  }>;
  
  temporal_patterns: Array<{
    period: string; // daily, weekly, monthly
    pattern: string;
    amount: number;
    frequency: number;
  }>;
  
  insights: string[];
  anomalies: Array<{
    type: string;
    description: string;
    amount: number;
    date: string;
  }>;
}

export class ReceiptInvoiceProcessor {
  private insightsService = getInsightsService();

  /**
   * Process a financial document (receipt/invoice) and extract structured data
   */
  async processFinancialDocument(
    documentId: string,
    imageData?: string, // base64 image data if it's an image
    textContent?: string // extracted text if it's a text document
  ): Promise<ExtractedFinancialData | null> {
    const logPrefix = '[ReceiptProcessor]';
    
    try {
      logger.info(`${logPrefix} Processing financial document: ${documentId}`);
      
      const document = await this.insightsService.getDocument(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      let extractedData: ExtractedFinancialData;

      if (imageData) {
        extractedData = await this.processImageDocument(document, imageData);
      } else if (textContent) {
        extractedData = await this.processTextDocument(document, textContent);
      } else {
        throw new Error('No image data or text content provided');
      }

      // Store the extracted data back to the document
      await this.insightsService.updateDocument(documentId, {
        extracted_text: extractedData.extracted_text,
        processing_status: 'completed'
      });

      // Create transaction record
      await this.createTransactionFromExtractedData(document.user_id, extractedData, documentId);

      logger.info(`${logPrefix} Successfully processed document: ${documentId}`);
      return extractedData;

    } catch (error: any) {
      logger.error(`${logPrefix} Error processing document ${documentId}:`, error.message);
      
      // Update document status to failed
      await this.insightsService.updateDocument(documentId, {
        processing_status: 'failed'
      });
      
      return null;
    }
  }

  /**
   * Process an image document (receipt/invoice photo)
   */
  private async processImageDocument(
    document: InsightsDocument,
    imageData: string
  ): Promise<ExtractedFinancialData> {
    const prompt = `You are an expert financial document processor. Analyze this receipt/invoice image and extract all relevant financial data.

Document Context:
- Filename: ${document.original_filename}
- Categories: ${document.categories?.join(', ') || 'None'}
- User Description: ${document.description || 'None'}

Extract the following information and return as JSON:
{
  "type": "receipt" or "invoice",
  "amount": total_amount_as_number,
  "currency": "USD" (or detected currency),
  "date": "YYYY-MM-DD" (transaction date),
  "vendor": "business/vendor name",
  "customer": "customer name if invoice",
  "line_items": [
    {
      "description": "item description",
      "quantity": number_or_null,
      "unit_price": price_or_null,
      "total": line_total,
      "category": "food/office/travel/etc"
    }
  ],
  "subtotal": subtotal_before_tax,
  "tax_amount": tax_amount,
  "tax_rate": tax_percentage,
  "tip_amount": tip_if_present,
  "discount_amount": discount_if_present,
  "total_amount": final_total,
  "invoice_number": "invoice_number_if_present",
  "receipt_number": "receipt_number_if_present",
  "payment_method": "cash/card/etc",
  "business_category": "restaurant/office_supplies/travel/etc",
  "expense_category": "meals/office/travel/etc",
  "tags": ["relevant", "business", "tags"],
  "confidence_score": 0.0_to_1.0,
  "extracted_text": "all_visible_text_from_image",
  "processing_notes": ["any_issues_or_observations"]
}

Focus on accuracy for amounts, dates, and vendor names. If something is unclear, note it in processing_notes.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageData, detail: "high" } }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    try {
      return JSON.parse(content) as ExtractedFinancialData;
    } catch {
      // Fallback parsing
      return this.parseUnstructuredResponse(content, document);
    }
  }

  /**
   * Process a text document (PDF, CSV, etc.)
   */
  private async processTextDocument(
    document: InsightsDocument,
    textContent: string
  ): Promise<ExtractedFinancialData> {
    const prompt = `You are an expert financial document processor. Analyze this financial document text and extract all relevant data.

Document Context:
- Filename: ${document.original_filename}
- File Type: ${document.file_type}
- Categories: ${document.categories?.join(', ') || 'None'}
- User Description: ${document.description || 'None'}

Document Text:
${textContent.slice(0, 4000)}

Extract financial information and return the same JSON structure as specified for image processing. Focus on:
1. Transaction amounts and dates
2. Vendor/customer information  
3. Line items and categories
4. Tax and fee breakdowns
5. Payment details

Return JSON format only.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    try {
      return JSON.parse(content) as ExtractedFinancialData;
    } catch {
      return this.parseUnstructuredResponse(content, document);
    }
  }

  /**
   * Fallback parser for unstructured responses
   */
  private parseUnstructuredResponse(
    content: string,
    document: InsightsDocument
  ): ExtractedFinancialData {
    // Extract basic info with regex patterns
    const amountMatch = content.match(/(?:total|amount)[:\s]*\$?(\d+\.?\d*)/i);
    const dateMatch = content.match(/(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/);
    const vendorMatch = content.match(/(?:vendor|business|store)[:\s]*([^\n]+)/i);

    return {
      type: document.categories?.includes('invoice') ? 'invoice' : 'receipt',
      amount: amountMatch ? parseFloat(amountMatch[1]) : 0,
      currency: 'USD',
      date: dateMatch ? this.normalizeDate(dateMatch[1]) : new Date().toISOString().split('T')[0],
      vendor: vendorMatch ? vendorMatch[1].trim() : 'Unknown Vendor',
      line_items: [],
      total_amount: amountMatch ? parseFloat(amountMatch[1]) : 0,
      business_category: 'general',
      expense_category: 'general',
      tags: document.categories || [],
      confidence_score: 0.3,
      extracted_text: content,
      processing_notes: ['Fallback parsing used due to unstructured response']
    };
  }

  /**
   * Create a transaction record from extracted financial data
   */
  private async createTransactionFromExtractedData(
    userId: string,
    data: ExtractedFinancialData,
    documentId: string
  ): Promise<void> {
    try {
      await this.insightsService.createTransaction({
        user_id: userId,
        transaction_type: data.type === 'invoice' ? 'revenue' : 'expense',
        amount: data.total_amount,
        currency: data.currency,
        description: `${data.vendor} - ${data.line_items.map(item => item.description).join(', ')}`,
        category: data.expense_category,
        transaction_date: data.date,
        is_recurring: false
      });

      logger.info(`[ReceiptProcessor] Created transaction for document: ${documentId}`);
    } catch (error: any) {
      logger.error(`[ReceiptProcessor] Failed to create transaction:`, error.message);
    }
  }

  /**
   * Analyze spending patterns across multiple processed documents
   */
  async analyzeFinancialPatterns(
    userId: string,
    documentIds: string[],
    dateRange?: { start: string; end: string }
  ): Promise<FinancialPatternAnalysis> {
    const logPrefix = '[ReceiptProcessor:PatternAnalysis]';
    
    try {
      logger.info(`${logPrefix} Analyzing patterns for ${documentIds.length} documents`);

      // Get transactions for analysis
      const transactions = await this.insightsService.getUserTransactions({
        user_id: userId,
        date_from: dateRange?.start,
        date_to: dateRange?.end,
        limit: 1000
      });

      // Analyze vendor patterns
      const vendorMap = new Map<string, any>();
      const categoryMap = new Map<string, any>();
      
      let totalAmount = 0;
      
      transactions.forEach(transaction => {
        totalAmount += transaction.amount;
        
        // Vendor analysis
        const vendor = transaction.description.split(' - ')[0] || 'Unknown';
        if (!vendorMap.has(vendor)) {
          vendorMap.set(vendor, {
            vendor,
            frequency: 0,
            total_spent: 0,
            amounts: [],
            categories: new Set(),
            dates: []
          });
        }
        
        const vendorData = vendorMap.get(vendor);
        vendorData.frequency++;
        vendorData.total_spent += transaction.amount;
        vendorData.amounts.push(transaction.amount);
        vendorData.categories.add(transaction.category || 'general');
        vendorData.dates.push(transaction.transaction_date);
        
        // Category analysis
        const category = transaction.category || 'general';
        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            category,
            total_amount: 0,
            transaction_count: 0,
            amounts: []
          });
        }
        
        const categoryData = categoryMap.get(category);
        categoryData.total_amount += transaction.amount;
        categoryData.transaction_count++;
        categoryData.amounts.push(transaction.amount);
      });

      // Process vendor patterns
      const vendor_patterns = Array.from(vendorMap.values()).map(vendor => ({
        vendor: vendor.vendor,
        frequency: vendor.frequency,
        total_spent: vendor.total_spent,
        average_amount: vendor.total_spent / vendor.frequency,
        categories: Array.from(vendor.categories),
        trend: this.calculateTrend(vendor.dates, vendor.amounts)
      })).sort((a, b) => b.total_spent - a.total_spent);

      // Process spending patterns
      const spending_patterns = Array.from(categoryMap.values()).map(category => ({
        category: category.category,
        total_amount: category.total_amount,
        transaction_count: category.transaction_count,
        average_amount: category.total_amount / category.transaction_count,
        percentage_of_total: (category.total_amount / totalAmount) * 100
      })).sort((a, b) => b.total_amount - a.total_amount);

      // Generate insights
      const insights = this.generateFinancialInsights(vendor_patterns, spending_patterns, totalAmount);
      
      // Detect anomalies
      const anomalies = this.detectAnomalies(transactions);

      return {
        vendor_patterns: vendor_patterns.slice(0, 10), // Top 10
        spending_patterns,
        temporal_patterns: [], // TODO: Implement temporal analysis
        insights,
        anomalies
      };

    } catch (error: any) {
      logger.error(`${logPrefix} Error:`, error.message);
      return {
        vendor_patterns: [],
        spending_patterns: [],
        temporal_patterns: [],
        insights: ['Failed to analyze financial patterns'],
        anomalies: []
      };
    }
  }

  /**
   * Helper functions
   */
  private normalizeDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }

  private calculateTrend(dates: string[], amounts: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (amounts.length < 3) return 'stable';
    
    const recentAvg = amounts.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const earlierAvg = amounts.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    
    const change = (recentAvg - earlierAvg) / earlierAvg;
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private generateFinancialInsights(
    vendors: any[],
    categories: any[],
    total: number
  ): string[] {
    const insights = [];
    
    if (vendors.length > 0) {
      const topVendor = vendors[0];
      insights.push(`Your largest expense is with ${topVendor.vendor} (${((topVendor.total_spent / total) * 100).toFixed(1)}% of total spending)`);
    }
    
    if (categories.length > 0) {
      const topCategory = categories[0];
      insights.push(`${topCategory.category} represents your highest expense category with ${topCategory.transaction_count} transactions`);
    }
    
    const averageTransaction = total / vendors.reduce((sum, v) => sum + v.frequency, 0);
    insights.push(`Your average transaction amount is $${averageTransaction.toFixed(2)}`);
    
    return insights;
  }

  private detectAnomalies(transactions: any[]): Array<{type: string; description: string; amount: number; date: string}> {
    const amounts = transactions.map(t => t.amount);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / amounts.length);
    
    const anomalies = [];
    const threshold = mean + (2 * stdDev); // 2 standard deviations
    
    transactions.forEach(transaction => {
      if (transaction.amount > threshold) {
        anomalies.push({
          type: 'high_amount',
          description: `Unusually high transaction: $${transaction.amount}`,
          amount: transaction.amount,
          date: transaction.transaction_date
        });
      }
    });
    
    return anomalies.slice(0, 5); // Top 5 anomalies
  }
}

// Singleton instance
let processorInstance: ReceiptInvoiceProcessor | null = null;

export function getReceiptProcessor(): ReceiptInvoiceProcessor {
  if (!processorInstance) {
    processorInstance = new ReceiptInvoiceProcessor();
  }
  return processorInstance;
} 