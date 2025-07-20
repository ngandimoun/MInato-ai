# Stripe Payment Links Integration - Phase 6 Testing Strategy

This directory contains comprehensive test files for validating the Stripe payment links integration in the Minato AI codebase. The testing strategy follows the existing codebase patterns and ensures all components work correctly together.

## 📋 Test Suite Overview

### 1. Core Integration Tests (`stripe-payment-links.test.ts`)
- **StripePaymentLinkTool** conversational flow testing
- **StripeSellerOnboardingTool** functionality validation  
- API endpoint testing for all Stripe-related routes
- Database schema validation
- Environment configuration verification
- Security and error handling validation

### 2. Webhook Simulation Tests (`stripe-webhook-simulation.test.ts`)
- Mock Stripe webhook event generation
- Webhook endpoint accessibility testing
- Event processing validation
- Signature verification testing
- Idempotency handling verification
- All supported webhook event types

### 3. Master Test Runner (`run-all-stripe-tests.ts`)
- Orchestrates all test suites
- Pre-flight environment checks
- Comprehensive reporting
- Production readiness assessment
- Troubleshooting guidance

## 🚀 Quick Start

### Run All Tests
```bash
# Run the comprehensive test suite
npx ts-node tests/run-all-stripe-tests.ts
```

### Run Individual Test Suites
```bash
# Core integration tests only
npx ts-node tests/stripe-payment-links.test.ts

# Webhook simulation tests only  
npx ts-node tests/stripe-webhook-simulation.test.ts
```

## 🔧 Prerequisites

### Required Environment Variables
```env
# Essential (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key

# Stripe (Optional for testing, but recommended)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SIGNING_SECRET=whsec_your_webhook_secret

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database Setup
Ensure the following Supabase tables exist:
- `minato_products`
- `minato_payment_links` 
- `minato_sales`
- `minato_notifications`
- `processed_stripe_events`
- `user_profiles` (with Stripe fields)

### Development Server
```bash
# Make sure your Next.js dev server is running
npm run dev
```

## 📊 Test Categories Explained

### 🛠️ Tool Functionality Tests
- **Purpose**: Validate that Stripe tools work in conversational mode
- **What's Tested**: Parameter extraction, API calls, response formatting
- **Expected Results**: Tools should process user inputs and return structured data

### 🌐 API Endpoint Tests  
- **Purpose**: Verify all Stripe-related API routes function correctly
- **What's Tested**: Request/response handling, error cases, data validation
- **Expected Results**: Endpoints should handle requests and return appropriate responses

### 🔗 Webhook Event Tests
- **Purpose**: Ensure webhook endpoint can process Stripe events
- **What's Tested**: Event parsing, signature verification, idempotency
- **Expected Results**: Webhook should acknowledge events and process them correctly

### 🗄️ Database Integration Tests
- **Purpose**: Validate database operations for Stripe data
- **What's Tested**: Table existence, data insertion, relationship integrity
- **Expected Results**: Database operations should complete without errors

### 🔒 Security Tests
- **Purpose**: Verify security measures are properly implemented
- **What's Tested**: Signature verification, input validation, authentication
- **Expected Results**: Security checks should reject invalid requests

## 📈 Understanding Test Results

### ✅ Pass Scenarios
- **Green checkmarks**: All tests passed successfully
- **Status 200/201**: API endpoints responding correctly  
- **Status 400**: Expected rejection (e.g., missing signatures)
- **Tool execution**: Returns valid structured data

### ❌ Fail Scenarios  
- **Red X marks**: Tests failed due to errors
- **Status 500**: Server errors requiring investigation
- **Null responses**: Tools/APIs not returning expected data
- **Missing tables**: Database schema issues

### ⚠️ Warning Scenarios
- **Stripe not configured**: Expected in test environments
- **Mock signatures**: Webhook tests with simulated data
- **Missing optional configs**: Non-critical environment variables

## 🔍 Troubleshooting Guide

### Common Issues and Solutions

#### "Stripe API Key Missing"
```bash
# Solution: Add Stripe test keys to your .env file
STRIPE_SECRET_KEY=sk_test_your_key_here
```

#### "Database Tables Missing"  
```bash
# Solution: Run database migrations
# Check that Supabase tables were created correctly
```

#### "Webhook Endpoint Not Accessible"
```bash
# Solution: Ensure dev server is running
npm run dev

# Check that endpoint exists at /api/stripe-webhooks
```

#### "Tool Execution Failures"
```bash
# Solution: Check tool implementations
# Verify parameter names match interfaces
# Ensure proper error handling
```

#### "Environment Variable Errors"
```bash
# Solution: Copy and configure environment variables
cp .env.example .env
# Fill in your actual values
```

## 🏗️ Test Architecture

### Design Principles
- **Following Existing Patterns**: Tests mirror existing tool and API patterns
- **Non-Destructive**: Tests don't modify production data
- **Self-Contained**: Each test suite can run independently  
- **Comprehensive Reporting**: Detailed logs and results
- **Production-Ready**: Tests validate real-world scenarios

### File Structure
```
tests/
├── stripe-payment-links.test.ts      # Core integration tests
├── stripe-webhook-simulation.test.ts # Webhook event tests  
├── run-all-stripe-tests.ts          # Master test runner
└── README-STRIPE-TESTING.md         # This documentation
```

### Test Data Strategy
- **Mock Stripe Data**: Realistic but safe test data
- **Test User IDs**: Isolated test user contexts
- **Temporary Records**: Tests clean up after themselves
- **Edge Cases**: Testing various scenarios and error conditions

## 🚀 Production Deployment Checklist

After tests pass, follow these steps for production:

### 1. Environment Setup
- [ ] Production Stripe keys configured
- [ ] Webhook signing secrets set
- [ ] Database migrations applied
- [ ] SSL certificates installed

### 2. Stripe Configuration  
- [ ] Live mode API keys
- [ ] Production webhook endpoints
- [ ] Tax settings configured
- [ ] Connected accounts enabled

### 3. Testing in Production
- [ ] Run tests against production (test mode)
- [ ] Verify webhook delivery
- [ ] Test with real test payments
- [ ] Monitor error rates

### 4. Go Live
- [ ] Switch to live mode
- [ ] Monitor initial transactions
- [ ] Set up alerting
- [ ] Document any issues

## 📚 Additional Resources

### Stripe Documentation
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Connect](https://stripe.com/docs/connect)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Testing Stripe](https://stripe.com/docs/testing)

### Minato-Specific
- Check Phase 0-5 documentation for implementation details
- Review `lib/tools/StripePaymentLinkTool.ts` for tool interface
- See `app/api/stripe-webhooks/route.ts` for webhook handling
- Examine `app/dashboard/` for UI components

## 🤝 Contributing

When adding new Stripe functionality:

1. **Add corresponding tests** to the appropriate test file
2. **Follow naming conventions** used in existing tests  
3. **Update this README** if adding new test categories
4. **Ensure tests pass** before submitting changes
5. **Document any new environment variables** required

## 🐛 Reporting Issues

If tests fail or you encounter issues:

1. **Check the troubleshooting guide** above
2. **Review the detailed test logs** for specific errors
3. **Verify environment configuration** is correct
4. **Check database state** for any inconsistencies
5. **Run tests individually** to isolate problems

## 📄 License

These test files follow the same license as the main Minato AI codebase. 