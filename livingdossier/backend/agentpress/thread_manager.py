# livingdossier/backend/agentpress/thread_manager.py

"""
Conversation thread management system for AgentPress.

This module provides comprehensive conversation management, including:
- Thread creation and persistence
- Message handling with support for text and images
- Tool registration and execution
- LLM interaction with streaming support
- Error handling and cleanup
- Context summarization to manage token limits
"""

import json
from typing import List, Dict, Any, Optional, Type, Union, AsyncGenerator, Literal, AsyncIterator, TypeVar
import datetime
from types import coroutine
import os
import sys

# Add parent directory to Python path to resolve relative imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

# Mock implementations for missing dependencies
class MockLogger:
    def debug(self, msg: str): print(f"DEBUG: {msg}")
    def info(self, msg: str): print(f"INFO: {msg}")
    def warning(self, msg: str): print(f"WARNING: {msg}")
    def error(self, msg: str, exc_info: bool = False): print(f"ERROR: {msg}")

class MockDBClient:
    async def table(self, _): return self
    async def select(self, _): return self
    async def eq(self, _, __): return self
    async def order(self, _): return self
    async def insert(self, *_args, **_kwargs): return self
    async def execute(self): return type('Response', (), {'data': []})()

    # Ensure these methods are async and return self for chaining
    async def __getattr__(self, name):
        return self

class MockDBConnection:
    def client(self) -> MockDBClient:
        return MockDBClient()

class MockLangfuse:
    def trace(self, name: str): return None

T = TypeVar('T')
class AsyncGenWrapper(AsyncIterator[T]):
    def __init__(self, gen: AsyncGenerator[T, None]):
        self.gen = gen

    def __aiter__(self):
        return self

    async def __anext__(self):
        try:
            return await self.gen.__anext__()
        except StopAsyncIteration:
            raise

    async def __await_impl(self):
        return self

    def __await__(self):
        return self.__await_impl().__await__()

# Try to import real implementations, fall back to mocks if not available
try:
    from services.llm import make_llm_api_call  # type: ignore
except ImportError:
    try:
        from livingdossier.services.llm import make_llm_api_call  # type: ignore
    except ImportError:
        async def make_llm_api_call(*args, **kwargs):
            raise NotImplementedError("LLM API call not implemented")

try:
    from services.supabase import DBConnection  # type: ignore
except ImportError:
    try:
        from livingdossier.services.supabase import DBConnection  # type: ignore
    except ImportError:
        DBConnection = MockDBConnection

try:
    from utils.logger import logger  # type: ignore
except ImportError:
    try:
        from livingdossier.utils.logger import logger  # type: ignore
    except ImportError:
        logger = MockLogger()

try:
    from langfuse.client import StatefulGenerationClient, StatefulTraceClient  # type: ignore
except ImportError:
    StatefulGenerationClient = Any  # type: ignore
    StatefulTraceClient = Any  # type: ignore

try:
    from services.langfuse import langfuse  # type: ignore
except ImportError:
    try:
        from livingdossier.services.langfuse import langfuse  # type: ignore
    except ImportError:
        langfuse = MockLangfuse()

try:
    from litellm import token_counter  # type: ignore
except ImportError:
    def token_counter(*args, **kwargs):
        return 0

from agentpress.tool import Tool
from agentpress.tool_registry import ToolRegistry
from agentpress.context_manager import ContextManager
from agentpress.response_processor import (
    ResponseProcessor,
    ProcessorConfig
)

# Type alias for tool choice
ToolChoice = Literal["auto", "required", "none"]

