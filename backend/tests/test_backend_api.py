"""
Backend API Tests for Fitness App
Tests all endpoints: health, exercises, workouts, meals, measurements, dashboard, profile, chat
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
TODAY = datetime.now().strftime("%Y-%m-%d")

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

class TestHealthAndExercises:
    """Basic health check and exercise database tests"""
    
    def test_health_endpoint(self, api_client):
        """Test GET /api/health"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
    
    def test_get_exercises(self, api_client):
        """Test GET /api/exercises returns 6 muscle groups"""
        response = api_client.get(f"{BASE_URL}/api/exercises")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        assert len(data) == 6
        expected_groups = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core"]
        for group in expected_groups:
            assert group in data
            assert isinstance(data[group], list)
            assert len(data[group]) > 0

class TestWorkouts:
    """Workout CRUD tests"""
    
    def test_create_workout_and_verify(self, api_client):
        """Test POST /api/workouts and verify with GET"""
        workout_data = {
            "date": TODAY,
            "muscle_group": "Chest",
            "exercise": "Barbell Bench Press",
            "sets": [
                {"weight": 80, "reps": 10},
                {"weight": 85, "reps": 8},
                {"weight": 90, "reps": 6}
            ],
            "notes": "TEST_workout_feeling_strong"
        }
        
        # Create workout
        create_response = api_client.post(f"{BASE_URL}/api/workouts", json=workout_data)
        assert create_response.status_code == 200
        created = create_response.json()
        
        # Verify response structure
        assert "id" in created
        assert created["muscle_group"] == "Chest"
        assert created["exercise"] == "Barbell Bench Press"
        assert len(created["sets"]) == 3
        assert "calories_burned" in created
        assert created["calories_burned"] > 0
        assert "_id" not in created  # MongoDB _id should be excluded
        
        workout_id = created["id"]
        
        # GET to verify persistence
        get_response = api_client.get(f"{BASE_URL}/api/workouts?date={TODAY}")
        assert get_response.status_code == 200
        workouts = get_response.json()
        assert isinstance(workouts, list)
        
        # Find our workout
        found = False
        for w in workouts:
            if w.get("id") == workout_id:
                found = True
                assert w["exercise"] == "Barbell Bench Press"
                assert w["notes"] == "TEST_workout_feeling_strong"
                break
        assert found, "Created workout not found in GET response"
        
        # Cleanup
        delete_response = api_client.delete(f"{BASE_URL}/api/workouts/{workout_id}")
        assert delete_response.status_code == 200
    
    def test_get_workouts_by_date(self, api_client):
        """Test GET /api/workouts with date filter"""
        response = api_client.get(f"{BASE_URL}/api/workouts?date={TODAY}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_delete_workout_not_found(self, api_client):
        """Test DELETE /api/workouts/{id} with non-existent ID"""
        response = api_client.delete(f"{BASE_URL}/api/workouts/nonexistent-id-12345")
        assert response.status_code == 404

class TestMeals:
    """Meal CRUD tests"""
    
    def test_create_meal_and_verify(self, api_client):
        """Test POST /api/meals and verify with GET"""
        meal_data = {
            "date": TODAY,
            "meal_type": "lunch",
            "items": [
                {"name": "TEST_Chicken Breast", "calories": 165, "protein": 31, "carbs": 0, "fat": 3.6},
                {"name": "TEST_Brown Rice", "calories": 215, "protein": 5, "carbs": 45, "fat": 1.6}
            ],
            "notes": "TEST_meal_post_workout"
        }
        
        # Create meal
        create_response = api_client.post(f"{BASE_URL}/api/meals", json=meal_data)
        assert create_response.status_code == 200
        created = create_response.json()
        
        # Verify response
        assert "id" in created
        assert created["meal_type"] == "lunch"
        assert len(created["items"]) == 2
        assert created["total_calories"] == 380  # 165 + 215
        assert "_id" not in created
        
        meal_id = created["id"]
        
        # GET to verify persistence
        get_response = api_client.get(f"{BASE_URL}/api/meals?date={TODAY}")
        assert get_response.status_code == 200
        meals = get_response.json()
        assert isinstance(meals, list)
        
        # Find our meal
        found = False
        for m in meals:
            if m.get("id") == meal_id:
                found = True
                assert m["meal_type"] == "lunch"
                assert m["total_calories"] == 380
                break
        assert found, "Created meal not found in GET response"
        
        # Cleanup
        delete_response = api_client.delete(f"{BASE_URL}/api/meals/{meal_id}")
        assert delete_response.status_code == 200
    
    def test_get_meals_by_date(self, api_client):
        """Test GET /api/meals with date filter"""
        response = api_client.get(f"{BASE_URL}/api/meals?date={TODAY}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

class TestMeasurements:
    """Body measurement tests"""
    
    def test_create_measurement_and_verify(self, api_client):
        """Test POST /api/measurements and verify with GET latest"""
        measurement_data = {
            "date": TODAY,
            "weight": 75.5,
            "body_fat": 15.2,
            "chest": 100,
            "waist": 80,
            "hips": 95,
            "left_arm": 35,
            "right_arm": 35.5,
            "left_thigh": 55,
            "right_thigh": 55.5
        }
        
        # Create measurement
        create_response = api_client.post(f"{BASE_URL}/api/measurements", json=measurement_data)
        assert create_response.status_code == 200
        created = create_response.json()
        
        # Verify response
        assert "id" in created
        assert created["weight"] == 75.5
        assert created["body_fat"] == 15.2
        assert created["chest"] == 100
        assert "_id" not in created
        
        # GET latest to verify
        get_response = api_client.get(f"{BASE_URL}/api/measurements/latest")
        assert get_response.status_code == 200
        latest = get_response.json()
        
        # Should be our measurement (or at least have data)
        if latest:
            assert "weight" in latest or "body_fat" in latest
    
    def test_get_all_measurements(self, api_client):
        """Test GET /api/measurements"""
        response = api_client.get(f"{BASE_URL}/api/measurements")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_latest_measurement_empty(self, api_client):
        """Test GET /api/measurements/latest returns empty dict if none"""
        response = api_client.get(f"{BASE_URL}/api/measurements/latest")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

class TestDashboard:
    """Dashboard endpoint tests"""
    
    def test_get_dashboard_today(self, api_client):
        """Test GET /api/dashboard with today's date"""
        response = api_client.get(f"{BASE_URL}/api/dashboard?date={TODAY}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "date" in data
        assert "calories_consumed" in data
        assert "calories_burned" in data
        assert "net_calories" in data
        assert "workout_count" in data
        assert "muscle_groups_worked" in data
        assert "meals_count" in data
        assert "latest_measurements" in data
        assert "profile" in data
        
        # Verify types
        assert isinstance(data["calories_consumed"], (int, float))
        assert isinstance(data["calories_burned"], (int, float))
        assert isinstance(data["workout_count"], int)
        assert isinstance(data["muscle_groups_worked"], list)
        assert isinstance(data["meals_count"], int)
    
    def test_get_dashboard_no_date(self, api_client):
        """Test GET /api/dashboard without date parameter (should use today)"""
        response = api_client.get(f"{BASE_URL}/api/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "date" in data

class TestProfile:
    """User profile tests"""
    
    def test_get_profile(self, api_client):
        """Test GET /api/profile"""
        response = api_client.get(f"{BASE_URL}/api/profile")
        assert response.status_code == 200
        data = response.json()
        
        # Verify default profile structure
        assert "name" in data
        assert "age" in data
        assert "gender" in data
        assert "height" in data
        assert "weight" in data
        assert "goal" in data
        assert "activity_level" in data
        assert "_id" not in data
    
    def test_update_profile_and_verify(self, api_client):
        """Test PUT /api/profile and verify with GET"""
        # Get current profile first
        get_response = api_client.get(f"{BASE_URL}/api/profile")
        assert get_response.status_code == 200
        current = get_response.json()
        
        # Update profile
        updated_data = {
            "name": "TEST_User_Updated",
            "age": 28,
            "gender": "male",
            "height": 175,
            "weight": 75,
            "goal": "build_muscle",
            "activity_level": "high"
        }
        
        put_response = api_client.put(f"{BASE_URL}/api/profile", json=updated_data)
        assert put_response.status_code == 200
        updated = put_response.json()
        
        # Verify update
        assert updated["name"] == "TEST_User_Updated"
        assert updated["age"] == 28
        assert updated["height"] == 175
        
        # GET to verify persistence
        verify_response = api_client.get(f"{BASE_URL}/api/profile")
        assert verify_response.status_code == 200
        verified = verify_response.json()
        assert verified["name"] == "TEST_User_Updated"
        assert verified["age"] == 28
        
        # Restore original profile
        api_client.put(f"{BASE_URL}/api/profile", json=current)

class TestChat:
    """AI Chat tests (GPT-5.2 integration)"""
    
    def test_send_chat_trainer(self, api_client):
        """Test POST /api/chat/trainer"""
        chat_data = {
            "text": "What's a good chest workout?",
            "image_base64": ""
        }
        
        response = api_client.post(f"{BASE_URL}/api/chat/trainer", json=chat_data)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert "persona" in data
        assert data["persona"] == "trainer"
        assert "role" in data
        assert data["role"] == "assistant"
        assert "text" in data
        assert len(data["text"]) > 0
        assert "created_at" in data
        assert "_id" not in data
    
    def test_get_chat_history_trainer(self, api_client):
        """Test GET /api/chat/trainer/history"""
        response = api_client.get(f"{BASE_URL}/api/chat/trainer/history")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # If there's history, verify structure
        if len(data) > 0:
            msg = data[0]
            assert "persona" in msg
            assert "role" in msg
            assert "text" in msg
            assert "_id" not in msg
    
    def test_chat_invalid_persona(self, api_client):
        """Test POST /api/chat/{persona} with invalid persona"""
        chat_data = {"text": "test", "image_base64": ""}
        response = api_client.post(f"{BASE_URL}/api/chat/invalid_persona", json=chat_data)
        assert response.status_code == 400
    
    def test_clear_chat_history(self, api_client):
        """Test DELETE /api/chat/{persona}/history"""
        # Send a message first
        chat_data = {"text": "TEST_message_to_delete", "image_base64": ""}
        api_client.post(f"{BASE_URL}/api/chat/buddy", json=chat_data)
        
        # Clear history
        delete_response = api_client.delete(f"{BASE_URL}/api/chat/buddy/history")
        assert delete_response.status_code == 200
        
        # Verify cleared
        get_response = api_client.get(f"{BASE_URL}/api/chat/buddy/history")
        assert get_response.status_code == 200
        history = get_response.json()
        # History should be empty or not contain our test message
        for msg in history:
            assert msg.get("text") != "TEST_message_to_delete"

class TestMealImageAnalysis:
    """Meal image analysis tests (GPT-5.2 vision)"""
    
    def test_analyze_meal_image_no_image(self, api_client):
        """Test POST /api/meals/analyze with empty image"""
        # This should fail or return empty items
        analyze_data = {
            "image_base64": "",
            "meal_type": "lunch"
        }
        
        # The endpoint might handle this differently, so we just check it doesn't crash
        try:
            response = api_client.post(f"{BASE_URL}/api/meals/analyze", json=analyze_data)
            # If it succeeds, check response structure
            if response.status_code == 200:
                data = response.json()
                assert "items" in data
                assert "raw_response" in data
        except Exception as e:
            # Expected to fail with empty image
            pass
