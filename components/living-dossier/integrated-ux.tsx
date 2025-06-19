import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Import all our UX components
import { dossierColors, spacing, typography, borderRadius } from './design-system';
import { FadeTransition, SlideTransition, StaggeredAnimation, SuccessAnimation } from './animations';
import { EmptyStateIllustration, ErrorState, LoadingState, NoResultsState } from './empty-states';
import { SwipeableCard, TouchFriendlyButton, PullToRefresh, BottomSheet } from './mobile-interactions';
import { ProgressBar, CircularProgress, StepProgress } from './progress-indicators';
import { DataChart, InteractiveTimeline, MetricsCard, ComparisonChart } from './visualizations';
import { 
  ErrorFallback, 
  OfflineIndicator, 
  RetryMechanism, 
  DataSyncStatus, 
  AutosaveIndicator,
  ConnectionQualityIndicator,
  useOfflineData
} from './robustness';
import { 
  LazyLoadImage, 
  VirtualizedList, 
  MemoizedComponent, 
  DynamicImport, 
  DebounceInput,
  ResourcePreloader,
  useThrottledCallback,
  usePerformanceMonitor,
  ProgressiveDataLoader,
  PerformanceOptimizationStyles
} from './performance';
import {
  Toast,
  ToastContainer,
  RatingStars,
  FeedbackForm,
  FeedbackButton,
  SurveyForm,
  useInteractionTracking,
  FeatureAnnouncement
} from './feedback';

// Create a design system object for easier reference
const designSystem = {
  colors: {
    ...dossierColors,
    primary: dossierColors.primary,
    secondary: dossierColors.secondary,
    background: dossierColors.background,
    surface: dossierColors.surfaceLight,
    textDark: 'hsl(220, 20%, 20%)',
    textLight: 'hsl(220, 15%, 40%)',
  },
  spacing,
  typography: {
    ...typography,
    sizes: typography.fontSize
  },
  borderRadius
};

/**
 * LivingDossierUX - Main component that integrates all UX improvements
 */
export const LivingDossierUX = ({ 
  children,
  showFeedbackButton = true,
  enableOfflineSupport = true,
  preloadResources = []
}: {
  children: React.ReactNode;
  showFeedbackButton?: boolean;
  enableOfflineSupport?: boolean;
  preloadResources?: string[];
}) => {
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const { trackEvent } = useInteractionTracking('living-dossier-main');
  
  // Track component mount
  useEffect(() => {
    trackEvent('component_mounted');
    
    // Check if we should show the feature announcement
    const hasSeenAnnouncement = localStorage.getItem('seen_dossier_announcement');
    if (!hasSeenAnnouncement) {
      setShowAnnouncement(true);
    }
    
    return () => {
      trackEvent('component_unmounted');
    };
  }, [trackEvent]);
  
  // Handle feedback submission
  const handleFeedbackSubmit = useCallback(async (feedback) => {
    trackEvent('feedback_submitted', { rating: feedback.rating });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Show success toast
    // @ts-ignore
    window.showToast?.('Thank you for your feedback!', 'success');
    
    return true;
  }, [trackEvent]);
  
  // Handle announcement dismiss
  const handleAnnouncementDismiss = useCallback(() => {
    setShowAnnouncement(false);
    localStorage.setItem('seen_dossier_announcement', 'true');
    trackEvent('announcement_dismissed');
  }, [trackEvent]);
  
  // Handle learn more click
  const handleLearnMore = useCallback(() => {
    setShowAnnouncement(false);
    localStorage.setItem('seen_dossier_announcement', 'true');
    trackEvent('announcement_learn_more_clicked');
    
    // Simulate opening documentation
    // @ts-ignore
    window.showToast?.('Opening documentation...', 'info');
  }, [trackEvent]);
  
  return (
    <>
      {/* Global performance optimizations */}
      <PerformanceOptimizationStyles />
      
      {/* Preload resources */}
      {preloadResources.length > 0 && (
        <ResourcePreloader resources={preloadResources} />
      )}
      
      {/* Toast notifications container */}
      <ToastContainer />
      
      {/* Offline indicator */}
      {enableOfflineSupport && <OfflineIndicator />}
      
      {/* Main content */}
      <div 
        style={{ 
          position: 'relative',
          minHeight: '100%',
        }}
      >
        {/* Feature announcement */}
        <AnimatePresence>
          {showAnnouncement && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: designSystem.spacing.md,
                zIndex: 1000,
              }}
            >
              <FeatureAnnouncement
                title="Welcome to Living Dossier"
                description="We've completely redesigned the dossier experience with improved visuals, mobile optimization, and offline support. Explore the new features and let us know what you think!"
                imageUrl="/images/living-dossier-preview.jpg"
                onDismiss={handleAnnouncementDismiss}
                onLearnMore={handleLearnMore}
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Actual content */}
        {children}
        
        {/* Feedback button */}
        {showFeedbackButton && (
          <FeedbackButton onSubmit={handleFeedbackSubmit} />
        )}
      </div>
    </>
  );
};

