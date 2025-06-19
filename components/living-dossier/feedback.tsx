import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { dossierColors as colors, spacing, typography, borderRadius } from './design-system';

// Design system object for easier reference
const designSystem = {
  colors: {
    ...colors,
    primary: colors.primary,
    secondary: colors.secondary,
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
    info: colors.info,
    background: colors.background,
    surface: colors.surfaceLight,
    textDark: 'hsl(220, 20%, 20%)',
    textLight: 'hsl(220, 15%, 40%)',
    borderLight: 'hsl(220, 15%, 90%)'
  },
  spacing,
  typography: {
    ...typography,
    sizes: typography.fontSize
  },
  borderRadius
};

/**
 * Toast notification component
 */
export const Toast = ({ 
  message, 
  type = 'info', 
  duration = 4000, 
  onClose 
}: {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: () => void;
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onClose]);
  
  const getColor = () => {
    switch (type) {
      case 'success': return designSystem.colors.success;
      case 'error': return designSystem.colors.error;
      case 'warning': return designSystem.colors.warning;
      default: return designSystem.colors.info;
    }
  };
  
  const getIcon = () => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      default: return 'ℹ';
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: designSystem.spacing.md,
        borderRadius: designSystem.borderRadius.md,
        backgroundColor: 'white',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        borderLeft: `4px solid ${getColor()}`,
        marginBottom: designSystem.spacing.md,
      }}
    >
      <div 
        style={{ 
          width: 24, 
          height: 24, 
          borderRadius: '50%', 
          backgroundColor: getColor(),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: designSystem.spacing.md,
          color: 'white',
          fontWeight: 'bold',
        }}
      >
        {getIcon()}
      </div>
      <div style={{ flex: 1 }}>
        {message}
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: designSystem.typography.sizes.lg,
          color: designSystem.colors.textLight,
          marginLeft: designSystem.spacing.md,
        }}
      >
        &times;
      </button>
    </motion.div>
  );
};

/**
 * Toast container to manage multiple toasts
 */
export const ToastContainer = () => {
  const [toasts, setToasts] = useState<Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>>([]);
  
  // Global function to add toasts
  useEffect(() => {
    // @ts-ignore
    window.showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts(prev => [...prev, { id, message, type }]);
      return id;
    };
    
    return () => {
      // @ts-ignore
      delete window.showToast;
    };
  }, []);
  
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };
  
  return (
    <div 
      style={{
        position: 'fixed',
        top: designSystem.spacing.lg,
        right: designSystem.spacing.lg,
        zIndex: 1000,
        maxWidth: '400px',
      }}
    >
      <AnimatePresence>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

/**
 * Rating component
 */
export const RatingStars = ({ 
  value = 0, 
  onChange, 
  size = 24,
  readOnly = false
}: {
  value?: number;
  onChange?: (rating: number) => void;
  size?: number;
  readOnly?: boolean;
}) => {
  const [rating, setRating] = useState(value);
  const [hover, setHover] = useState(0);
  
  useEffect(() => {
    setRating(value);
  }, [value]);
  
  const handleClick = (newRating: number) => {
    if (readOnly) return;
    
    setRating(newRating);
    if (onChange) {
      onChange(newRating);
    }
  };
  
  return (
    <div style={{ display: 'inline-flex' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <div
          key={star}
          onClick={() => handleClick(star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(0)}
          style={{
            cursor: readOnly ? 'default' : 'pointer',
            fontSize: size,
            color: (hover || rating) >= star 
              ? designSystem.colors.warning 
              : designSystem.colors.borderLight,
            transition: 'color 0.2s ease',
            marginRight: '2px',
          }}
        >
          ★
        </div>
      ))}
    </div>
  );
};

/**
 * Feedback form component
 */
export const FeedbackForm = ({ 
  onSubmit,
  initialRating = 0,
  placeholder = 'Tell us what you think...'
}: {
  onSubmit: (feedback: { rating: number; comment: string }) => void;
  initialRating?: number;
  placeholder?: string;
}) => {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      // @ts-ignore
      window.showToast?.('Please provide a rating', 'warning');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onSubmit({ rating, comment });
      setComment('');
      // @ts-ignore
      window.showToast?.('Thank you for your feedback!', 'success');
    } catch (error) {
      // @ts-ignore
      window.showToast?.('Failed to submit feedback. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      <div style={{ marginBottom: designSystem.spacing.md }}>
        <label 
          style={{ 
            display: 'block', 
            marginBottom: designSystem.spacing.xs,
            fontWeight: 500,
            color: designSystem.colors.textDark,
          }}
        >
          How would you rate your experience?
        </label>
        <RatingStars value={rating} onChange={setRating} />
      </div>
      
      <div style={{ marginBottom: designSystem.spacing.md }}>
        <label 
          style={{ 
            display: 'block', 
            marginBottom: designSystem.spacing.xs,
            fontWeight: 500,
            color: designSystem.colors.textDark,
          }}
        >
          Comments (optional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: designSystem.spacing.sm,
            borderRadius: designSystem.borderRadius.md,
            border: `1px solid ${designSystem.colors.borderLight}`,
            minHeight: '100px',
            fontFamily: 'inherit',
            fontSize: designSystem.typography.sizes.base,
          }}
        />
      </div>
      
      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          backgroundColor: designSystem.colors.primary,
          color: 'white',
          border: 'none',
          borderRadius: designSystem.borderRadius.md,
          padding: `${designSystem.spacing.sm} ${designSystem.spacing.lg}`,
          fontSize: designSystem.typography.sizes.base,
          fontWeight: 500,
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          opacity: isSubmitting ? 0.7 : 1,
          transition: 'background-color 0.2s ease',
        }}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </form>
  );
};