class ThreadManager:
    """Manages conversation threads with LLM models and tool execution.

    Provides comprehensive conversation management, handling message threading,
    tool registration, and LLM interactions with support for both standard and
    XML-based tool execution patterns.
    """

    def __init__(self, trace: Optional[Any] = None, is_agent_builder: bool = False, target_agent_id: Optional[str] = None):
        """Initialize ThreadManager.

        Args:
            trace: Optional trace client for logging
            is_agent_builder: Whether this is an agent builder session
            target_agent_id: ID of the agent being built (if in agent builder mode)
        """
        self.db = DBConnection()
        self.tool_registry = ToolRegistry()
        self.trace = trace
        self.is_agent_builder = is_agent_builder
        self.target_agent_id = target_agent_id
        if not self.trace:
            self.trace = langfuse.trace(name="anonymous:thread_manager")
        
        # Ensure type compatibility by using the same ToolRegistry instance
        tool_registry_instance = self.tool_registry
        self.response_processor = ResponseProcessor(
            tool_registry=tool_registry_instance,  # type: ignore
            add_message_callback=self.add_message,
            trace=self.trace,
            is_agent_builder=self.is_agent_builder,
            target_agent_id=self.target_agent_id
        )
        self.context_manager = ContextManager()

    def _is_tool_result_message(self, msg: Dict[str, Any]) -> bool:
        if not ("content" in msg and msg['content']):
            return False
        content = msg['content']
        if isinstance(content, str) and "ToolResult" in content: return True
        if isinstance(content, dict) and "tool_execution" in content: return True
        if isinstance(content, str):
            try:
                parsed_content = json.loads(content)
                if isinstance(parsed_content, dict) and "tool_execution" in parsed_content: return True
            except (json.JSONDecodeError, TypeError):
                pass
        return False
    
    def _compress_message(self, msg_content: Union[str, dict], message_id: Optional[str] = None, max_length: int = 3000) -> Union[str, dict]:
        """Compress the message content."""
        if isinstance(msg_content, str):
            if len(msg_content) > max_length:
                return msg_content[:max_length] + "... (truncated)" + f"\n\nmessage_id \"{message_id}\"\nUse expand-message tool to see contents"
            else:
                return msg_content
        elif isinstance(msg_content, dict):
            if len(json.dumps(msg_content)) > max_length:
                return json.dumps(msg_content)[:max_length] + "... (truncated)" + f"\n\nmessage_id \"{message_id}\"\nUse expand-message tool to see contents"
            else:
                return msg_content

    def _safe_truncate(self, msg_content: Union[str, dict], max_length: int = 300000) -> Union[str, dict]:
        """Truncate the message content safely."""
        if isinstance(msg_content, str):
            if len(msg_content) > max_length:
                return msg_content[:max_length] + f"\n\nThis message is too long, repeat relevant information in your response to remember it"
            else:
                return msg_content
        elif isinstance(msg_content, dict):
            if len(json.dumps(msg_content)) > max_length:
                return json.dumps(msg_content)[:max_length] + f"\n\nThis message is too long, repeat relevant information in your response to remember it"
            else:
                return msg_content
  
    def _compress_tool_result_messages(self, messages: List[Dict[str, Any]], llm_model: str, max_tokens: int, token_threshold: int) -> List[Dict[str, Any]]:
        """Compress the tool result messages except the most recent one."""
        uncompressed_total_token_count = token_counter(model=llm_model, messages=messages)

        if uncompressed_total_token_count > max_tokens:
            _i = 0 # Count the number of ToolResult messages
            for msg in reversed(messages): # Start from the end and work backwards
                if self._is_tool_result_message(msg): # Only compress ToolResult messages
                    _i += 1 # Count the number of ToolResult messages
                    msg_token_count = token_counter(messages=[msg]) # Count the number of tokens in the message
                    if msg_token_count > token_threshold: # If the message is too long
                        if _i > 1: # If this is not the most recent ToolResult message
                            message_id = msg.get('message_id') # Get the message_id
                            if message_id:
                                msg["content"] = self._compress_message(msg["content"], message_id, token_threshold * 3)
                            else:
                                logger.warning(f"UNEXPECTED: Message has no message_id {str(msg)[:100]}")
                        else:
                            msg["content"] = self._safe_truncate(msg["content"], max_tokens * 2)
        return messages

    def _compress_user_messages(self, messages: List[Dict[str, Any]], llm_model: str, max_tokens: int, token_threshold: int) -> List[Dict[str, Any]]:
        """Compress the user messages except the most recent one."""
        uncompressed_total_token_count = token_counter(model=llm_model, messages=messages)

        if uncompressed_total_token_count > max_tokens:
            _i = 0 # Count the number of User messages
            for msg in reversed(messages): # Start from the end and work backwards
                if msg.get('role') == 'user': # Only compress User messages
                    _i += 1 # Count the number of User messages
                    msg_token_count = token_counter(messages=[msg]) # Count the number of tokens in the message
                    if msg_token_count > token_threshold: # If the message is too long
                        if _i > 1: # If this is not the most recent User message
                            message_id = msg.get('message_id') # Get the message_id
                            if message_id:
                                msg["content"] = self._compress_message(msg["content"], message_id, token_threshold * 3)
                            else:
                                logger.warning(f"UNEXPECTED: Message has no message_id {str(msg)[:100]}")
                        else:
                            msg["content"] = self._safe_truncate(msg["content"], max_tokens * 2)
        return messages

    def _compress_assistant_messages(self, messages: List[Dict[str, Any]], llm_model: str, max_tokens: int, token_threshold: int) -> List[Dict[str, Any]]:
        """Compress the assistant messages except the most recent one."""
        uncompressed_total_token_count = token_counter(model=llm_model, messages=messages)
        if uncompressed_total_token_count > max_tokens:
            _i = 0 # Count the number of Assistant messages
            for msg in reversed(messages): # Start from the end and work backwards
                if msg.get('role') == 'assistant': # Only compress Assistant messages
                    _i += 1 # Count the number of Assistant messages
                    msg_token_count = token_counter(messages=[msg]) # Count the number of tokens in the message
                    if msg_token_count > token_threshold: # If the message is too long
                        if _i > 1: # If this is not the most recent Assistant message
                            message_id = msg.get('message_id') # Get the message_id
                            if message_id:
                                msg["content"] = self._compress_message(msg["content"], message_id, token_threshold * 3)
                            else:
                                logger.warning(f"UNEXPECTED: Message has no message_id {str(msg)[:100]}")
                        else:
                            msg["content"] = self._safe_truncate(msg["content"], max_tokens * 2)
                            
        return messages


    def _remove_meta_messages(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove meta messages from the messages."""
        result: List[Dict[str, Any]] = []
        for msg in messages:
            msg_content = msg.get('content')
            # Try to parse msg_content as JSON if it's a string
            if isinstance(msg_content, str):
                try: msg_content = json.loads(msg_content)
                except json.JSONDecodeError: pass
            if isinstance(msg_content, dict):
                # Create a copy to avoid modifying the original
                msg_content_copy = msg_content.copy()
                if "tool_execution" in msg_content_copy:
                    tool_execution = msg_content_copy["tool_execution"].copy()
                    if "arguments" in tool_execution:
                        del tool_execution["arguments"]
                    msg_content_copy["tool_execution"] = tool_execution
                # Create a new message dict with the modified content
                new_msg = msg.copy()
                new_msg["content"] = json.dumps(msg_content_copy)
                result.append(new_msg)
            else:
                result.append(msg)
        return result

    def _compress_messages(self, messages: List[Dict[str, Any]], llm_model: str, max_tokens: Optional[int] = None, token_threshold: Optional[int] = None, max_iterations: int = 5) -> List[Dict[str, Any]]:
        """Compress the messages.
            token_threshold: must be a power of 2
        """
        # Set default values for max_tokens if None
        if max_tokens is None:
            if 'sonnet' in llm_model.lower():
                max_tokens = 200 * 1000 - 64000 - 28000
            elif 'gpt' in llm_model.lower():
                max_tokens = 128 * 1000 - 28000
            elif 'gemini' in llm_model.lower():
                max_tokens = 1000 * 1000 - 300000
            elif 'deepseek' in llm_model.lower():
                max_tokens = 128 * 1000 - 28000
            else:
                max_tokens = 41 * 1000 - 10000

        # Set default value for token_threshold if None
        if token_threshold is None:
            token_threshold = 4096

        if max_iterations <= 0:
            logger.warning(f"_compress_messages: Max iterations reached, returning uncompressed messages")
            return messages

        result = messages
        result = self._remove_meta_messages(result)

        uncompressed_total_token_count = token_counter(model=llm_model, messages=result)

        result = self._compress_tool_result_messages(result, llm_model, max_tokens, token_threshold)
        result = self._compress_user_messages(result, llm_model, max_tokens, token_threshold)
        result = self._compress_assistant_messages(result, llm_model, max_tokens, token_threshold)

        compressed_token_count = token_counter(model=llm_model, messages=result)

        logger.info(f"_compress_messages: {uncompressed_total_token_count} -> {compressed_token_count}")

        if (compressed_token_count > max_tokens):
            logger.warning(f"Further token compression is needed: {compressed_token_count} > {max_tokens}")
            result = self._compress_messages(messages, llm_model, max_tokens, token_threshold // 2, max_iterations - 1)

        return result

    def add_tool(self, tool_class: Type[Tool], function_names: Optional[List[str]] = None, **kwargs):
        """Add a tool to the ThreadManager."""
        self.tool_registry.register_tool(tool_class, function_names, **kwargs)

    async def add_message(
        self,
        thread_id: str,
        type: str,
        content: Union[Dict[str, Any], List[Any], str],
        is_llm_message: bool = False,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Add a message to the thread in the database.

        Args:
            thread_id: The ID of the thread to add the message to.
            type: The type of the message (e.g., 'text', 'image_url', 'tool_call', 'tool', 'user', 'assistant').
            content: The content of the message. Can be a dictionary, list, or string.
                     It will be stored as JSONB in the database.
            is_llm_message: Flag indicating if the message originated from the LLM.
                            Defaults to False (user message).
            metadata: Optional dictionary for additional message metadata.
                      Defaults to None, stored as an empty JSONB object if None.
        """
        logger.debug(f"Adding message of type '{type}' to thread {thread_id}")
        client = self.db.client()

        # Prepare data for insertion
        data_to_insert = {
            'thread_id': thread_id,
            'type': type,
            'content': content,
            'is_llm_message': is_llm_message,
            'metadata': metadata or {},
        }

        try:
            # Add returning='representation' to get the inserted row data including the id
            result = await client.table('messages').insert(data_to_insert, returning='representation').execute()
            logger.info(f"Successfully added message to thread {thread_id}")

            if result.data and len(result.data) > 0 and isinstance(result.data[0], dict) and 'message_id' in result.data[0]:
                return result.data[0]
            else:
                logger.error(f"Insert operation failed or did not return expected data structure for thread {thread_id}. Result data: {result.data}")
                return None
        except Exception as e:
            logger.error(f"Failed to add message to thread {thread_id}: {str(e)}", exc_info=True)
            raise

    async def get_llm_messages(self, thread_id: str) -> List[Dict[str, Any]]:
        """Get all messages for a thread.

        This method uses the SQL function which handles context truncation
        by considering summary messages.

        Args:
            thread_id: The ID of the thread to get messages for.

        Returns:
            List of message objects.
        """
        logger.debug(f"Getting messages for thread {thread_id}")
        client = self.db.client()

        try:
            # result = await client.rpc('get_llm_formatted_messages', {'p_thread_id': thread_id}).execute()
            result = await client.table('messages').select('message_id, content').eq('thread_id', thread_id).eq('is_llm_message', True).order('created_at').execute()

            # Parse the returned data which might be stringified JSON
            if not result.data:
                return []

            # Return properly parsed JSON objects
            messages = []
            for item in result.data:
                if isinstance(item['content'], str):
                    try:
                        parsed_item = json.loads(item['content'])
                        parsed_item['message_id'] = item['message_id']
                        messages.append(parsed_item)
                    except json.JSONDecodeError:
                        logger.error(f"Failed to parse message: {item['content']}")
                else:
                    content = item['content']
                    content['message_id'] = item['message_id']
                    messages.append(content)

            return messages

        except Exception as e:
            logger.error(f"Failed to get messages for thread {thread_id}: {str(e)}", exc_info=True)
            return []

    async def _process_response_generator(self, response_gen: Union[Dict[str, Any], AsyncGenerator]) -> AsyncGenerator[Dict[str, Any], None]:
        """Process response generator or error dict."""
        if isinstance(response_gen, dict):
            # If it's an error dict, yield it and return
            yield response_gen
            return

        # Otherwise, it's an async generator
        async for chunk in response_gen:
            yield chunk

    async def run_thread(
        self,
        thread_id: str,
        system_prompt: Dict[str, Any],
        stream: bool = True,
        temporary_message: Optional[Dict[str, Any]] = None,
        llm_model: str = "gpt-4o",
        llm_temperature: float = 0,
        llm_max_tokens: Optional[int] = None,
        processor_config: Optional[ProcessorConfig] = None,
        tool_choice: ToolChoice = "auto",
        native_max_auto_continues: int = 25,
        max_xml_tool_calls: int = 0,
        include_xml_examples: bool = False,
        enable_thinking: Optional[bool] = False,
        reasoning_effort: Optional[str] = 'low',
        enable_context_manager: bool = True,
        generation: Optional[Any] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Run a conversation thread with LLM integration and tool execution."""
        
        # Initialize processor_config if None
        if processor_config is None:
            processor_config = ProcessorConfig(
                native_tool_calling=True,
                xml_tool_calling=True,
                max_xml_tool_calls=max_xml_tool_calls
            )
        # Apply max_xml_tool_calls if specified
        elif max_xml_tool_calls > 0:
            processor_config.max_xml_tool_calls = max_xml_tool_calls

        # Create a working copy of the system prompt to potentially modify
        working_system_prompt = system_prompt.copy()

        # Add XML examples to system prompt if requested
        if include_xml_examples and processor_config.xml_tool_calling:
            xml_examples = self.tool_registry.get_xml_examples()
            if xml_examples:
                examples_content = """
--- XML TOOL CALLING ---

In this environment you have access to a set of tools you can use to answer the user's question. The tools are specified in XML format.
Format your tool calls using the specified XML tags. Place parameters marked as 'attribute' within the opening tag (e.g., `<tag attribute='value'>`). Place parameters marked as 'content' between the opening and closing tags. Place parameters marked as 'element' within their own child tags (e.g., `<tag><element>value</element></tag>`). Refer to the examples provided below for the exact structure of each tool.
String and scalar parameters should be specified as attributes, while content goes between tags.
Note that spaces for string values are not stripped. The output is parsed with regular expressions.

Here are the XML tools available with examples:
"""
                for tag_name, example in xml_examples.items():
                    examples_content += f"<{tag_name}> Example: {example}\\n"

                system_content = working_system_prompt.get('content')

                if isinstance(system_content, str):
                    working_system_prompt['content'] += examples_content
                    logger.debug("Appended XML examples to string system prompt content.")
                elif isinstance(system_content, list):
                    appended = False
                    for item in working_system_prompt['content']:
                        if isinstance(item, dict) and item.get('type') == 'text' and 'text' in item:
                            item['text'] += examples_content
                            logger.debug("Appended XML examples to the first text block in list system prompt content.")
                            appended = True
                            break
                    if not appended:
                        logger.warning("System prompt content is a list but no text block found to append XML examples.")
                else:
                    logger.warning(f"System prompt content is of unexpected type ({type(system_content)}), cannot add XML examples.")

        # Control whether we need to auto-continue due to tool_calls finish reason
        auto_continue = True
        auto_continue_count = 0

        # Define inner function to handle a single run
        async def _run_once(temp_msg=None) -> AsyncGenerator[Dict[str, Any], None]:
            try:
                # Get messages from thread for LLM call
                messages = await self.get_llm_messages(thread_id)

                # Prepare messages for LLM call + add temporary message if it exists
                prepared_messages = [working_system_prompt]

                # Find the last user message index
                last_user_index = -1
                for i, msg in enumerate(messages):
                    if msg.get('role') == 'user':
                        last_user_index = i

                # Insert temporary message before the last user message if it exists
                if temp_msg and last_user_index >= 0:
                    prepared_messages.extend(messages[:last_user_index])
                    prepared_messages.append(temp_msg)
                    prepared_messages.extend(messages[last_user_index:])
                    logger.debug("Added temporary message before the last user message")
                else:
                    # If no user message or no temporary message, just add all messages
                    prepared_messages.extend(messages)
                    if temp_msg:
                        prepared_messages.append(temp_msg)
                        logger.debug("Added temporary message to the end of prepared messages")

                # Prepare tools for LLM call
                openapi_tool_schemas = None
                if processor_config.native_tool_calling:
                    openapi_tool_schemas = self.tool_registry.get_openapi_schemas()
                    logger.debug(f"Retrieved {len(openapi_tool_schemas) if openapi_tool_schemas else 0} OpenAPI tool schemas")

                prepared_messages = self._compress_messages(prepared_messages, llm_model)

                # Make LLM API call
                logger.debug("Making LLM API call")
                try:
                    if generation:
                        generation.update(
                            input=prepared_messages,
                            start_time=datetime.datetime.now(datetime.timezone.utc),
                            model=llm_model,
                            model_parameters={
                              "max_tokens": llm_max_tokens,
                              "temperature": llm_temperature,
                              "enable_thinking": enable_thinking,
                              "reasoning_effort": reasoning_effort,
                              "tool_choice": tool_choice,
                              "tools": openapi_tool_schemas,
                            }
                        )
                    llm_response = await make_llm_api_call(
                        prepared_messages,
                        llm_model,
                        temperature=llm_temperature,
                        max_tokens=llm_max_tokens,
                        tools=openapi_tool_schemas,
                        tool_choice=tool_choice if processor_config.native_tool_calling else None,
                        stream=stream,
                        enable_thinking=enable_thinking,
                        reasoning_effort=reasoning_effort
                    )
                    logger.debug("Successfully received raw LLM API response stream/object")

                except Exception as e:
                    logger.error(f"Failed to make LLM API call: {str(e)}", exc_info=True)
                    raise

                # Process LLM response using the ResponseProcessor
                if stream:
                    logger.debug("Processing streaming response")
                    async for chunk in self.response_processor.process_streaming_response(
                        llm_response=llm_response,
                        thread_id=thread_id,
                        config=processor_config,
                        prompt_messages=prepared_messages,
                        llm_model=llm_model,
                    ):
                        yield chunk
                else:
                    logger.debug("Processing non-streaming response")
                    async for chunk in self.response_processor.process_non_streaming_response(
                        llm_response=llm_response,
                        thread_id=thread_id,
                        config=processor_config,
                        prompt_messages=prepared_messages,
                        llm_model=llm_model,
                    ):
                        yield chunk

            except Exception as e:
                logger.error(f"Error in run_thread: {str(e)}", exc_info=True)
                yield {
                    "type": "status",
                    "status": "error",
                    "message": str(e)
                }

        # Define a wrapper generator that handles auto-continue logic
        async def auto_continue_wrapper() -> AsyncGenerator[Dict[str, Any], None]:
            nonlocal auto_continue, auto_continue_count

            while auto_continue and (native_max_auto_continues == 0 or auto_continue_count < native_max_auto_continues):
                # Reset auto_continue for this iteration
                auto_continue = False

                # Run the thread once
                try:
                    async for chunk in _run_once(temporary_message if auto_continue_count == 0 else None):
                        # Check if this is a finish reason chunk with tool_calls or xml_tool_limit_reached
                        if chunk.get('type') == 'finish':
                            if chunk.get('finish_reason') == 'tool_calls':
                                # Only auto-continue if enabled (max > 0)
                                if native_max_auto_continues > 0:
                                    logger.info(f"Detected finish_reason='tool_calls', auto-continuing ({auto_continue_count + 1}/{native_max_auto_continues})")
                                    auto_continue = True
                                    auto_continue_count += 1
                                    # Don't yield the finish chunk to avoid confusing the client
                                    continue
                            elif chunk.get('finish_reason') == 'xml_tool_limit_reached':
                                # Don't auto-continue if XML tool limit was reached
                                logger.info(f"Detected finish_reason='xml_tool_limit_reached', stopping auto-continue")
                                auto_continue = False
                                # Still yield the chunk to inform the client

                        # Otherwise just yield the chunk normally
                        yield chunk

                    # If not auto-continuing, we're done
                    if not auto_continue:
                        break
                except Exception as e:
                    # If there's an exception, log it, yield an error status, and stop execution
                    logger.error(f"Error in auto_continue_wrapper: {str(e)}", exc_info=True)
                    yield {
                        "type": "status",
                        "status": "error",
                        "message": f"Error in thread processing: {str(e)}"
                    }
                    return

            # If we've reached the max auto-continues, log a warning
            if auto_continue and auto_continue_count >= native_max_auto_continues:
                logger.warning(f"Reached maximum auto-continue limit ({native_max_auto_continues}), stopping.")
                yield {
                    "type": "content",
                    "content": f"\n[Agent reached maximum auto-continue limit of {native_max_auto_continues}]"
                }

        # If auto-continue is disabled (max=0), just run once
        if native_max_auto_continues == 0:
            logger.info("Auto-continue is disabled (native_max_auto_continues=0)")
            async for chunk in _run_once(temporary_message):
                yield chunk
        else:
            # Otherwise return the auto-continue wrapper generator
            async for chunk in auto_continue_wrapper():
                yield chunk