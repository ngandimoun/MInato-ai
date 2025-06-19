# livingdossier/services/tools-livings/tavily_web_search_tool.py



from tavily import AsyncTavilyClient
import httpx
from dotenv import load_dotenv
from agentpress.tool import Tool, ToolResult, openapi_schema, xml_schema
from utils.config import config
from sandbox.tool_base import SandboxToolsBase
from agentpress.thread_manager import ThreadManager
import json
import os
import datetime
import asyncio
import logging
from urllib.parse import urlparse

# TODO: add subpages, etc... in filters as sometimes its necessary 

class SandboxWebSearchTool(SandboxToolsBase):
    """Tool for performing web searches using Tavily API and web scraping/crawling using Jina AI and Firecrawl."""

    def __init__(self, project_id: str, thread_manager: ThreadManager):
        super().__init__(project_id, thread_manager)
        # Load environment variables
        load_dotenv()
        # Use API keys from config
        self.tavily_api_key = config.TAVILY_API_KEY
        self.firecrawl_api_key = config.FIRECRAWL_API_KEY
        self.jina_api_key = config.JINA_API_KEY # Added Jina API Key
        self.firecrawl_url = config.FIRECRAWL_URL
        
        if not self.tavily_api_key:
            raise ValueError("TAVILY_API_KEY not found in configuration")
        if not self.firecrawl_api_key:
            raise ValueError("FIRECRAWL_API_KEY not found in configuration")
        if not self.jina_api_key:
            # Jina is preferred but can be optional if the key is missing; we will just use Firecrawl.
            logging.warning("JINA_API_KEY not found in configuration. Will fallback to Firecrawl for all scraping.")

        # Tavily asynchronous search client
        self.tavily_client = AsyncTavilyClient(api_key=self.tavily_api_key)

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web for up-to-date information on a specific topic using the Tavily API. This tool allows you to gather real-time information from the internet to answer user queries, research topics, validate facts, and find recent developments. Results include titles, URLs, and publication dates. Use this tool for discovering relevant web pages before potentially crawling them for complete content.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query to find relevant web pages. Be specific and include key terms to improve search accuracy. For best results, use natural language questions or keyword combinations that precisely describe what you're looking for."
                    },
                    "num_results": {
                        "type": "integer",
                        "description": "The number of search results to return. Increase for more comprehensive research or decrease for focused, high-relevance results.",
                        "default": 20
                    },
                    "include_domains": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "A list of specific domains to search within (e.g., ['en.wikipedia.org', 'nytimes.com']).",
                        "default": None
                    },
                    "exclude_domains": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "A list of specific domains to exclude from the search (e.g., ['pinterest.com', 'facebook.com']).",
                        "default": None
                    },
                },
                "required": ["query"]
            }
        }
    })
    @xml_schema(
        tag_name="web-search",
        mappings=[
            {"param_name": "query", "node_type": "attribute", "path": "."},
            {"param_name": "num_results", "node_type": "attribute", "path": "."},
            {"param_name": "include_domains", "node_type": "attribute", "path": "."},
            {"param_name": "exclude_domains", "node_type": "attribute", "path": "."}
        ],
        example='''
        <function_calls>
        <invoke name="web_search">
        <parameter name="query">Kortix AI Suna model details</parameter>
        <parameter name="num_results">10</parameter>
        <parameter name="include_domains">["github.com", "kortix.ai"]</parameter>
        </invoke>
        </function_calls>
        
        <!-- Another search example -->
        <function_calls>
        <invoke name="web_search">
        <parameter name="query">latest AI research on transformer models</parameter>
        <parameter name="num_results">20</parameter>
        <parameter name="exclude_domains">["reddit.com"]</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def web_search(
        self, 
        query: str,
        num_results: int = 20,
        include_domains: list[str] = None,
        exclude_domains: list[str] = None,
    ) -> ToolResult:
        """
        Search the web using the Tavily API to find relevant and up-to-date information.
        """
        try:
            if not query or not isinstance(query, str):
                return self.fail_response("A valid search query is required.")
            
            num_results = max(1, min(int(num_results or 20), 50))

            logging.info(f"Executing web search for query: '{query}' with parameters: num_results={num_results}, include_domains={include_domains}, exclude_domains={exclude_domains}")
            search_response = await self.tavily_client.search(
                query=query,
                max_results=num_results,
                include_images=True,
                include_answer=True, # Use boolean for clarity
                search_depth="advanced",
                include_domains=include_domains,
                exclude_domains=exclude_domains,
            )
            
            results = search_response.get('results', [])
            answer = search_response.get('answer', '')
            
            logging.info(f"Retrieved search results for query: '{query}' with answer and {len(results)} results")
            
            if results or (answer and answer.strip()):
                return ToolResult(
                    success=True,
                    output=json.dumps(search_response, ensure_ascii=False)
                )
            else:
                logging.warning(f"No search results or answer found for query: '{query}'")
                return ToolResult(
                    success=False,
                    output=json.dumps(search_response, ensure_ascii=False)
                )
        
        except Exception as e:
            error_message = str(e)
            logging.error(f"Error performing web search for '{query}': {error_message}")
            simplified_message = f"Error performing web search: {error_message[:200]}"
            if len(error_message) > 200:
                simplified_message += "..."
            return self.fail_response(simplified_message)

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "scrape_webpage",
            "description": "Extract full text content from multiple webpages. It prioritizes the fast and free Jina AI Reader API and falls back to the more robust Firecrawl service if needed. IMPORTANT: ALWAYS collect multiple relevant URLs from web-search results and scrape them all in a single call for efficiency.",
            "parameters": {
                "type": "object",
                "properties": {
                    "urls": {
                        "type": "string",
                        "description": "Multiple URLs to scrape, separated by commas. You should ALWAYS include several URLs when possible for efficiency. Example: 'https://example.com/page1,https://example.com/page2,https://example.com/page3'"
                    }
                },
                "required": ["urls"]
            }
        }
    })
    @xml_schema(
        tag_name="scrape-webpage",
        mappings=[
            {"param_name": "urls", "node_type": "attribute", "path": "."}
        ],
        example='''
        <function_calls>
        <invoke name="scrape_webpage">
        <parameter name="urls">https://www.kortix.ai/,https://github.com/kortix-ai/suna</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def scrape_webpage(
        self,
        urls: str
    ) -> ToolResult:
        """
        Retrieve the complete text content of multiple webpages, prioritizing Jina and falling back to Firecrawl.
        """
        try:
            logging.info(f"Starting to scrape webpages: {urls}")
            await self._ensure_sandbox()
            
            if not urls:
                logging.warning("Scrape attempt with empty URLs")
                return self.fail_response("Valid URLs are required.")
            
            url_list = [url.strip() for url in urls.split(',') if url.strip()]
            
            if not url_list:
                return self.fail_response("No valid URLs provided.")
                
            if len(url_list) == 1:
                logging.warning("Only a single URL provided - for efficiency you should scrape multiple URLs at once")
            
            logging.info(f"Processing {len(url_list)} URLs: {url_list}")
            
            tasks = [self._scrape_single_url(url) for url in url_list]
            results = await asyncio.gather(*tasks)
            
            successful = sum(1 for r in results if r.get("success", False))
            failed = len(results) - successful
            
            if successful == len(results):
                message = f"Successfully scraped all {len(results)} URLs. Results saved to:"
            else:
                message = f"Scraped {successful} URLs successfully and {failed} failed. Results saved to:"
            
            for r in results:
                if r.get("success"):
                    message += f"\n- {r.get('file_path')} (scraped with {r.get('scraper')})"
            
            if failed > 0:
                message += "\n\nFailed URLs:"
                for r in results:
                    if not r.get("success"):
                        message += f"\n- {r.get('url')}: {r.get('error', 'Unknown error')}"

            return ToolResult(
                success=successful > 0,
                output=message
            )
        
        except Exception as e:
            error_message = str(e)
            logging.error(f"Error in scrape_webpage: {error_message}")
            return self.fail_response(f"Error processing scrape request: {error_message[:200]}")

    async def _scrape_single_url(self, url: str) -> dict:
        """
        Helper function to scrape a single URL. Tries Jina first, then falls back to Firecrawl.
        """
        logging.info(f"Scraping single URL: {url}")
        
        # Ensure URL has a protocol
        if not (url.startswith('http://') or url.startswith('https://')):
            url = 'https://' + url
            logging.info(f"Added https:// protocol to URL: {url}")

        # --- Attempt 1: Jina AI Reader API (Priority) ---
        if self.jina_api_key:
            try:
                logging.info(f"Attempting to scrape {url} with Jina AI...")
                jina_url = f"https://r.jina.ai/{url}"
                headers = {
                    "Authorization": f"Bearer {self.jina_api_key}",
                    "Accept": "application/json",
                }
                async with httpx.AsyncClient() as client:
                    response = await client.get(jina_url, headers=headers, timeout=60)
                
                response.raise_for_status()
                data = response.json().get('data')
                
                if data and data.get('content'):
                    logging.info(f"Successfully scraped {url} with Jina AI.")
                    formatted_result = {
                        "title": data.get("title", ""),
                        "url": data.get("url", url),
                        "text": data.get("content", ""),
                        "metadata": {"source": "Jina AI Reader"},
                        "scraper": "jina"
                    }
                    return await self._save_scrape_result(url, formatted_result)
                else:
                    logging.warning(f"Jina AI returned empty content for {url}. Falling back to Firecrawl.")
            except Exception as e:
                logging.warning(f"Jina AI failed for {url}: {str(e)}. Falling back to Firecrawl.")

        # --- Attempt 2: Firecrawl Scrape API (Fallback) ---
        try:
            logging.info(f"Attempting to scrape {url} with Firecrawl...")
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {self.firecrawl_api_key}",
                    "Content-Type": "application/json",
                }
                payload = {"url": url, "pageOptions": {"onlyMainContent": True}}
                
                response = await client.post(
                    f"{self.firecrawl_url}/v1/scrape",
                    json=payload,
                    headers=headers,
                    timeout=120,
                )
                response.raise_for_status()
                data = response.json()

            if data.get("data") and data["data"].get("markdown"):
                logging.info(f"Successfully scraped {url} with Firecrawl.")
                content_data = data["data"]
                formatted_result = {
                    "title": content_data.get("metadata", {}).get("title", ""),
                    "url": url,
                    "text": content_data.get("markdown", ""),
                    "metadata": content_data.get("metadata", {}),
                    "scraper": "firecrawl"
                }
                return await self._save_scrape_result(url, formatted_result)
            else:
                raise Exception("Firecrawl returned no data.")

        except Exception as e:
            error_message = str(e)
            logging.error(f"Failed to scrape URL '{url}' with all methods: {error_message}")
            return {"url": url, "success": False, "error": error_message}
            
    async def _save_scrape_result(self, url: str, content: dict) -> dict:
        """Saves scraped content to a file in the workspace."""
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        parsed_url = urlparse(url)
        domain = parsed_url.netloc.replace("www.", "")
        domain = "".join([c if c.isalnum() else "_" for c in domain])
        safe_filename = f"{timestamp}_{domain}.json"
        
        scrape_dir = f"{self.workspace_path}/scrape"
        self.sandbox.fs.create_folder(scrape_dir, "755")
        
        results_file_path = f"{scrape_dir}/{safe_filename}"
        json_content = json.dumps(content, ensure_ascii=False, indent=2)
        
        self.sandbox.fs.upload_file(
            json_content.encode(),
            results_file_path,
        )
        logging.info(f"Saved content from {url} to file: {results_file_path}")
        
        return {
            "url": url,
            "success": True,
            "title": content.get("title"),
            "file_path": results_file_path,
            "content_length": len(content.get("text", "")),
            "scraper": content.get("scraper", "unknown")
        }

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "crawl_website",
            "description": "Initiates a crawl of an entire website using Firecrawl. This is an asynchronous operation. The tool returns a `jobId`. Use the `check_crawl_status` tool with this `jobId` to get the results once the crawl is complete.",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "The starting URL to crawl the website from."
                    },
                    "crawler_options": {
                        "type": "string",
                        "description": "A JSON string of crawler options (e.g., `{\"includes\": [\"/blog/.*\"], \"excludes\": [\"/careers\"], \"maxDepth\": 2}`). See Firecrawl docs for details."
                    }
                },
                "required": ["url"]
            }
        }
    })
    @xml_schema(
        tag_name="crawl-website",
        mappings=[
            {"param_name": "url", "node_type": "attribute", "path": "."},
            {"param_name": "crawler_options", "node_type": "attribute", "path": "."}
        ],
        example='''
        <function_calls>
        <invoke name="crawl_website">
        <parameter name="url">https://www.firecrawl.dev/blog</parameter>
        <parameter name="crawler_options">{"maxDepth": 1}</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def crawl_website(self, url: str, crawler_options: str = None) -> ToolResult:
        """
        Initiates a website crawl job using Firecrawl.
        """
        try:
            logging.info(f"Initiating crawl for URL: {url} with options: {crawler_options}")
            payload = {"url": url}
            if crawler_options:
                try:
                    payload["crawlerOptions"] = json.loads(crawler_options)
                except json.JSONDecodeError:
                    return self.fail_response("Invalid JSON format for crawler_options.")
            
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {self.firecrawl_api_key}",
                    "Content-Type": "application/json",
                }
                response = await client.post(
                    f"{self.firecrawl_url}/v1/crawl",
                    json=payload,
                    headers=headers,
                    timeout=30,
                )
                response.raise_for_status()
                data = response.json()
            
            job_id = data.get("jobId")
            if not job_id:
                raise Exception("Firecrawl did not return a jobId.")

            message = f"Successfully started crawl for {url}. The job ID is '{job_id}'. Use the 'check_crawl_status' tool with this ID to check progress and retrieve results."
            logging.info(message)
            return ToolResult(success=True, output=message)

        except Exception as e:
            error_message = str(e)
            logging.error(f"Error initiating crawl for '{url}': {error_message}")
            return self.fail_response(f"Error initiating crawl: {error_message}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "check_crawl_status",
            "description": "Checks the status of a website crawl job initiated with `crawl_website`. If the job is complete, it saves the data to a file and returns the file path.",
            "parameters": {
                "type": "object",
                "properties": {
                    "job_id": {
                        "type": "string",
                        "description": "The job ID returned from the `crawl_website` tool."
                    }
                },
                "required": ["job_id"]
            }
        }
    })
    @xml_schema(
        tag_name="check-crawl-status",
        mappings=[{"param_name": "job_id", "node_type": "attribute", "path": "."}],
        example='''
        <function_calls>
        <invoke name="check_crawl_status">
        <parameter name="job_id">29d79963-793c-4158-b57c-b3a530e38a45</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def check_crawl_status(self, job_id: str) -> ToolResult:
        """
        Checks the status of a Firecrawl job and retrieves data if complete.
        """
        try:
            logging.info(f"Checking status for crawl job ID: {job_id}")
            await self._ensure_sandbox()
            
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.firecrawl_api_key}"}
                response = await client.get(
                    f"{self.firecrawl_url}/v1/crawl/status/{job_id}",
                    headers=headers,
                    timeout=30,
                )
                response.raise_for_status()
                data = response.json()

            status = data.get("status")
            if status == "completed":
                crawl_data = data.get("data")
                if not crawl_data:
                    return self.fail_response("Crawl completed but no data was returned.")
                
                safe_filename = f"crawl_{job_id}.json"
                crawl_dir = f"{self.workspace_path}/crawls"
                self.sandbox.fs.create_folder(crawl_dir, "755")
                file_path = f"{crawl_dir}/{safe_filename}"
                
                self.sandbox.fs.upload_file(
                    json.dumps(crawl_data, indent=2).encode(),
                    file_path
                )
                
                message = f"Crawl job '{job_id}' is complete. Scraped {len(crawl_data)} pages. Data saved to: {file_path}"
                logging.info(message)
                return ToolResult(success=True, output=message)
            elif status in ["active", "paused", "queued"]:
                message = f"Crawl job '{job_id}' is still in progress. Current status: '{status}'. Please check again in a few moments."
                logging.info(message)
                return ToolResult(success=True, output=message)
            else:
                error_info = data.get('error', 'Unknown error')
                return self.fail_response(f"Crawl job '{job_id}' failed or has an unknown status: '{status}'. Details: {error_info}")

        except Exception as e:
            error_message = str(e)
            logging.error(f"Error checking status for job '{job_id}': {error_message}")
            return self.fail_response(f"Error checking job status: {error_message}")