/**
 * Feedback button that opens a modal
 */
export const FeedbackButton = ({ 
  onSubmit 
}: {
  onSubmit: (feedback: { rating: number; comment: string }) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: designSystem.spacing.xl,
          right: designSystem.spacing.xl,
          backgroundColor: designSystem.colors.primary,
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '56px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
          cursor: 'pointer',
          zIndex: 100,
        }}
      >
        <span style={{ fontSize: '24px' }}>?</span>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <>
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
                zIndex: 1000,
              }}
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'white',
                borderRadius: designSystem.borderRadius.lg,
                padding: designSystem.spacing.xl,
                width: '90%',
                maxWidth: '500px',
                zIndex: 1001,
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: designSystem.spacing.lg,
              }}>
                <h2 style={{ 
                  margin: 0, 
                  color: designSystem.colors.textDark,
                  fontSize: designSystem.typography.sizes['2xl'],
                }}>
                  We Value Your Feedback
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: designSystem.colors.textLight,
                  }}
                >
                  &times;
                </button>
              </div>
              
              <FeedbackForm 
                onSubmit={(data) => {
                  onSubmit(data);
                  setIsOpen(false);
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

/**
 * Survey component with multiple questions
 */
export const SurveyForm = ({ 
  questions, 
  onSubmit 
}: {
  questions: Array<{
    id: string;
    question: string;
    type: 'rating' | 'text' | 'choice';
    choices?: string[];
  }>;
  onSubmit: (answers: Record<string, any>) => void;
}) => {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };
  
  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };
  
  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      await onSubmit(answers);
      // @ts-ignore
      window.showToast?.('Thank you for completing the survey!', 'success');
    } catch (error) {
      // @ts-ignore
      window.showToast?.('Failed to submit survey. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const renderQuestionInput = (question: typeof questions[0]) => {
    const value = answers[question.id];
    
    switch (question.type) {
      case 'rating':
        return (
          <RatingStars 
            value={value || 0} 
            onChange={(rating) => handleAnswer(question.id, rating)} 
          />
        );
      case 'text':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => handleAnswer(question.id, e.target.value)}
            style={{
              width: '100%',
              padding: designSystem.spacing.sm,
              borderRadius: designSystem.borderRadius.md,
              border: `1px solid ${designSystem.colors.borderLight}`,
              minHeight: '100px',
              fontFamily: 'inherit',
              fontSize: designSystem.typography.sizes.base,
            }}
          />
        );
      case 'choice':
        return (
          <div>
            {question.choices?.map((choice, index) => (
              <div 
                key={index} 
                style={{ 
                  marginBottom: designSystem.spacing.sm,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <input
                  type="radio"
                  id={`${question.id}-${index}`}
                  name={question.id}
                  value={choice}
                  checked={value === choice}
                  onChange={() => handleAnswer(question.id, choice)}
                  style={{ marginRight: designSystem.spacing.sm }}
                />
                <label htmlFor={`${question.id}-${index}`}>{choice}</label>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };
  
  const currentQ = questions[currentQuestion];
  
  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: designSystem.spacing.lg }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginBottom: designSystem.spacing.sm,
        }}>
          <span style={{ fontWeight: 500 }}>
            Question {currentQuestion + 1} of {questions.length}
          </span>
          <span>
            {Math.round((currentQuestion + 1) / questions.length * 100)}% complete
          </span>
        </div>
        <div style={{ 
          height: '6px', 
          backgroundColor: designSystem.colors.borderLight,
          borderRadius: '3px',
          overflow: 'hidden',
        }}>
          <div style={{ 
            height: '100%', 
            width: `${(currentQuestion + 1) / questions.length * 100}%`,
            backgroundColor: designSystem.colors.primary,
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>
      
      <div style={{ marginBottom: designSystem.spacing.xl }}>
        <h3 style={{ 
          marginTop: 0, 
          marginBottom: designSystem.spacing.md,
          color: designSystem.colors.textDark,
        }}>
          {currentQ.question}
        </h3>
        {renderQuestionInput(currentQ)}
      </div>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
      }}>
        <button
          onClick={handlePrevious}
          disabled={currentQuestion === 0}
          style={{
            backgroundColor: 'transparent',
            color: designSystem.colors.primary,
            border: `1px solid ${designSystem.colors.primary}`,
            borderRadius: designSystem.borderRadius.md,
            padding: `${designSystem.spacing.sm} ${designSystem.spacing.lg}`,
            fontSize: designSystem.typography.sizes.base,
            cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer',
            opacity: currentQuestion === 0 ? 0.5 : 1,
          }}
        >
          Previous
        </button>
        
        <button
          onClick={handleNext}
          disabled={isSubmitting}
          style={{
            backgroundColor: designSystem.colors.primary,
            color: 'white',
            border: 'none',
            borderRadius: designSystem.borderRadius.md,
            padding: `${designSystem.spacing.sm} ${designSystem.spacing.lg}`,
            fontSize: designSystem.typography.sizes.base,
            fontWeight: 500,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {currentQuestion < questions.length - 1 ? 'Next' : (isSubmitting ? 'Submitting...' : 'Submit')}
        </button>
      </div>
    </div>
  );
};

/**
 * Hook for tracking user interactions
 */
export const useInteractionTracking = (componentId: string) => {
  const trackEvent = (eventType: string, details: Record<string, any> = {}) => {
    // In a real app, this would send data to an analytics service
    console.log(`[Tracking] ${componentId} - ${eventType}`, details);
    
    // Example implementation
    const event = {
      componentId,
      eventType,
      details,
      timestamp: new Date().toISOString(),
      sessionId: localStorage.getItem('sessionId') || 'unknown',
      userId: localStorage.getItem('userId') || 'anonymous',
    };
    
    // Mock sending to analytics
    setTimeout(() => {
      const events = JSON.parse(localStorage.getItem('interaction_events') || '[]');
      events.push(event);
      localStorage.setItem('interaction_events', JSON.stringify(events));
    }, 0);
  };
  
  return { trackEvent };
};

/**
 * Feature announcement component
 */
export const FeatureAnnouncement = ({ 
  title, 
  description, 
  imageUrl,
  onDismiss,
  onLearnMore
}: {
  title: string;
  description: string;
  imageUrl?: string;
  onDismiss: () => void;
  onLearnMore: () => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={{
        backgroundColor: 'white',
        borderRadius: designSystem.borderRadius.lg,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        maxWidth: '500px',
        width: '100%',
      }}
    >
      {imageUrl && (
        <div style={{ 
          height: '200px', 
          overflow: 'hidden',
          backgroundColor: designSystem.colors.borderLight,
        }}>
          <img 
            src={imageUrl} 
            alt={title} 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover' 
            }} 
          />
        </div>
      )}
      
      <div style={{ padding: designSystem.spacing.xl }}>
        <h2 style={{ 
          margin: 0, 
          marginBottom: designSystem.spacing.sm,
          color: designSystem.colors.textDark,
        }}>
          {title}
        </h2>
        
        <p style={{ 
          margin: 0, 
          marginBottom: designSystem.spacing.lg,
          color: designSystem.colors.textLight,
          lineHeight: 1.5,
        }}>
          {description}
        </p>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
        }}>
          <button
            onClick={onDismiss}
            style={{
              backgroundColor: 'transparent',
              color: designSystem.colors.textLight,
              border: 'none',
              padding: designSystem.spacing.sm,
              fontSize: designSystem.typography.sizes.base,
              cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
          
          <button
            onClick={onLearnMore}
            style={{
              backgroundColor: designSystem.colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: designSystem.borderRadius.md,
              padding: `${designSystem.spacing.sm} ${designSystem.spacing.lg}`,
              fontSize: designSystem.typography.sizes.base,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Learn More
          </button>
        </div>
      </div>
    </motion.div>
  );
};
