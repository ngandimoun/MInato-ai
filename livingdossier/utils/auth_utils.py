"""
Authentication utilities for the Living Dossier system.
This module provides compatibility with the main project's authentication system.
"""

from typing import Optional, Dict, Any, Union, TYPE_CHECKING
import logging
import os

# Type checking imports
if TYPE_CHECKING:
    from supabase import create_client  # type: ignore
    from supabase import Client  # type: ignore
else:
    # Runtime imports - handle gracefully if supabase is not available
    try:
        from supabase import create_client, Client
    except ImportError:
        # Define dummy versions if not available
        create_client = None
        Client = None  # type: ignore

logger = logging.getLogger(__name__)

def get_supabase_client() -> Any:  # Use Any instead of Union with Client
    """
    Get a Supabase client instance using environment variables.
    
    Returns:
        A Supabase client instance
    """
    supabase_url = os.environ.get("SUPABASE_URL", "")
    supabase_key = os.environ.get("SUPABASE_KEY", "")
    
    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY environment variables must be set")
    
    if create_client is not None:
        return create_client(supabase_url, supabase_key)
    else:
        # If supabase is not installed, return a dummy client
        return DummySupabaseClient()

class DummySupabaseClient:
    """A dummy client for when supabase is not installed."""
    
    def auth(self):
        return self
    
    def sign_in_with_password(self, credentials: Dict[str, str]) -> Dict[str, Any]:
        return {"user": None, "session": None, "error": "Supabase not installed"}

def verify_token(token: str) -> Dict[str, Any]:
    """
    Verify a JWT token.
    
    Args:
        token: The JWT token to verify
        
    Returns:
        A dictionary containing the decoded token payload
    """
    # This is a stub implementation
    # In a real implementation, you would verify the token with your auth provider
    return {"sub": "user_id", "email": "user@example.com"}

def get_current_user(token: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Get the current user from a token.
    
    Args:
        token: The JWT token to use, or None to use the token from the environment
        
    Returns:
        A dictionary containing the user information, or None if no user is authenticated
    """
    if not token:
        token = os.environ.get("AUTH_TOKEN")
    
    if not token:
        return None
    
    try:
        return verify_token(token)
    except Exception:
        return None

def is_authenticated(token: Optional[str] = None) -> bool:
    """
    Check if a user is authenticated.
    
    Args:
        token: The JWT token to use, or None to use the token from the environment
        
    Returns:
        True if the user is authenticated, False otherwise
    """
    return get_current_user(token) is not None

def has_permission(user_id: str, resource_id: str, permission: str) -> bool:
    """
    Check if a user has a specific permission on a resource.
    
    Args:
        user_id: The ID of the user
        resource_id: The ID of the resource
        permission: The permission to check
        
    Returns:
        True if the user has the permission, False otherwise
    """
    # This is a stub implementation
    # In a real implementation, you would check the user's permissions in your database
    return True

async def get_current_user_id_from_jwt(token: Optional[str] = None) -> str:
    """
    Get the current user ID from a JWT token.
    This is a stub function that should be replaced with actual implementation.
    
    Args:
        token: The JWT token
        
    Returns:
        The user ID
    """
    # In a real implementation, this would validate the JWT and extract the user ID
    # For now, return a placeholder user ID
    logger.warning("Using stub function get_current_user_id_from_jwt - replace with actual implementation")
    return "stub-user-id"

async def get_user_id_from_stream_auth(token: str) -> Optional[str]:
    """
    Get the user ID from a stream authentication token.
    This is a stub function that should be replaced with actual implementation.
    
    Args:
        token: The stream authentication token
        
    Returns:
        The user ID or None if authentication fails
    """
    logger.warning("Using stub function get_user_id_from_stream_auth - replace with actual implementation")
    return "stub-user-id"

async def verify_thread_access(thread_id: str, user_id: str) -> bool:
    """
    Verify that a user has access to a thread.
    This is a stub function that should be replaced with actual implementation.
    
    Args:
        thread_id: The ID of the thread
        user_id: The ID of the user
        
    Returns:
        True if the user has access to the thread, False otherwise
    """
    logger.warning("Using stub function verify_thread_access - replace with actual implementation")
    return True

async def get_account_id_from_thread(client, thread_id: str) -> Optional[str]:
    """
    Get the account ID associated with a thread.
    This is a stub function that should be replaced with actual implementation.
    
    Args:
        client: The database client
        thread_id: The ID of the thread
        
    Returns:
        The account ID or None if not found
    """
    logger.warning("Using stub function get_account_id_from_thread - replace with actual implementation")
    return "stub-account-id" 