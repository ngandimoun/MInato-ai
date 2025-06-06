// components/tool-cards/WebSearchCard.tsx
"use client";

import * as React from 'react';
import type { CachedProductList, CachedProduct, AnyToolStructuredData } from "../../lib/types";
import { StarIcon } from '@heroicons/react/20/solid';
import { HighQualityImage } from '../ui/high-quality-image';
import { ScrollArea } from '@/components/ui/scroll-area';

const formatCurrency = (priceString?: string | number | null, defaultCurrency = "USD"): string => {
  if (priceString === null || priceString === undefined) return "";

  let amount: number;
  let currencySymbol: string | undefined = undefined;

  if (typeof priceString === 'number') {
    amount = priceString;
  } else if (typeof priceString === 'string') {
    // Attempt to extract currency symbol and parse
    const match = priceString.match(/^([$€£¥]?)\s*([\d,.]+)\s*([A-Z]{3})?$/);
    if (match) {
      currencySymbol = match[1] || undefined;
      amount = parseFloat(match[2].replace(/,/g, ''));
    } else {
      amount = parseFloat(priceString.replace(/[^0-9.]/g, ''));
    }
  } else {
    return ""; // Handle any other type
  }
  
  if (isNaN(amount)) return typeof priceString === 'string' ? priceString : ""; // Return original string if parsing fails

  const detectedCurrency = currencySymbol === '$' ? 'USD' :
                           currencySymbol === '€' ? 'EUR' :
                           currencySymbol === '£' ? 'GBP' :
                           currencySymbol === '¥' ? 'JPY' :
                           defaultCurrency;

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: detectedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (e) {
    // Fallback if currency code is invalid for Intl
    return `${currencySymbol || detectedCurrency} ${amount.toFixed(2)}`;
  }
};

// Much simpler product card with larger images
const ProductCard: React.FC<{product: CachedProduct}> = ({ product }) => {
  if (!product) return null;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700">
      {/* Title at top */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <a 
          href={product.link || '#'} 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:underline"
        >
          <h3 className="font-medium text-sm line-clamp-2 text-gray-900 dark:text-gray-100">
            {product.title || 'Product'}
          </h3>
        </a>
      </div>
      
      {/* Large image container with improved quality */}
      <div className="h-60 flex items-center justify-center bg-white dark:bg-gray-900 p-2 relative overflow-hidden">
        {product.imageUrl ? (
          <a 
            href={product.link || '#'} 
            target="_blank" 
            rel="noopener noreferrer"
            className="h-full w-full flex items-center justify-center transform transition-transform duration-300 hover:scale-105"
          >
            <HighQualityImage
              src={product.imageUrl}
              alt={product.title || "Product image"}
              containerClassName="h-full w-full"
              objectFit="scale-down"
              loading="eager"
              className="max-w-full max-h-full"
            />
          </a>
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <span className="text-gray-400">No image available</span>
          </div>
        )}
      </div>
      
      {/* Price and rating */}
      <div className="p-3 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
          {formatCurrency(product.price, product.currency || undefined)}
        </div>
        
        {product.rating ? (
          <div className="flex items-center">
            <span className="text-sm text-gray-600 dark:text-gray-300 mr-1">
              {product.rating?.toString() || ''}
            </span>
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <StarIcon
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.round(product.rating || 0) 
                      ? "text-yellow-400 fill-yellow-400" 
                      : "text-gray-300 fill-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
      
      {/* Source/seller */}
      <div className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
        {product.source || 'Unknown seller'}
      </div>
    </div>
  );
};

interface WebSearchCardProps {
  data: AnyToolStructuredData;
}

export const WebSearchCard: React.FC<WebSearchCardProps> = ({ data }) => {
  if (data.result_type !== "product_list" || data.source_api !== "serper_shopping") {
    if (process.env.NODE_ENV === 'development') {
      console.warn("[WebSearchCard] Received non-product_list data or non-serper_shopping source:", data);
    }
    return null;
  }

  const productData = data as CachedProductList;

  if (productData.error) {
    return (
      <div className="p-3 border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30 rounded-lg text-sm text-red-700 dark:text-red-300">
        <p className="font-semibold">Error fetching products:</p>
        <p>{productData.error}</p>
      </div>
    );
  }

  if (!productData.products || productData.products.length === 0) {
    return (
      <div className="p-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 rounded-lg text-sm text-slate-600 dark:text-slate-300">
        No products found matching your query.
      </div>
    );
  }

  let displayQuery = "your search";
  if (productData.query && typeof productData.query.query === 'string' && productData.query.query.trim() !== "") {
    displayQuery = `"${productData.query.query}"`;
  }
  
  return (
    <div className="w-full">
      <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Products matching {displayQuery}:
      </h2>
      <ScrollArea className="max-h-[550px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pr-4 pb-2">
          {productData.products.map((product, index) => (
            <ProductCard 
              key={product.productId || product.link || index} 
              product={product} 
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default WebSearchCard;