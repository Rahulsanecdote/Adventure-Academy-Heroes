#!/usr/bin/env python3
"""
Adventure Academy Heroes Backend API Test Suite
Tests all backend endpoints systematically as per the review request.
"""

import requests
import json
import time
from typing import Dict, Optional

class AdventureAcademyTester:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.parent_token = None
        self.child_id = None
        self.session_id = None
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages with timestamp."""
        timestamp = time.strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None) -> Dict:
        """Make HTTP request and return response data."""
        url = f"{self.base_url}{endpoint}"
        
        # Default headers
        req_headers = {"Content-Type": "application/json"}
        if headers:
            req_headers.update(headers)
            
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=req_headers)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=req_headers)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=req_headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            self.log(f"{method} {endpoint} -> {response.status_code}")
            
            if response.status_code >= 400:
                self.log(f"Error response: {response.text}", "ERROR")
                
            return {
                "status_code": response.status_code,
                "data": response.json() if response.content else {},
                "success": 200 <= response.status_code < 300
            }
            
        except requests.exceptions.RequestException as e:
            self.log(f"Request failed: {str(e)}", "ERROR")
            return {"status_code": 0, "data": {}, "success": False, "error": str(e)}
        except json.JSONDecodeError as e:
            self.log(f"JSON decode error: {str(e)}", "ERROR")
            return {"status_code": response.status_code, "data": {}, "success": False, "error": "Invalid JSON response"}

    def test_health_check(self) -> bool:
        """Test basic health endpoints."""
        self.log("=== Testing Health Check ===")
        
        # Test root endpoint
        result = self.make_request("GET", "/")
        if not result["success"]:
            self.log("Root endpoint failed", "ERROR")
            return False
            
        # Test health endpoint
        result = self.make_request("GET", "/health")
        if not result["success"]:
            self.log("Health endpoint failed", "ERROR")
            return False
            
        self.log("Health check passed ✓")
        return True

    def test_parent_authentication(self) -> bool:
        """Test parent registration and login flow."""
        self.log("=== Testing Parent Authentication ===")
        
        # Test parent registration
        parent_data = {
            "name": "Emma Johnson",
            "email": "emma.johnson@example.com",
            "password": "SecurePass123"
        }
        
        self.log("Testing parent registration...")
        result = self.make_request("POST", "/auth/parent/register", parent_data)
        
        if not result["success"]:
            self.log(f"Parent registration failed: {result.get('data', {})}", "ERROR")
            return False
            
        # Verify token is returned
        if "access_token" not in result["data"]:
            self.log("No access token in registration response", "ERROR")
            return False
            
        self.parent_token = result["data"]["access_token"]
        self.log("Parent registration successful ✓")
        
        # Test parent login
        login_data = {
            "email": parent_data["email"],
            "password": parent_data["password"]
        }
        
        self.log("Testing parent login...")
        result = self.make_request("POST", "/auth/parent/login", login_data)
        
        if not result["success"]:
            self.log(f"Parent login failed: {result.get('data', {})}", "ERROR")
            return False
            
        # Verify token is returned
        if "access_token" not in result["data"]:
            self.log("No access token in login response", "ERROR")
            return False
            
        self.parent_token = result["data"]["access_token"]
        self.log("Parent login successful ✓")
        
        # Test duplicate registration (should fail)
        self.log("Testing duplicate registration...")
        result = self.make_request("POST", "/auth/parent/register", parent_data)
        if result["success"]:
            self.log("Duplicate registration should have failed", "ERROR")
            return False
            
        self.log("Duplicate registration properly rejected ✓")
        return True

    def test_child_profile_management(self) -> bool:
        """Test child profile creation and retrieval."""
        self.log("=== Testing Child Profile Management ===")
        
        if not self.parent_token:
            self.log("No parent token available", "ERROR")
            return False
            
        headers = {"Authorization": f"Bearer {self.parent_token}"}
        
        # Test child profile creation
        child_data = {
            "name": "Alex Hero",
            "age": 5,
            "avatar_id": "hero1",
            "picture_password_id": "pic1"
        }
        
        self.log("Testing child profile creation...")
        result = self.make_request("POST", "/child/profile", child_data, headers)
        
        if not result["success"]:
            self.log(f"Child profile creation failed: {result.get('data', {})}", "ERROR")
            return False
            
        # Store child ID for later tests
        if "id" not in result["data"]:
            self.log("No child ID in response", "ERROR")
            return False
            
        self.child_id = result["data"]["id"]
        self.log(f"Child profile created successfully ✓ (ID: {self.child_id})")
        
        # Test get specific child profile
        self.log("Testing get specific child profile...")
        result = self.make_request("GET", f"/child/profile/{self.child_id}", headers=headers)
        
        if not result["success"]:
            self.log(f"Get child profile failed: {result.get('data', {})}", "ERROR")
            return False
            
        # Verify child data
        child_profile = result["data"]
        if child_profile["name"] != child_data["name"] or child_profile["age"] != child_data["age"]:
            self.log("Child profile data mismatch", "ERROR")
            return False
            
        self.log("Get child profile successful ✓")
        
        # Test get all children profiles
        self.log("Testing get all children profiles...")
        result = self.make_request("GET", "/child/profiles", headers=headers)
        
        if not result["success"]:
            self.log(f"Get children profiles failed: {result.get('data', {})}", "ERROR")
            return False
            
        # Verify our child is in the list
        profiles = result["data"]
        if not isinstance(profiles, list) or len(profiles) == 0:
            self.log("No children profiles returned", "ERROR")
            return False
            
        found_child = any(p["id"] == self.child_id for p in profiles)
        if not found_child:
            self.log("Created child not found in profiles list", "ERROR")
            return False
            
        self.log("Get all children profiles successful ✓")
        return True

    def test_ai_activity_generation(self) -> bool:
        """Test AI activity generation endpoint."""
        self.log("=== Testing AI Activity Generation ===")
        
        if not self.child_id:
            self.log("No child ID available", "ERROR")
            return False
            
        # Test math activity generation
        activity_request = {
            "child_id": self.child_id,
            "activity_type": "counting",
            "count": 5
        }
        
        self.log("Testing math activity generation...")
        result = self.make_request("POST", "/activities/math", activity_request)
        
        if not result["success"]:
            self.log(f"Math activity generation failed: {result.get('data', {})}", "ERROR")
            return False
            
        # Verify response structure
        response_data = result["data"]
        required_fields = ["activities", "difficulty_level", "encouragement_message"]
        
        for field in required_fields:
            if field not in response_data:
                self.log(f"Missing field in activity response: {field}", "ERROR")
                return False
                
        # Verify activities are returned
        activities = response_data["activities"]
        if not isinstance(activities, list) or len(activities) == 0:
            self.log("No activities returned", "ERROR")
            return False
            
        # Check if activities have required structure
        first_activity = activities[0]
        activity_fields = ["activity_type", "question_text", "correct_answer", "difficulty_level"]
        
        for field in activity_fields:
            if field not in first_activity:
                self.log(f"Missing field in activity: {field}", "ERROR")
                return False
                
        self.log(f"AI activity generation successful ✓ (Generated {len(activities)} activities)")
        
        # Test different activity types
        for activity_type in ["number_recognition", "shapes"]:
            self.log(f"Testing {activity_type} activities...")
            activity_request["activity_type"] = activity_type
            result = self.make_request("POST", "/activities/math", activity_request)
            
            if not result["success"]:
                self.log(f"{activity_type} activity generation failed", "ERROR")
                return False
                
        self.log("Multiple activity types successful ✓")
        return True

    def test_learning_session_flow(self) -> bool:
        """Test learning session creation and completion."""
        self.log("=== Testing Learning Session Flow ===")
        
        if not self.child_id:
            self.log("No child ID available", "ERROR")
            return False
            
        # Test session creation
        session_data = {
            "child_id": self.child_id,
            "activity_type": "counting",
            "difficulty_level": 1
        }
        
        self.log("Testing session creation...")
        result = self.make_request("POST", "/progress/session", session_data)
        
        if not result["success"]:
            self.log(f"Session creation failed: {result.get('data', {})}", "ERROR")
            return False
            
        # Verify session response
        session_response = result["data"]
        if "session_id" not in session_response:
            self.log("No session_id in response", "ERROR")
            return False
            
        self.session_id = session_response["session_id"]
        self.log(f"Session created successfully ✓ (ID: {self.session_id})")
        
        # Test session update/completion
        session_update = {
            "session_id": self.session_id,
            "score": 80,
            "correct_answers": 4,
            "total_questions": 5,
            "completed": True
        }
        
        self.log("Testing session completion...")
        result = self.make_request("PUT", "/progress/session", session_update)
        
        if not result["success"]:
            self.log(f"Session completion failed: {result.get('data', {})}", "ERROR")
            return False
            
        # Verify completion response
        completion_response = result["data"]
        required_fields = ["session_id", "score", "encouragement", "next_difficulty"]
        
        for field in required_fields:
            if field not in completion_response:
                self.log(f"Missing field in completion response: {field}", "ERROR")
                return False
                
        self.log("Session completion successful ✓")
        
        # Verify score was recorded
        if completion_response["score"] != session_update["score"]:
            self.log("Score mismatch in completion response", "ERROR")
            return False
            
        self.log("Session flow completed successfully ✓")
        return True

    def test_progress_tracking(self) -> bool:
        """Test progress tracking endpoint."""
        self.log("=== Testing Progress Tracking ===")
        
        if not self.child_id:
            self.log("No child ID available", "ERROR")
            return False
            
        # Test get child progress
        self.log("Testing get child progress...")
        result = self.make_request("GET", f"/progress/{self.child_id}")
        
        if not result["success"]:
            self.log(f"Get progress failed: {result.get('data', {})}", "ERROR")
            return False
            
        # Verify progress response structure
        progress_data = result["data"]
        required_fields = ["child_id", "skills", "overall_level", "total_score", "achievements_count", "learning_streak_days"]
        
        for field in required_fields:
            if field not in progress_data:
                self.log(f"Missing field in progress response: {field}", "ERROR")
                return False
                
        # Verify child_id matches
        if progress_data["child_id"] != self.child_id:
            self.log("Child ID mismatch in progress response", "ERROR")
            return False
            
        # Verify skills are present (should have been initialized during profile creation)
        skills = progress_data["skills"]
        if not isinstance(skills, list):
            self.log("Skills should be a list", "ERROR")
            return False
            
        self.log(f"Progress tracking successful ✓ (Level: {progress_data['overall_level']}, Score: {progress_data['total_score']})")
        return True

    def test_parent_dashboard(self) -> bool:
        """Test parent dashboard endpoint."""
        self.log("=== Testing Parent Dashboard ===")
        
        if not self.parent_token or not self.child_id:
            self.log("Missing parent token or child ID", "ERROR")
            return False
            
        headers = {"Authorization": f"Bearer {self.parent_token}"}
        
        # Test parent dashboard
        self.log("Testing parent dashboard...")
        result = self.make_request("GET", f"/dashboard/parent/{self.child_id}", headers=headers)
        
        if not result["success"]:
            self.log(f"Parent dashboard failed: {result.get('data', {})}", "ERROR")
            return False
            
        # Verify dashboard response structure
        dashboard_data = result["data"]
        required_fields = ["child_profile", "recent_sessions", "skill_progress", "achievements", "weekly_stats", "recommendations"]
        
        for field in required_fields:
            if field not in dashboard_data:
                self.log(f"Missing field in dashboard response: {field}", "ERROR")
                return False
                
        # Verify child profile in dashboard
        child_profile = dashboard_data["child_profile"]
        if child_profile["id"] != self.child_id:
            self.log("Child ID mismatch in dashboard", "ERROR")
            return False
            
        # Verify weekly stats structure
        weekly_stats = dashboard_data["weekly_stats"]
        stats_fields = ["sessions_count", "total_time_minutes", "average_score", "skills_practiced"]
        
        for field in stats_fields:
            if field not in weekly_stats:
                self.log(f"Missing field in weekly stats: {field}", "ERROR")
                return False
                
        self.log("Parent dashboard successful ✓")
        return True

    def test_authentication_security(self) -> bool:
        """Test authentication security measures."""
        self.log("=== Testing Authentication Security ===")
        
        # Test accessing protected endpoint without token
        self.log("Testing access without token...")
        result = self.make_request("GET", "/child/profiles")
        
        if result["success"]:
            self.log("Protected endpoint accessible without token", "ERROR")
            return False
            
        self.log("Protected endpoint properly secured ✓")
        
        # Test with invalid token
        self.log("Testing access with invalid token...")
        headers = {"Authorization": "Bearer invalid_token_here"}
        result = self.make_request("GET", "/child/profiles", headers=headers)
        
        if result["success"]:
            self.log("Protected endpoint accessible with invalid token", "ERROR")
            return False
            
        self.log("Invalid token properly rejected ✓")
        return True

    def run_all_tests(self) -> Dict[str, bool]:
        """Run all test suites and return results."""
        self.log("🚀 Starting Adventure Academy Heroes Backend API Tests")
        self.log(f"Testing against: {self.base_url}")
        
        test_results = {}
        
        # Run all test suites
        test_suites = [
            ("Health Check", self.test_health_check),
            ("Parent Authentication", self.test_parent_authentication),
            ("Child Profile Management", self.test_child_profile_management),
            ("AI Activity Generation", self.test_ai_activity_generation),
            ("Learning Session Flow", self.test_learning_session_flow),
            ("Progress Tracking", self.test_progress_tracking),
            ("Parent Dashboard", self.test_parent_dashboard),
            ("Authentication Security", self.test_authentication_security),
        ]
        
        for test_name, test_func in test_suites:
            try:
                self.log(f"\n--- Running {test_name} ---")
                result = test_func()
                test_results[test_name] = result
                
                if result:
                    self.log(f"✅ {test_name} PASSED")
                else:
                    self.log(f"❌ {test_name} FAILED")
                    
            except Exception as e:
                self.log(f"❌ {test_name} FAILED with exception: {str(e)}", "ERROR")
                test_results[test_name] = False
        
        # Print summary
        self.log("\n" + "="*50)
        self.log("TEST SUMMARY")
        self.log("="*50)
        
        passed = sum(1 for result in test_results.values() if result)
        total = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{test_name}: {status}")
            
        self.log(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("🎉 ALL TESTS PASSED!")
        else:
            self.log(f"⚠️  {total - passed} tests failed")
            
        return test_results


def main():
    """Main test execution function."""
    # Use the backend URL from the review request
    backend_url = "https://learning-heroes-1.preview.emergentagent.com/api"
    
    tester = AdventureAcademyTester(backend_url)
    results = tester.run_all_tests()
    
    # Return exit code based on results
    all_passed = all(results.values())
    return 0 if all_passed else 1


if __name__ == "__main__":
    exit(main())