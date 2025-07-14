"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, 
  X, 
  Check, 
  AlertCircle, 
  Palette, 
  Tag, 
  Type, 
  Image as ImageIcon,
  ChevronDown,
  Plus,
  Minus,
  Eye,
  EyeOff,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { 
  CATEGORY_FORMS, 
  CATEGORY_INFO,
  SUPPORTED_LANGUAGES,
  validateCategoryForm,
  type ImageCategory, 
  type CategoryFormValues,
  type FormField 
} from './category-types';

interface CategoryFormProps {
  categoryId: ImageCategory;
  onSubmit: (values: CategoryFormValues, referenceImages?: File[]) => void;
  onBack: () => void;
  initialValues?: CategoryFormValues;
  isGenerating?: boolean;
  className?: string;
  translatedFields?: Record<string, {
    label?: string;
    description?: string;
    placeholder?: string;
  }>;
}

export function CategoryForm({ 
  categoryId, 
  onSubmit, 
  onBack, 
  initialValues = {},
  isGenerating = false,
  className,
  translatedFields = {}
}: CategoryFormProps) {
  const [values, setValues] = useState<CategoryFormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const categoryInfo = CATEGORY_INFO[categoryId];
  const form = CATEGORY_FORMS[categoryId];
  
  // Log the translated fields for debugging
  useEffect(() => {
    console.log("CategoryForm received translatedFields:", translatedFields);
  }, [translatedFields]);

  useEffect(() => {
    // Set default values
    const defaultValues: CategoryFormValues = {};
    form.fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        defaultValues[field.id] = field.defaultValue;
      }
    });
    setValues({ ...defaultValues, ...initialValues });
  }, [categoryId]);

  // Handle form value changes
  const handleValueChange = useCallback((fieldId: string, value: any) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
    
    // Clear error for this field
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  }, [errors]);

  // Handle file uploads
  const handleFileUpload = useCallback((fieldId: string, files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const field = form.fields.find(f => f.id === fieldId);
    
    if (field?.maxFiles && fileArray.length > field.maxFiles) {
      toast({
        title: "Too many files",
        description: `Maximum ${field.maxFiles} files allowed`,
        variant: "destructive"
      });
      return;
    }

    // Validate file types
    const validFiles = fileArray.filter(file => {
      if (field?.accept === 'image/*') {
        return file.type.startsWith('image/');
      }
      return true;
    });

    if (validFiles.length !== fileArray.length) {
      toast({
        title: "Invalid file type",
        description: "Please upload only image files",
        variant: "destructive"
      });
    }

    // Update reference images for image upload fields
    if (fieldId === 'referenceImages' || fieldId === 'photoUpload' || fieldId === 'designUpload' || fieldId === 'companyLogo') {
      setReferenceImages(validFiles);
      
      // Create preview URLs
      const urls = validFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(urls);
    }

    handleValueChange(fieldId, validFiles);
  }, [form.fields, handleValueChange]);

  // Validate form
  const validateForm = useCallback(() => {
    const validation = validateCategoryForm(categoryId, values);
    setErrors(validation.errors);
    return validation.isValid;
  }, [categoryId, values]);

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Form validation failed",
        description: "Please fix the errors and try again",
        variant: "destructive"
      });
      return;
    }

    onSubmit(values, referenceImages);
  }, [values, referenceImages, validateForm, onSubmit]);

  // Check if field should be shown based on conditional logic
  const shouldShowField = useCallback((field: FormField) => {
    if (!field.conditional) return true;
    
    const dependsOnValue = values[field.conditional.dependsOn];
    return Array.isArray(field.conditional.showWhen)
      ? field.conditional.showWhen.includes(dependsOnValue)
      : field.conditional.showWhen === dependsOnValue;
  }, [values]);

  // Render different field types
  const renderField = useCallback((field: FormField) => {
    if (!shouldShowField(field)) return null;

    const value = values[field.id];
    const error = errors[field.id];
    const hasError = !!error;
    
    // Get translated field content if available
    const translatedField = translatedFields[field.id] || {};
    const fieldLabel = translatedField.label || field.label;
    const fieldDescription = translatedField.description || field.description;
    const fieldPlaceholder = translatedField.placeholder || field.placeholder;

    const fieldProps = {
      id: field.id,
      required: field.required,
      disabled: isGenerating
    };

    let fieldComponent: React.ReactNode;

    switch (field.type) {
      case 'text':
        fieldComponent = (
          <Input
            {...fieldProps}
            type="text"
            placeholder={fieldPlaceholder}
            value={value || ''}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
            className={cn(hasError && "border-destructive focus:border-destructive")}
          />
        );
        break;

      case 'textarea':
        fieldComponent = (
          <Textarea
            {...fieldProps}
            placeholder={fieldPlaceholder}
            value={value || ''}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
            className={cn("min-h-[100px] resize-none", hasError && "border-destructive focus:border-destructive")}
          />
        );
        break;

      case 'select':
        fieldComponent = (
          <Select value={value || ''} onValueChange={(val) => handleValueChange(field.id, val)}>
            <SelectTrigger className={cn(hasError && "border-destructive")}>
              <SelectValue placeholder={`Select ${fieldLabel.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
        break;

      case 'visual-cards':
        fieldComponent = (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {field.options?.map((option, index) => (
              <motion.div
                key={option.value}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={cn(
                    "cursor-pointer transition-all duration-200 border-2 relative overflow-hidden",
                    "hover:shadow-lg active:scale-[0.98] touch-manipulation",
                    value === option.value 
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-lg shadow-purple-500/10" 
                      : "border-border hover:border-purple-300",
                    hasError && value !== option.value && "border-destructive/50"
                  )}
                  onClick={() => handleValueChange(field.id, option.value)}
                >
                  {/* Selection indicator */}
                  {value === option.value && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-3 right-3 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center z-10"
                    >
                      <Check className="w-3 h-3 text-white" />
                    </motion.div>
                  )}
                  
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm leading-tight">{option.label}</h4>
                        {option.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{option.description}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        );
        break;

      case 'tags':
        const selectedTags = Array.isArray(value) ? value : [];
        fieldComponent = (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {field.options?.map((option, index) => {
                const isSelected = selectedTags.includes(option.value);
                return (
                  <motion.div
                    key={option.value}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Badge
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer transition-all duration-200 px-3 py-1.5 touch-manipulation",
                        "active:scale-[0.95] hover:shadow-sm",
                        isSelected 
                          ? "bg-purple-500 hover:bg-purple-600 shadow-lg shadow-purple-500/20" 
                          : "hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-900/20"
                      )}
                      onClick={() => {
                        const newTags = isSelected
                          ? selectedTags.filter(tag => tag !== option.value)
                          : [...selectedTags, option.value];
                        
                        if (field.validation?.max && newTags.length > field.validation.max) {
                          toast({
                            title: "Maximum selections reached",
                            description: field.validation.message || `Maximum ${field.validation.max} selections allowed`,
                            variant: "destructive"
                          });
                          return;
                        }
                        
                        handleValueChange(field.id, newTags);
                      }}
                    >
                      {option.label}
                    </Badge>
                  </motion.div>
                );
              })}
            </div>
            {selectedTags.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-muted-foreground flex items-center gap-2"
              >
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <span>Selected: {selectedTags.length} {field.validation?.max && `/ ${field.validation.max}`}</span>
              </motion.div>
            )}
          </div>
        );
        break;

      case 'radio':
        fieldComponent = (
          <RadioGroup value={value || ''} onValueChange={(val) => handleValueChange(field.id, val)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {field.options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`${field.id}-${option.value}`} />
                  <Label htmlFor={`${field.id}-${option.value}`} className="text-sm font-normal cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        );
        break;

      case 'checkbox':
        const selectedOptions = Array.isArray(value) ? value : [];
        fieldComponent = (
          <div className="space-y-3">
            {field.options?.map((option) => {
              const isChecked = selectedOptions.includes(option.value);
              return (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${field.id}-${option.value}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      const newOptions = checked
                        ? [...selectedOptions, option.value]
                        : selectedOptions.filter(opt => opt !== option.value);
                      handleValueChange(field.id, newOptions);
                    }}
                  />
                  <Label htmlFor={`${field.id}-${option.value}`} className="text-sm font-normal cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              );
            })}
          </div>
        );
        break;

      case 'upload':
        fieldComponent = (
          <div className="space-y-4">
            <div className={cn(
              "border-2 border-dashed rounded-lg p-4 sm:p-6 text-center transition-all duration-200",
              "hover:bg-muted/20 active:scale-[0.98] touch-manipulation",
              hasError ? "border-destructive" : "border-border hover:border-purple-300"
            )}>
              <input
                type="file"
                id={field.id}
                accept={field.accept}
                multiple={field.multiple}
                onChange={(e) => handleFileUpload(field.id, e.target.files)}
                className="hidden"
                disabled={isGenerating}
              />
              <Label htmlFor={field.id} className="cursor-pointer block">
                <Upload className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">Tap to upload</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {field.maxFiles && field.maxFiles > 1 
                    ? `Up to ${field.maxFiles} files` 
                    : '1 file'
                  } • {field.accept === 'image/*' ? 'Images only' : 'Any file type'}
                </p>
              </Label>
            </div>
            
            {/* File previews */}
            {previewUrls.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3"
              >
                {previewUrls.map((url, index) => (
                  <motion.div 
                    key={index} 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative group"
                  >
                    <img 
                      src={url} 
                      alt={`Preview ${index + 1}`}
                      className="w-full h-20 sm:h-24 object-cover rounded-lg border transition-all duration-200 group-hover:shadow-md"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full shadow-lg opacity-80 hover:opacity-100 transition-opacity touch-manipulation"
                      onClick={() => {
                        const newUrls = previewUrls.filter((_, i) => i !== index);
                        const newFiles = referenceImages.filter((_, i) => i !== index);
                        setPreviewUrls(newUrls);
                        setReferenceImages(newFiles);
                        handleValueChange(field.id, newFiles);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        );
        break;

      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : [];
        const remainingOptions = field.options?.filter(option => !selectedValues.includes(option.value)) || [];
        
        fieldComponent = (
          <div className="space-y-3">
            {/* Selected values display */}
            {selectedValues.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedValues.map(val => {
                  const option = field.options?.find(opt => opt.value === val);
                  return (
                    <Badge key={val} variant="secondary" className="flex items-center gap-1">
                      {option?.label || val}
                      <X 
                        className="w-3 h-3 cursor-pointer hover:text-destructive" 
                        onClick={() => {
                          const newValues = selectedValues.filter(v => v !== val);
                          handleValueChange(field.id, newValues);
                        }}
                      />
                    </Badge>
                  );
                })}
              </div>
            )}
            
            {/* Add more dropdown */}
            {remainingOptions.length > 0 && (
              <Select 
                value="" 
                onValueChange={(val) => {
                  if (!selectedValues.includes(val)) {
                    const newValues = [...selectedValues, val];
                    if (field.validation?.max && newValues.length > field.validation.max) {
                      toast({
                        title: "Maximum selections reached",
                        description: field.validation.message || `Maximum ${field.validation.max} selections allowed`,
                        variant: "destructive"
                      });
                      return;
                    }
                    handleValueChange(field.id, newValues);
                  }
                }}
              >
                <SelectTrigger className={cn(hasError && "border-destructive")}>
                  <SelectValue placeholder={selectedValues.length > 0 ? "Add another..." : `Select ${fieldLabel.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {remainingOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        {option.description && (
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {/* Selection count indicator */}
            {(selectedValues.length > 0 || field.validation?.max) && (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span>
                  Selected: {selectedValues.length}
                  {field.validation?.max && ` / ${field.validation.max}`}
                </span>
              </div>
            )}
          </div>
        )
        break;

      case 'language-select':
        fieldComponent = (
          <Select value={value || ''} onValueChange={(val) => handleValueChange(field.id, val)}>
            <SelectTrigger className={cn(hasError && "border-destructive")}>
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((lang: any) => (
                <SelectItem key={lang.code} value={lang.code}>
                  <div className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
        break;

      case 'toggle':
        fieldComponent = (
          <div className="flex items-center gap-3">
            <Checkbox
              id={field.id}
              checked={value === true || value === 'true'}
              onCheckedChange={(checked) => handleValueChange(field.id, checked)}
              disabled={isGenerating}
            />
            <Label htmlFor={field.id} className="text-sm font-normal cursor-pointer">
              {fieldLabel.replace(' *', '')}
            </Label>
            {/* Help button with image tooltip for Include Human Model */}
            {field.id === 'includeHuman' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-purple-100 dark:hover:bg-purple-900/20"
                  >
                    <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-purple-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs p-0 bg-white border shadow-lg">
                  <div className="p-3">
                    <p className="text-sm font-medium mb-2">Human Model Example</p>
                    <div className="relative">
                      <img
                        src="https://auzkjkliwlycclkpjlbl.supabase.co/storage/v1/object/public/images2//Image.jpeg"
                        alt="Example of product with human model"
                        className="w-48 h-32 object-cover rounded-md"
                        loading="lazy"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Example: Product shown with a person naturally using it
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        );
        break;

      case 'slider':
        const sliderValue = Array.isArray(value) ? value : [value || field.validation?.min || 0];
        fieldComponent = (
          <div className="space-y-3">
            <Slider
              value={sliderValue}
              onValueChange={(vals) => handleValueChange(field.id, field.multiple ? vals : vals[0])}
              max={field.validation?.max || 100}
              min={field.validation?.min || 0}
              step={1}
              disabled={isGenerating}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{field.validation?.min || 0}</span>
              <span className="font-medium">{field.multiple ? sliderValue.join(' - ') : sliderValue[0]}</span>
              <span>{field.validation?.max || 100}</span>
            </div>
          </div>
        );
        break;

      case 'color':
        fieldComponent = (
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={value || '#000000'}
              onChange={(e) => handleValueChange(field.id, e.target.value)}
              className="w-12 h-10 border border-border rounded-lg cursor-pointer"
              disabled={isGenerating}
            />
            <Input
              type="text"
              placeholder="#000000"
              value={value || ''}
              onChange={(e) => handleValueChange(field.id, e.target.value)}
              className="flex-1"
              disabled={isGenerating}
            />
          </div>
        );
        break;

      default:
        fieldComponent = (
          <div className="text-sm text-muted-foreground">
            Unsupported field type: {field.type}
          </div>
        );
    }

    return (
      <motion.div
        key={field.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
        className="space-y-2"
      >
        <div className="flex items-center justify-between">
          <Label htmlFor={field.id} className={cn("text-sm font-medium", hasError && "text-destructive")}>
            {fieldLabel}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          
          {fieldDescription && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">{fieldDescription}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        {fieldComponent}
        
        {hasError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 text-destructive text-xs"
          >
            <AlertCircle className="w-3 h-3" />
            <span>{error}</span>
          </motion.div>
        )}
      </motion.div>
    );
  }, [values, errors, referenceImages, previewUrls, isGenerating, shouldShowField, handleValueChange, handleFileUpload, translatedFields]);

  return (
    <TooltipProvider>
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        onSubmit={handleSubmit}
        className={cn("space-y-6", className)}
      >
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4 pb-4 border-b border-border">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
          <Type className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg sm:text-xl font-bold truncate">{categoryInfo.name}</h3>
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{categoryInfo.description}</p>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4 sm:space-y-6">
        <AnimatePresence mode="wait">
          {form.fields.map(field => (
            <div key={field.id}>
              {renderField(field)}
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 sm:pt-6 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isGenerating}
          className="order-2 sm:order-1 h-11 sm:h-10 transition-all hover:bg-muted/50"
        >
          Back to Categories
        </Button>
        
        <Button
          type="submit"
          disabled={isGenerating}
          className={cn(
            "order-1 sm:order-2 flex-1 h-11 sm:h-10",
            "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700",
            "shadow-lg hover:shadow-xl transition-all duration-200",
            "active:scale-[0.98] touch-manipulation",
            isGenerating && "cursor-not-allowed opacity-80"
          )}
        >
          {isGenerating ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
              />
              Generating...
            </>
          ) : (
            <>
              <Palette className="w-4 h-4 mr-2" />
              Generate Image
            </>
          )}
        </Button>
      </div>
    </motion.form>
    </TooltipProvider>
  );
} 