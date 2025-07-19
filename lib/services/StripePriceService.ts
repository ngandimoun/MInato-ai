import Stripe from 'stripe';
import { STRIPE_CONFIG } from '@/lib/constants';
import { logger } from '@/memory-framework/config';

/**
 * Service pour gérer automatiquement les prix Stripe
 * basés sur la configuration dans lib/constants.ts
 */
export class StripePriceService {
  private stripe: Stripe;
  private priceCache: Map<string, string> = new Map(); // Cache des Price IDs

  constructor(stripe: Stripe) {
    this.stripe = stripe;
  }

  /**
   * Génère une clé unique pour le cache des prix
   */
  private getPriceCacheKey(billingCycle: 'monthly' | 'annual'): string {
    const basePrice = STRIPE_CONFIG.MINATO_PRO_PRICE_CENTS;
    const amount = billingCycle === 'annual' ? basePrice * 12 * 0.8 : basePrice;
    const unitAmount = billingCycle === 'annual' ? Math.round(amount / 12) : amount;
    
    return `minato_pro_${billingCycle}_${unitAmount}_${STRIPE_CONFIG.MINATO_PRO_PRICE_CURRENCY}`;
  }

  /**
   * Récupère ou crée le produit Minato Pro
   */
  private async getOrCreateProduct(): Promise<Stripe.Product> {
    try {
      // Essayer de trouver un produit existant
      const products = await this.stripe.products.list({
        limit: 100,
        active: true
      });

      const existingProduct = products.data.find(product => 
        product.metadata?.minato_product_type === 'pro_subscription'
      );

      if (existingProduct) {
        logger.info(`[StripePriceService] Found existing product: ${existingProduct.id}`);
        return existingProduct;
      }

      // Créer un nouveau produit
      const product = await this.stripe.products.create({
        name: 'Minato Pro',
        description: 'Unlock the full Minato experience with: Core Features - Unlimited AI Chat Conversations, Persistent Memory & Conversation History. Creation Hub - AI-Powered Lead Generation Tools, 30 AI-Generated Images per Month, 20 AI-Generated Videos per Month. Premium Features - Multiplayer Games & Social Features, 20 Recording Sessions, Priority Support & Faster Response Times',
        metadata: {
          minato_product_type: 'pro_subscription',
          created_from: 'lib/constants.ts',
          base_price_cents: STRIPE_CONFIG.MINATO_PRO_PRICE_CENTS.toString()
        }
      });

      logger.info(`[StripePriceService] Created new product: ${product.id}`);
      return product;
    } catch (error) {
      logger.error('[StripePriceService] Error getting/creating product:', error);
      throw error;
    }
  }

  /**
   * Récupère ou crée le prix pour un cycle de facturation
   */
  private async getOrCreatePrice(billingCycle: 'monthly' | 'annual'): Promise<Stripe.Price> {
    const cacheKey = this.getPriceCacheKey(billingCycle);
    
    // Vérifier le cache
    if (this.priceCache.has(cacheKey)) {
      const priceId = this.priceCache.get(cacheKey)!;
      try {
        const price = await this.stripe.prices.retrieve(priceId);
        logger.info(`[StripePriceService] Retrieved cached price: ${priceId}`);
        return price;
      } catch (error) {
        logger.warn(`[StripePriceService] Cached price ${priceId} not found, removing from cache`);
        this.priceCache.delete(cacheKey);
      }
    }

    try {
      // Calculer le montant basé sur lib/constants.ts
      const baseAmount = STRIPE_CONFIG.MINATO_PRO_PRICE_CENTS;
      const amount = billingCycle === 'annual' ? baseAmount * 12 * 0.8 : baseAmount;
      const unitAmount = billingCycle === 'annual' ? Math.round(amount / 12) : amount;

      // Récupérer ou créer le produit
      const product = await this.getOrCreateProduct();

      // Vérifier s'il existe déjà un prix avec ces paramètres
      const existingPrices = await this.stripe.prices.list({
        product: product.id,
        active: true,
        limit: 100
      });

      const existingPrice = existingPrices.data.find(price => 
        price.unit_amount === unitAmount &&
        price.currency === STRIPE_CONFIG.MINATO_PRO_PRICE_CURRENCY &&
        price.recurring?.interval === STRIPE_CONFIG.MINATO_PRO_PRICE_INTERVAL &&
        price.metadata?.billing_cycle === billingCycle
      );

      if (existingPrice) {
        logger.info(`[StripePriceService] Found existing price: ${existingPrice.id}`);
        this.priceCache.set(cacheKey, existingPrice.id);
        return existingPrice;
      }

      // Créer un nouveau prix
      const price = await this.stripe.prices.create({
        product: product.id,
        unit_amount: unitAmount,
        currency: STRIPE_CONFIG.MINATO_PRO_PRICE_CURRENCY,
        recurring: {
          interval: STRIPE_CONFIG.MINATO_PRO_PRICE_INTERVAL as 'month'
        },
        metadata: {
          minato_product_type: 'pro_subscription',
          billing_cycle: billingCycle,
          base_price_cents: STRIPE_CONFIG.MINATO_PRO_PRICE_CENTS.toString(),
          created_from: 'lib/constants.ts',
          discount_applied: billingCycle === 'annual' ? '20%' : 'none'
        }
      });

      logger.info(`[StripePriceService] Created new price: ${price.id} for ${billingCycle} billing`);
      this.priceCache.set(cacheKey, price.id);
      return price;
    } catch (error) {
      logger.error(`[StripePriceService] Error getting/creating price for ${billingCycle}:`, error);
      throw error;
    }
  }

  /**
   * Récupère le prix pour un cycle de facturation
   */
  async getPrice(billingCycle: 'monthly' | 'annual'): Promise<Stripe.Price> {
    return this.getOrCreatePrice(billingCycle);
  }

  /**
   * Calcule le montant total pour un cycle de facturation
   */
  calculateAmount(billingCycle: 'monthly' | 'annual'): number {
    const baseAmount = STRIPE_CONFIG.MINATO_PRO_PRICE_CENTS;
    return billingCycle === 'annual' ? baseAmount * 12 * 0.8 : baseAmount;
  }

  /**
   * Vide le cache des prix (utile pour forcer la recréation)
   */
  clearCache(): void {
    this.priceCache.clear();
    logger.info('[StripePriceService] Price cache cleared');
  }

  /**
   * Récupère les informations de prix actuelles depuis lib/constants.ts
   */
  getCurrentPricingInfo() {
    return {
      basePriceCents: STRIPE_CONFIG.MINATO_PRO_PRICE_CENTS,
      basePriceDisplay: STRIPE_CONFIG.MINATO_PRO_PRICE_DISPLAY,
      currency: STRIPE_CONFIG.MINATO_PRO_PRICE_CURRENCY,
      interval: STRIPE_CONFIG.MINATO_PRO_PRICE_INTERVAL,
      monthly: {
        amount: STRIPE_CONFIG.MINATO_PRO_PRICE_CENTS,
        display: STRIPE_CONFIG.MINATO_PRO_PRICE_DISPLAY
      },
      annual: {
        amount: Math.round(STRIPE_CONFIG.MINATO_PRO_PRICE_CENTS * 12 * 0.8),
        display: `$${(STRIPE_CONFIG.MINATO_PRO_PRICE_CENTS * 12 * 0.8 / 100).toFixed(2)}`,
        savings: Math.round(STRIPE_CONFIG.MINATO_PRO_PRICE_CENTS * 12 * 0.2)
      }
    };
  }
} 