/**
 * DossierCard - A card component for displaying dossier items with all UX improvements
 */
export const DossierCard = ({ 
  title, 
  description, 
  imageUrl, 
  tags = [],
  lastUpdated,
  progress = 0,
  onClick,
  isLoading = false,
  hasError = false,
  retryFn
}: {
  title: string;
  description: string;
  imageUrl?: string;
  tags?: string[];
  lastUpdated?: string;
  progress?: number;
  onClick?: () => void;
  isLoading?: boolean;
  hasError?: boolean;
  retryFn?: () => Promise<void>;
}) => {
  const { trackEvent } = useInteractionTracking('dossier-card');
  
  const handleClick = useCallback(() => {
    trackEvent('card_clicked', { title });
    if (onClick) onClick();
  }, [onClick, title, trackEvent]);
  
  if (isLoading) {
    return (
      <div 
        style={{ 
          borderRadius: designSystem.borderRadius.lg,
          backgroundColor: designSystem.colors.surface,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          height: '300px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LoadingState message="Loading dossier..." />
      </div>
    );
  }
  
  if (hasError) {
    return (
      <div 
        style={{ 
          borderRadius: designSystem.borderRadius.lg,
          backgroundColor: designSystem.colors.surface,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          padding: designSystem.spacing.lg,
        }}
      >
        <ErrorState 
          message="Failed to load dossier"
          retryFn={retryFn}
        />
      </div>
    );
  }
  
  return (
    <SwipeableCard
      onSwipeLeft={() => trackEvent('card_swiped_left', { title })}
      onSwipeRight={() => trackEvent('card_swiped_right', { title })}
    >
      <motion.div
        whileHover={{ y: -4, boxShadow: '0 10px 20px rgba(0, 0, 0, 0.1)' }}
        transition={{ duration: 0.2 }}
        onClick={handleClick}
        style={{ 
          borderRadius: designSystem.borderRadius.lg,
          backgroundColor: designSystem.colors.surface,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          cursor: onClick ? 'pointer' : 'default',
        }}
      >
        {imageUrl && (
          <div style={{ height: '160px', overflow: 'hidden' }}>
            <LazyLoadImage
              src={imageUrl}
              alt={title}
              height="160px"
            />
          </div>
        )}
        
        <div style={{ padding: designSystem.spacing.lg }}>
          <h3 style={{ 
            margin: 0, 
            marginBottom: designSystem.spacing.xs,
            color: designSystem.colors.textDark,
            fontSize: designSystem.typography.sizes.xl,
          }}>
            {title}
          </h3>
          
          {progress > 0 && (
            <div style={{ marginBottom: designSystem.spacing.sm }}>
              <ProgressBar 
                progress={progress} 
                height={4} 
                color={designSystem.colors.primary} 
              />
            </div>
          )}
          
          <p style={{ 
            margin: 0,
            marginBottom: designSystem.spacing.md,
            color: designSystem.colors.textLight,
            fontSize: designSystem.typography.sizes.base,
            lineHeight: 1.5,
          }}>
            {description}
          </p>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap',
              gap: designSystem.spacing.xs,
            }}>
              {tags.map((tag, index) => (
                <span
                  key={index}
                  style={{
                    backgroundColor: `${designSystem.colors.primary}20`,
                    color: designSystem.colors.primary,
                    padding: `2px ${designSystem.spacing.xs}`,
                    borderRadius: designSystem.borderRadius.sm,
                    fontSize: designSystem.typography.sizes.sm,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
            
            {lastUpdated && (
              <span style={{ 
                fontSize: designSystem.typography.sizes.xs,
                color: designSystem.colors.textLight,
              }}>
                Updated {new Date(lastUpdated).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </SwipeableCard>
  );
};

/**
 * DossierList - A virtualized list of dossier items with all UX improvements
 */
export const DossierList = ({ 
  items = [],
  isLoading = false,
  hasError = false,
  retryFn,
  onItemClick,
  emptyMessage = "No dossiers found"
}: {
  items: Array<{
    id: string;
    title: string;
    description: string;
    imageUrl?: string;
    tags?: string[];
    lastUpdated?: string;
    progress?: number;
  }>;
  isLoading?: boolean;
  hasError?: boolean;
  retryFn?: () => Promise<void>;
  onItemClick?: (id: string) => void;
  emptyMessage?: string;
}) => {
  const { trackEvent } = useInteractionTracking('dossier-list');
  
  useEffect(() => {
    trackEvent('list_viewed', { itemCount: items.length });
  }, [items.length, trackEvent]);
  
  if (isLoading) {
    return (
      <div style={{ padding: designSystem.spacing.xl }}>
        <LoadingState message="Loading dossiers..." />
      </div>
    );
  }
  
  if (hasError) {
    return (
      <div style={{ padding: designSystem.spacing.xl }}>
        <ErrorState 
          message="Failed to load dossiers"
          retryFn={retryFn}
        />
      </div>
    );
  }
  
  if (items.length === 0) {
    return (
      <div style={{ padding: designSystem.spacing.xl }}>
        <NoResultsState message={emptyMessage} />
      </div>
    );
  }
  
  return (
    <PullToRefresh onRefresh={retryFn}>
      <ProgressiveDataLoader
        data={items}
        batchSize={10}
        renderItem={(item, index) => (
          <StaggeredAnimation
            index={index}
            transition={{ delay: index * 0.05 }}
          >
            <div style={{ marginBottom: designSystem.spacing.lg }}>
              <DossierCard
                title={item.title}
                description={item.description}
                imageUrl={item.imageUrl}
                tags={item.tags}
                lastUpdated={item.lastUpdated}
                progress={item.progress}
                onClick={() => {
                  trackEvent('item_clicked', { id: item.id });
                  if (onItemClick) onItemClick(item.id);
                }}
              />
            </div>
          </StaggeredAnimation>
        )}
      />
    </PullToRefresh>
  );
};

/**
 * DossierSearch - A search component with debounce and loading states
 */
export const DossierSearch = ({ 
  onSearch,
  placeholder = "Search dossiers...",
  initialValue = ""
}: {
  onSearch: (query: string) => void;
  placeholder?: string;
  initialValue?: string;
}) => {
  const [isSearching, setIsSearching] = useState(false);
  const { trackEvent } = useInteractionTracking('dossier-search');
  
  const handleSearch = useCallback(async (value: string) => {
    trackEvent('search_performed', { query: value });
    setIsSearching(true);
    
    try {
      await onSearch(value);
    } finally {
      setIsSearching(false);
    }
  }, [onSearch, trackEvent]);
  
  return (
    <div style={{ 
      position: 'relative',
      marginBottom: designSystem.spacing.lg,
    }}>
      <DebounceInput
        value={initialValue}
        onChange={handleSearch}
        delay={300}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: `${designSystem.spacing.sm} ${designSystem.spacing.lg}`,
          paddingRight: isSearching ? '40px' : designSystem.spacing.lg,
          borderRadius: designSystem.borderRadius.md,
          border: `1px solid ${designSystem.colors.borderLight}`,
          fontSize: designSystem.typography.sizes.base,
          boxSizing: 'border-box',
        }}
      />
      
      {isSearching && (
        <div style={{ 
          position: 'absolute',
          right: designSystem.spacing.md,
          top: '50%',
          transform: 'translateY(-50%)',
        }}>
          <CircularProgress size={20} color={designSystem.colors.primary} />
        </div>
      )}
    </div>
  );
};

/**
 * DossierMetrics - A dashboard component showing key metrics with visualizations
 */
export const DossierMetrics = ({ 
  metrics = {
    totalDossiers: 0,
    activeDossiers: 0,
    completionRate: 0,
    averageProgress: 0,
  },
  timelineData = [],
  comparisonData = [],
  isLoading = false,
  hasError = false,
  retryFn
}: {
  metrics?: {
    totalDossiers: number;
    activeDossiers: number;
    completionRate: number;
    averageProgress: number;
  };
  timelineData?: Array<{ date: string; count: number }>;
  comparisonData?: Array<{ category: string; current: number; previous: number }>;
  isLoading?: boolean;
  hasError?: boolean;
  retryFn?: () => Promise<void>;
}) => {
  const { trackEvent } = useInteractionTracking('dossier-metrics');
  
  useEffect(() => {
    trackEvent('metrics_viewed');
  }, [trackEvent]);
  
  if (isLoading) {
    return (
      <div style={{ padding: designSystem.spacing.xl }}>
        <LoadingState message="Loading metrics..." />
      </div>
    );
  }
  
  if (hasError) {
    return (
      <div style={{ padding: designSystem.spacing.xl }}>
        <ErrorState 
          message="Failed to load metrics"
          retryFn={retryFn}
        />
      </div>
    );
  }
  
  return (
    <div>
      <h2 style={{ 
        marginTop: 0,
        marginBottom: designSystem.spacing.xl,
        color: designSystem.colors.textDark,
      }}>
        Dossier Metrics
      </h2>
      
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: designSystem.spacing.lg,
        marginBottom: designSystem.spacing.xl,
      }}>
        <MetricsCard
          title="Total Dossiers"
          value={metrics.totalDossiers}
          icon="📁"
          color={designSystem.colors.primary}
        />
        <MetricsCard
          title="Active Dossiers"
          value={metrics.activeDossiers}
          icon="🔍"
          color={designSystem.colors.secondary}
        />
        <MetricsCard
          title="Completion Rate"
          value={`${metrics.completionRate}%`}
          icon="✓"
          color={designSystem.colors.success}
        />
        <MetricsCard
          title="Average Progress"
          value={`${metrics.averageProgress}%`}
          icon="📊"
          color={designSystem.colors.info}
        />
      </div>
      
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: designSystem.spacing.xl,
        marginBottom: designSystem.spacing.xl,
      }}>
        <div style={{ 
          backgroundColor: designSystem.colors.surface,
          borderRadius: designSystem.borderRadius.lg,
          padding: designSystem.spacing.lg,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}>
          <h3 style={{ 
            marginTop: 0,
            marginBottom: designSystem.spacing.md,
            color: designSystem.colors.textDark,
          }}>
            Dossier Activity Timeline
          </h3>
          <InteractiveTimeline data={timelineData} />
        </div>
        
        <div style={{ 
          backgroundColor: designSystem.colors.surface,
          borderRadius: designSystem.borderRadius.lg,
          padding: designSystem.spacing.lg,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}>
          <h3 style={{ 
            marginTop: 0,
            marginBottom: designSystem.spacing.md,
            color: designSystem.colors.textDark,
          }}>
            Performance Comparison
          </h3>
          <ComparisonChart data={comparisonData} />
        </div>
      </div>
    </div>
  );
};
