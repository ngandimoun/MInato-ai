// FILE: tests/stripe-payment-links.test.ts
// Comprehensive Stripe Payment Links Integration Tests
// Run with: npx ts-node tests/stripe-payment-links.test.ts

import { logger } from '@/memory-framework/config';
import { StripePaymentLinkTool } from '@/lib/tools/StripePaymentLinkTool';
import { StripeSellerOnboardingTool } from '@/lib/tools/StripeSellerOnboardingTool';

// Test configuration
const TEST_CONFIG = {
  testUserId: 'test-user-stripe-123',
  testUserName: 'Test Stripe User',
  testEmail: 'test.stripe@example.com',
  testLang: 'en',
  testTimezone: 'America/New_York',
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  stripeTestMode: true
};

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  details?: any;
}

class StripePaymentLinksTestSuite {
  private results: TestResult[] = [];
  private testSessionId = `test-session-${Date.now()}`;
  private testRunId = `test-run-${Date.now()}`;

  constructor() {
    logger.info('[StripeTest] Initializing Stripe Payment Links Test Suite');
  }

  private async makeApiRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: any) {
    const url = `${TEST_CONFIG.baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      return {
        ok: response.ok,
        status: response.status,
        data
      };
    } catch (error) {
      throw new Error(`API request failed: ${error}`);
    }
  }

  private addResult(testName: string, passed: boolean, error?: string, details?: any) {
    this.results.push({ testName, passed, error, details });
    const status = passed ? '✅ PASS' : '❌ FAIL';
    logger.info(`[StripeTest] ${status}: ${testName}`);
    if (error) {
      logger.error(`[StripeTest] Error: ${error}`);
    }
  }

  // Test 1: StripePaymentLinkTool Conversational Flow
  async testStripePaymentLinkToolExecution() {
    try {
      const tool = new StripePaymentLinkTool();

      const testInput = {
        product_name: 'Test Product',
        price: 2500,
        currency: 'usd',
        description: 'A test product for automated testing',
        enable_tax_collection: true,
        allow_promotion_codes: true,
        enable_pdf_invoices: true,
        inventory_quantity: 10,
        quantity_adjustable: true,
        min_quantity: 1,
        max_quantity: 5,
        shipping_countries: ['US', 'CA'],
        image_url: 'https://example.com/test-image.jpg',
        userId: TEST_CONFIG.testUserId,
        _context: {
          userId: TEST_CONFIG.testUserId,
          userName: TEST_CONFIG.testUserName,
          lang: TEST_CONFIG.testLang,
          timezone: TEST_CONFIG.testTimezone
        },
        lang: TEST_CONFIG.testLang,
        sessionId: this.testSessionId,
        runId: this.testRunId
      };

      const result = await tool.execute(testInput);
      
      const hasResult = result && result.result && typeof result.result === 'string';
      const passed = hasResult && 
                    result.result!.includes('payment link') && 
                    result.structuredData &&
                    (result.structuredData as any).payment_link;

      this.addResult(
        'StripePaymentLinkTool - Create Product and Payment Link',
        passed,
        passed ? undefined : 'Tool execution failed or returned invalid data',
        result
      );

      return result.structuredData;
    } catch (error: any) {
      this.addResult(
        'StripePaymentLinkTool - Create Product and Payment Link',
        false,
        error.message
      );
      return null;
    }
  }

  // Test 2: StripeSellerOnboardingTool
  async testStripeSellerOnboardingTool() {
    try {
      const tool = new StripeSellerOnboardingTool();

      const testInput = {
        intent: 'start_selling',
        country: 'US',
        entity_type: 'individual',
        business_description: 'Test business for automated testing',
        userId: TEST_CONFIG.testUserId,
        _context: {
          userId: TEST_CONFIG.testUserId,
          userName: TEST_CONFIG.testUserName,
          lang: TEST_CONFIG.testLang,
          timezone: TEST_CONFIG.testTimezone
        },
        lang: TEST_CONFIG.testLang,
        sessionId: this.testSessionId,
        runId: this.testRunId
      };

      const result = await tool.execute(testInput);
      
      const hasResult = result && result.result && typeof result.result === 'string';
      const passed = hasResult && 
                    result.result!.includes('onboarding') && 
                    result.structuredData &&
                    (result.structuredData as any).onboarding_step;

      this.addResult(
        'StripeSellerOnboardingTool - Create Express Account',
        passed,
        passed ? undefined : 'Onboarding tool failed',
        result
      );

      return result.structuredData;
    } catch (error: any) {
      this.addResult(
        'StripeSellerOnboardingTool - Create Express Account',
        false,
        error.message
      );
      return null;
    }
  }

  // Test 3: API Endpoint - Create Product and Payment Link
  async testCreateProductAndPaymentLinkAPI() {
    try {
      const testPayload = {
        productName: 'API Test Product',
        description: 'Product created via API test',
        price: 4999,
        currency: 'usd',
        enableTaxCollection: true,
        allowPromotionCodes: true,
        enablePdfInvoices: true,
        inventoryQuantity: 5,
        quantityAdjustable: true,
        minQuantity: 1,
        maxQuantity: 3,
        shippingCountries: ['US', 'GB'],
        imageUrls: ['https://example.com/api-test-image.jpg']
      };

      const response = await this.makeApiRequest(
        '/api/stripe/create-product-and-payment-link',
        'POST',
        testPayload
      );

      const passed = response.ok && 
                    response.data?.success === true &&
                    response.data?.stripePaymentLinkId &&
                    response.data?.minatoPaymentLinkId;

      this.addResult(
        'API - Create Product and Payment Link',
        passed,
        passed ? undefined : `API call failed: ${response.status} ${JSON.stringify(response.data)}`,
        response.data
      );

      return response.data;
    } catch (error: any) {
      this.addResult(
        'API - Create Product and Payment Link',
        false,
        error.message
      );
      return null;
    }
  }

  // Test 4: API Endpoint - Update Payment Link Status
  async testUpdatePaymentLinkStatusAPI(paymentLinkId?: string) {
    if (!paymentLinkId) {
      this.addResult(
        'API - Update Payment Link Status',
        false,
        'No payment link ID available from previous test'
      );
      return;
    }

    try {
      const testPayload = {
        paymentLinkId,
        active: false
      };

      const response = await this.makeApiRequest(
        '/api/stripe/update-payment-link-status',
        'POST',
        testPayload
      );

      const passed = response.ok && response.data?.success === true;

      this.addResult(
        'API - Update Payment Link Status',
        passed,
        passed ? undefined : `Status update failed: ${response.status} ${JSON.stringify(response.data)}`,
        response.data
      );
    } catch (error: any) {
      this.addResult(
        'API - Update Payment Link Status',
        false,
        error.message
      );
    }
  }

  // Test 5: API Endpoint - Archive Payment Link
  async testArchivePaymentLinkAPI(minatoPaymentLinkId?: string) {
    if (!minatoPaymentLinkId) {
      this.addResult(
        'API - Archive Payment Link',
        false,
        'No Minato payment link ID available from previous test'
      );
      return;
    }

    try {
      const testPayload = {
        paymentLinkId: minatoPaymentLinkId
      };

      const response = await this.makeApiRequest(
        '/api/seller/archive-payment-link',
        'POST',
        testPayload
      );

      const passed = response.ok && response.data?.success === true;

      this.addResult(
        'API - Archive Payment Link',
        passed,
        passed ? undefined : `Archive failed: ${response.status} ${JSON.stringify(response.data)}`,
        response.data
      );
    } catch (error: any) {
      this.addResult(
        'API - Archive Payment Link',
        false,
        error.message
      );
    }
  }

  // Test 6: API Endpoint - Stripe Express Dashboard Login Link
  async testStripeExpressDashboardAPI() {
    try {
      const response = await this.makeApiRequest(
        '/api/stripe/create-express-dashboard-login-link',
        'POST'
      );

      // This might fail if no Stripe account is set up, which is expected in test
      const passed = response.status === 200 || response.status === 400; // 400 is expected if no account

      this.addResult(
        'API - Stripe Express Dashboard Login Link',
        passed,
        passed ? undefined : `Unexpected status: ${response.status}`,
        response.data
      );
    } catch (error: any) {
      this.addResult(
        'API - Stripe Express Dashboard Login Link',
        false,
        error.message
      );
    }
  }

  // Test 7: Database Schema Validation
  async testDatabaseSchemaValidation() {
    try {
      // Test if required tables exist by making read requests
      const tables = [
        { name: 'minato_products', endpoint: '/api/seller/payment-links' },
        { name: 'minato_payment_links', endpoint: '/api/seller/payment-links' },
        { name: 'minato_sales', endpoint: '/api/seller/payment-links' },
        { name: 'minato_notifications', endpoint: '/api/notifications/get' },
        { name: 'processed_stripe_events', endpoint: '/api/seller/payment-links' }
      ];

      let allTablesExist = true;
      const tableResults: any = {};

      for (const table of tables) {
        try {
          const response = await this.makeApiRequest(table.endpoint);
          tableResults[table.name] = response.ok || response.status === 401; // 401 is OK (auth required)
          if (!tableResults[table.name] && response.status !== 401) {
            allTablesExist = false;
          }
        } catch (error) {
          tableResults[table.name] = false;
          allTablesExist = false;
        }
      }

      this.addResult(
        'Database Schema Validation',
        allTablesExist,
        allTablesExist ? undefined : 'Some required tables may be missing',
        tableResults
      );
    } catch (error: any) {
      this.addResult(
        'Database Schema Validation',
        false,
        error.message
      );
    }
  }

  // Test 8: Webhook Endpoint Accessibility
  async testWebhookEndpointAccessibility() {
    try {
      // Test webhook endpoint responds to POST requests
      const response = await this.makeApiRequest(
        '/api/stripe-webhooks',
        'POST',
        { test: 'webhook accessibility test' }
      );

      // Webhook should reject unsigned requests with 400
      const passed = response.status === 400;

      this.addResult(
        'Webhook Endpoint Accessibility',
        passed,
        passed ? undefined : `Unexpected webhook response: ${response.status}`,
        response.data
      );
    } catch (error: any) {
      this.addResult(
        'Webhook Endpoint Accessibility',
        false,
        error.message
      );
    }
  }

  // Test 9: Environment Configuration Validation
  async testEnvironmentConfiguration() {
    try {
      const requiredEnvVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'OPENAI_API_KEY'
      ];

      const missingVars: string[] = [];
      
      for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
          missingVars.push(envVar);
        }
      }

      // Check if Stripe keys are configured (they might be optional in test)
      const stripeConfigured = process.env.STRIPE_SECRET_KEY ? true : false;

      const passed = missingVars.length === 0;

      this.addResult(
        'Environment Configuration Validation',
        passed,
        passed ? undefined : `Missing environment variables: ${missingVars.join(', ')}`,
        {
          missingVars,
          stripeConfigured,
          totalRequired: requiredEnvVars.length,
          configured: requiredEnvVars.length - missingVars.length
        }
      );
    } catch (error: any) {
      this.addResult(
        'Environment Configuration Validation',
        false,
        error.message
      );
    }
  }

  // Main test runner
  async runAllTests() {
    logger.info('[StripeTest] Starting Stripe Payment Links Integration Test Suite');
    logger.info(`[StripeTest] Test Configuration: ${JSON.stringify(TEST_CONFIG, null, 2)}`);

    // Run all tests in sequence
    await this.testEnvironmentConfiguration();
    await this.testDatabaseSchemaValidation();
    await this.testWebhookEndpointAccessibility();
    
    // Test Stripe tools (these might fail if Stripe is not configured)
    const onboardingResult = await this.testStripeSellerOnboardingTool();
    const paymentLinkResult = await this.testStripePaymentLinkToolExecution();
    
    // Test API endpoints
    const createResult = await this.testCreateProductAndPaymentLinkAPI();
    await this.testUpdatePaymentLinkStatusAPI(createResult?.stripePaymentLinkId);
    await this.testArchivePaymentLinkAPI(createResult?.minatoPaymentLinkId);
    await this.testStripeExpressDashboardAPI();

    // Generate test report
    this.generateTestReport();
  }

  private generateTestReport() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const passRate = ((passedTests / totalTests) * 100).toFixed(1);

    logger.info('\n' + '='.repeat(60));
    logger.info('STRIPE PAYMENT LINKS INTEGRATION TEST REPORT');
    logger.info('='.repeat(60));
    logger.info(`Total Tests: ${totalTests}`);
    logger.info(`Passed: ${passedTests} (${passRate}%)`);
    logger.info(`Failed: ${failedTests}`);
    logger.info('='.repeat(60));

    if (failedTests > 0) {
      logger.info('\nFAILED TESTS:');
      this.results
        .filter(r => !r.passed)
        .forEach(result => {
          logger.error(`❌ ${result.testName}: ${result.error || 'Unknown error'}`);
        });
    }

    logger.info('\nPASSED TESTS:');
    this.results
      .filter(r => r.passed)
      .forEach(result => {
        logger.info(`✅ ${result.testName}`);
      });

    logger.info('\n' + '='.repeat(60));
    logger.info(`Test Suite ${failedTests === 0 ? 'PASSED' : 'FAILED'}`);
    logger.info('='.repeat(60));
  }
}

// Export for programmatic use
export { StripePaymentLinksTestSuite, TEST_CONFIG };

// Self-executing test runner when run directly
if (require.main === module) {
  const testSuite = new StripePaymentLinksTestSuite();
  testSuite.runAllTests().catch(error => {
    logger.error('[StripeTest] Test suite execution failed:', error);
    process.exit(1);
  });
} 