if __name__ == "__main__":
    # Note: These tests are conceptual and require a running sandbox environment to execute.
    async def test_web_search():
        print("--- Testing Web Search ---")
        # This test function requires a sandbox environment.
        print("Conceptual Test: web_search(query='What is Minato Living Dossier?', num_results=5)")
        print("Expected Outcome: A JSON string with search results and an answer from Tavily.")
    
    async def test_scrape_webpage():
        print("\n--- Testing Scrape Webpage ---")
        # This test function requires a sandbox environment.
        print("Conceptual Test: scrape_webpage(urls='https://jina.ai/about,https://www.firecrawl.dev/')")
        print("Expected Outcome: A message indicating successful scraping of 2 URLs, with file paths for the saved content.")

    async def test_crawl_cycle():
        print("\n--- Testing Crawl Cycle ---")
        # This test function requires a sandbox environment.
        print("Conceptual Test 1: crawl_website(url='https://www.firecrawl.dev/blog')")
        print("Expected Outcome: A success message with a job ID.")
        job_id = "mock-job-id-12345" # In a real run, this would be from the output of the previous step.
        print(f"Conceptual Test 2: check_crawl_status(job_id='{job_id}')")
        print("Expected Outcome: A message indicating the crawl is in progress or complete, with a file path if finished.")

    async def run_tests():
        """Run all conceptual test functions"""
        await test_web_search()
        await test_scrape_webpage()
        await test_crawl_cycle()
        
    asyncio.run(run_tests())