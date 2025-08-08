"""
Run all tests for the project
"""
import os
import sys
import subprocess
import time
from pathlib import Path

def run_server():
    """Start the FastAPI server in a subprocess"""
    print("Starting FastAPI server...")
    server_process = subprocess.Popen(
        ["uvicorn", "main:app", "--reload", "--port", "8000"],
        cwd=str(Path(__file__).parent),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # Wait for server to start
    time.sleep(5)
    return server_process

def run_tests():
    """Run all tests"""
    tests_dir = Path(__file__).parent / "tests"
    
    # Run unit tests first
    print("\n=== Running Unit Tests ===\n")
    
    # Test validation functions
    print("\n--- Testing Validation Functions ---\n")
    subprocess.run(
        [sys.executable, str(tests_dir / "test_validation_functions.py")],
        check=False
    )
    
    # Test RAG and feedback
    print("\n--- Testing RAG and Feedback ---\n")
    subprocess.run(
        [sys.executable, str(tests_dir / "test_rag_and_feedback.py")],
        check=False
    )
    
    # Test validation
    print("\n--- Testing Validation ---\n")
    subprocess.run(
        [sys.executable, str(tests_dir / "test_validation.py")],
        check=False
    )
    
    # Run API tests last
    print("\n=== Running API Tests ===\n")
    subprocess.run(
        [sys.executable, str(tests_dir / "test_endpoints.py")],
        check=False
    )

def main():
    """Main function to run all tests"""
    try:
        # Start server
        server_process = run_server()
        
        # Run tests
        run_tests()
        
    except KeyboardInterrupt:
        print("\nTests interrupted by user")
    finally:
        # Terminate server
        if 'server_process' in locals():
            print("\nStopping server...")
            server_process.terminate()
            try:
                server_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server_process.kill()

if __name__ == "__main__":
    main()
