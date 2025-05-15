//components/chat/structured-data-renderer.tsx

"use client";
import { motion } from "framer-motion";
import {
  Cloud,
  CloudRain,
  Sun,
  Calendar,
  Mail,
  Newspaper,
  CheckSquare,
  Info,
} from "lucide-react";

interface StructuredDataRendererProps {
  data: string;
}

export function StructuredDataRenderer({ data }: StructuredDataRendererProps) {
  // Parse the data string to get the structured data
  let parsedData: any;
  try {
    parsedData = JSON.parse(data);
  } catch (error) {
    return (
      <div className="text-sm text-muted-foreground">
        Invalid structured data format
      </div>
    );
  }

  // Render different card types based on the data type
  switch (parsedData.type) {
    case "weather":
      return <WeatherCard data={parsedData} />;
    case "calendar":
      return <CalendarCard data={parsedData} />;
    case "email":
      return <EmailCard data={parsedData} />;
    case "news":
      return <NewsCard data={parsedData} />;
    case "task":
      return <TaskCard data={parsedData} />;
    default:
      return <GenericCard data={parsedData} />;
  }
}

function WeatherCard({ data }: { data: any }) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl overflow-hidden border border-border bg-card/50 backdrop-blur-sm"
    >
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-lg">{data.location}</h3>
            <p className="text-sm text-muted-foreground">Current Weather</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold">{data.current.temp}°F</div>
            <div className="text-sm text-muted-foreground">
              Feels like {data.current.temp - 3}°F
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center">
            <Sun className="h-8 w-8 text-yellow-500 mr-2" />
            <span>{data.current.condition}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CloudRain className="h-4 w-4" />
            <span>10% chance of rain</span>
          </div>
        </div>
      </div>

      <div className="border-t border-border p-4">
        <div className="grid grid-cols-4 gap-2 text-center">
          {data.forecast.map((day: any, i: number) => (
            <div key={day.day} className="flex flex-col items-center">
              <span className="text-xs text-muted-foreground">{day.day}</span>
              <div className="my-1">
                {day.condition === "Sunny" && (
                  <Sun className="h-5 w-5 text-yellow-500" />
                )}
                {day.condition === "Cloudy" && (
                  <Cloud className="h-5 w-5 text-blue-400" />
                )}
                {day.condition === "Rain" && (
                  <CloudRain className="h-5 w-5 text-blue-500" />
                )}
              </div>
              <span className="text-xs font-medium">{day.temp}°F</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function CalendarCard({ data }: { data: any }) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl overflow-hidden border border-border bg-card/50 backdrop-blur-sm"
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Upcoming Events</h3>
        </div>

        <div className="space-y-3">
          {data.events.map((event: any, index: number) => (
            <div
              key={index}
              className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-md bg-primary/10 flex flex-col items-center justify-center">
                <span className="text-xs font-medium">{event.month}</span>
                <span className="text-lg font-bold">{event.day}</span>
              </div>
              <div>
                <h4 className="font-medium">{event.title}</h4>
                <p className="text-sm text-muted-foreground">{event.time}</p>
                {event.location && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {event.location}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function EmailCard({ data }: { data: any }) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl overflow-hidden border border-border bg-card/50 backdrop-blur-sm"
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Mail className="h-5 w-5 text-primary" />
          <h3 className="font-medium">{data.subject}</h3>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-medium">{data.sender.initials}</span>
          </div>
          <div>
            <p className="text-sm font-medium">{data.sender.name}</p>
            <p className="text-xs text-muted-foreground">{data.sender.email}</p>
          </div>
        </div>

        <div className="mt-3 text-sm">
          <p>{data.preview}</p>
        </div>

        <div className="mt-3 text-xs text-muted-foreground">
          {data.time} • {data.date}
        </div>
      </div>
    </motion.div>
  );
}

function NewsCard({ data }: { data: any }) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl overflow-hidden border border-border bg-card/50 backdrop-blur-sm"
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Newspaper className="h-5 w-5 text-primary" />
          <h3 className="font-medium">News</h3>
        </div>

        {data.image && (
          <div className="mb-3 rounded-lg overflow-hidden">
            <img
              src={data.image || "/placeholder.svg"}
              alt={data.title}
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        <h4 className="font-medium text-lg">{data.title}</h4>
        <p className="text-sm text-muted-foreground mt-1">
          {data.source} • {data.time}
        </p>

        <p className="mt-2 text-sm">{data.summary}</p>
      </div>
    </motion.div>
  );
}

function TaskCard({ data }: { data: any }) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl overflow-hidden border border-border bg-card/50 backdrop-blur-sm"
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <CheckSquare className="h-5 w-5 text-primary" />
          <h3 className="font-medium">{data.title || "Tasks"}</h3>
        </div>

        <div className="space-y-2">
          {data.items.map((task: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className={`w-5 h-5 rounded-full border ${
                  task.completed
                    ? "bg-primary border-primary"
                    : "border-muted-foreground"
                } flex items-center justify-center`}
              >
                {task.completed && (
                  <CheckSquare className="h-3 w-3 text-primary-foreground" />
                )}
              </div>
              <span
                className={`text-sm ${
                  task.completed ? "line-through text-muted-foreground" : ""
                }`}
              >
                {task.text}
              </span>
            </div>
          ))}
        </div>

        {data.dueDate && (
          <div className="mt-3 text-xs text-muted-foreground">
            Due: {data.dueDate}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function GenericCard({ data }: { data: any }) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl overflow-hidden border border-border bg-card/50 backdrop-blur-sm"
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-5 w-5 text-primary" />
          <h3 className="font-medium">{data.title || "Information"}</h3>
        </div>

        <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-[300px]">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </motion.div>
  );
}
