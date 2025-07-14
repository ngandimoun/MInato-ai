# Gallery Video API Requests - GET /api/video/generate

## Overview
This document shows all the GET requests made to `/api/video/generate` when displaying gallery videos in the Creation Hub. The system uses polling to check video generation status and update the gallery in real-time.

## API Endpoint Details

### GET /api/video/generate
**Purpose**: Check video generation status and update gallery display
**Authentication**: Required (Supabase auth)
**Method**: GET
**Query Parameters**:
- `videoId`: UUID of the video record in database
- `taskId`: Runway API task ID for status checking

## Request Flow for Gallery Videos

### 1. Initial Video Generation Request
When a user generates a video in the Creation Hub:

```http
POST /api/video/generate
Content-Type: application/json

{
  "imageUrl": "https://example.com/image.jpg",
  "prompt": "animate",
  "duration": 5
}
```

**Response**:
```json
{
  "success": true,
  "videoId": "8b3c2f1f-00d2-46fb-bfa6-35112c6d7b12",
  "taskId": "31ff68a9-757e-4481-a858-eedec61598d8",
  "message": "Video generation started"
}
```

### 2. Status Polling Requests
The system automatically polls every 3 seconds to check status:

```http
GET /api/video/generate?videoId=8b3c2f1f-00d2-46fb-bfa6-35112c6d7b12&taskId=31ff68a9-757e-4481-a858-eedec61598d8
```

**Response Stages**:

#### Stage 1: Processing
```json
{
  "success": true,
  "status": "PROCESSING",
  "videoUrl": null,
  "progress": 25,
  "errorMessage": null
}
```

#### Stage 2: Still Processing
```json
{
  "success": true,
  "status": "PROCESSING", 
  "videoUrl": null,
  "progress": 50,
  "errorMessage": null
}
```

#### Stage 3: Completed
```json
{
  "success": true,
  "status": "SUCCEEDED",
  "videoUrl": "https://runway-generated-video.mp4",
  "progress": 100,
  "errorMessage": null
}
```

### 3. Gallery Display Requests
When users view the gallery, the system makes requests to check current status:

```http
GET /api/video/generate?videoId=8b3c2f1f-00d2-46fb-bfa6-35112c6d7b12&taskId=31ff68a9-757e-4481-a858-eedec61598d8
```

## Request Examples from Your Logs

Based on your provided logs, here are the actual requests being made:

### Request 1 (First Poll)
```
GET /api/video/generate?videoId=8b3c2f1f-00d2-46fb-bfa6-35112c6d7b12&taskId=31ff68a9-757e-4481-a858-eedec61598d8
Response: 200 in 2315ms
```

### Request 2 (Second Poll)
```
GET /api/video/generate?videoId=8b3c2f1f-00d2-46fb-bfa6-35112c6d7b12&taskId=31ff68a9-757e-4481-a858-eedec61598d8
Response: 200 in 2045ms
```

### Request 3 (Third Poll)
```
GET /api/video/generate?videoId=8b3c2f1f-00d2-46fb-bfa6-35112c6d7b12&taskId=31ff68a9-757e-4481-a858-eedec61598d8
Response: 200 in 2004ms
```

### Request 4 (Fourth Poll)
```
GET /api/video/generate?videoId=8b3c2f1f-00d2-46fb-bfa6-35112c6d7b12&taskId=31ff68a9-757e-4481-a858-eedec61598d8
Response: 200 in 3280ms
```

## Gallery Components Making These Requests

### 1. VideoGenerator Component
- **File**: `components/creation-hub/video-generator.tsx`
- **Hook**: `useVideoGeneration`
- **Polling Interval**: 3000ms (3 seconds)
- **Purpose**: Real-time status updates during generation

### 2. CreationHubPanel Component
- **File**: `components/creation-hub/creation-hub-panel.tsx`
- **Hook**: `useUserVideos`
- **Purpose**: Load and display video gallery
- **Queries**: Both `created_videos` and `generated_videos` tables

### 3. CreateVid Component
- **File**: `components/creation-hub/create-vid.tsx`
- **Purpose**: Text-to-video generation with gallery display
- **Gallery Integration**: Shows user's existing videos

## Database Integration

The GET requests interact with two database tables:

### generated_videos table
```sql
id: UUID
user_id: UUID
runway_task_id: TEXT
prompt: TEXT
status: TEXT ('generating', 'completed', 'failed')
video_url: TEXT
metadata: JSONB
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

### created_videos table
```sql
id: UUID
user_id: UUID
filename: TEXT
video_url: TEXT
original_text: TEXT
status: TEXT
duration_seconds: INTEGER
created_at: TIMESTAMP
```

## Request Frequency and Patterns

### Active Generation
- **Frequency**: Every 3 seconds
- **Duration**: Until completion or failure
- **Average Time**: 2-3 minutes for 5-second videos

### Gallery Refresh
- **Trigger**: User opens gallery tab
- **Frequency**: On-demand
- **Purpose**: Load latest video list

### Status Checking
- **Trigger**: Gallery display
- **Purpose**: Update video statuses
- **Batch**: Multiple videos checked simultaneously

## Error Handling

### Failed Requests
```json
{
  "success": false,
  "error": "Video record not found",
  "status": 404
}
```

### Authentication Errors
```json
{
  "success": false,
  "error": "Authentication required",
  "status": 401
}
```

### API Errors
```json
{
  "success": false,
  "error": "Failed to check video status",
  "status": 500
}
```

## Performance Considerations

- **Polling Optimization**: 3-second intervals balance responsiveness with server load
- **Request Batching**: Multiple videos can be checked in parallel
- **Caching**: Database records cache Runway API responses
- **Error Recovery**: Automatic retry on network failures

## Security Features

- **Authentication**: All requests require valid Supabase user session
- **User Isolation**: Videos filtered by user_id
- **Rate Limiting**: Polling intervals prevent API abuse
- **Input Validation**: videoId and taskId parameters validated

## Monitoring and Logging

The system logs all requests with:
- User ID
- Video ID
- Task ID
- Response time
- Status updates
- Error conditions

Example log entry:
```
[MINATO-INFO] [Video Status API] Runway API response {
  taskId: "31ff68a9-757e-4481-a858-eedec61598d8",
  status: "PROCESSING",
  progress: 50,
  hasOutput: false
}
``` 