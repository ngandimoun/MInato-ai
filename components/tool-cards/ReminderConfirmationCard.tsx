import React from 'react';
import { CheckCircle, Clock, Calendar, Tag, Flag, RefreshCw, Bell } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface ReminderConfirmationData {
  content: string;
  trigger_datetime_utc: string;
  recurrence_rule: string | null;
  category: string;
  priority: string;
  confirmation_message: string;
}

interface ReminderConfirmationCardProps {
  data: {
    result_type: string;
    source_api: string;
    content: string;
    trigger_datetime_utc: string;
    recurrence_rule: string | null;
    category: string;
    priority: string;
    confirmation_message: string;
  };
}

const ReminderConfirmationCard: React.FC<ReminderConfirmationCardProps> = ({ data }) => {
  const reminderDate = parseISO(data.trigger_datetime_utc);
  const formattedDate = format(reminderDate, 'MMMM d, yyyy');
  const formattedTime = format(reminderDate, 'h:mm a');
  const dayOfWeek = format(reminderDate, 'EEEE');

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'task':
        return <CheckCircle className="w-4 h-4" />;
      case 'habit':
        return <RefreshCw className="w-4 h-4" />;
      case 'medication':
        return <Bell className="w-4 h-4" />;
      case 'appointment':
        return <Calendar className="w-4 h-4" />;
      case 'goal':
        return <Flag className="w-4 h-4" />;
      default:
        return <Tag className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'task':
        return 'text-blue-600 bg-blue-50';
      case 'habit':
        return 'text-purple-600 bg-purple-50';
      case 'medication':
        return 'text-red-600 bg-red-50';
      case 'appointment':
        return 'text-green-600 bg-green-50';
      case 'goal':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-white to-purple-50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      {/* Success Animation Circle */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-400 rounded-full opacity-20 animate-pulse" />
      <div className="absolute -top-6 -right-6 w-24 h-24 bg-green-500 rounded-full opacity-20 animate-pulse animation-delay-200" />
      
      {/* Header with Success Icon */}
      <div className="relative p-6 pb-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-ping" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Reminder Set!</h3>
              <p className="text-sm text-gray-500">Successfully scheduled</p>
            </div>
          </div>
          
          {/* Priority Badge */}
          <div className={`px-2 py-1 rounded-full ${getPriorityColor(data.priority)} text-white text-xs font-medium uppercase tracking-wider`}>
            {data.priority}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 pt-4">
        {/* Reminder Content */}
        <div className="mb-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100">
          <p className="text-gray-800 font-medium text-lg leading-relaxed">
            "{data.content}"
          </p>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center space-x-2 p-3 bg-white/60 rounded-lg">
            <Calendar className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Date</p>
              <p className="text-sm font-semibold text-gray-800">{formattedDate}</p>
              <p className="text-xs text-gray-600">{dayOfWeek}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 p-3 bg-white/60 rounded-lg">
            <Clock className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-xs text-gray-500">Time</p>
              <p className="text-sm font-semibold text-gray-800">{formattedTime}</p>
            </div>
          </div>
        </div>

        {/* Category and Recurrence */}
        <div className="flex items-center justify-between">
          <div className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg ${getCategoryColor(data.category)}`}>
            {getCategoryIcon(data.category)}
            <span className="text-sm font-medium capitalize">{data.category}</span>
          </div>
          
          {data.recurrence_rule && (
            <div className="flex items-center space-x-1.5 text-gray-600">
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm font-medium capitalize">{data.recurrence_rule}</span>
            </div>
          )}
        </div>

        {/* Motivational Message */}
        {data.confirmation_message.includes('💫') || data.confirmation_message.includes('🌟') || 
         data.confirmation_message.includes('✨') || data.confirmation_message.includes('🚀') || 
         data.confirmation_message.includes('💯') ? (
          <div className="mt-4 p-3 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg">
            <p className="text-sm text-gray-700 font-medium text-center">
              {data.confirmation_message.split('\n\n')[1]}
            </p>
          </div>
        ) : null}
      </div>

      {/* Bottom Decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400" />
    </div>
  );
};

export default ReminderConfirmationCard; 