from emergentintegrations.llm.chat import LlmChat, UserMessage
import os
from typing import List, Dict
import json
import random

class AIPersonalizationService:
    """AI service for personalized learning content generation and difficulty adjustment."""
    
    def __init__(self):
        self.api_key = os.environ.get("EMERGENT_LLM_KEY")
        
    async def generate_math_activities(
        self, 
        activity_type: str, 
        difficulty_level: int,
        age_group: str,
        count: int = 5,
        child_performance: Dict = None
    ) -> List[Dict]:
        """Generate personalized math activities using AI."""
        
        # Create session for AI chat
        session_id = f"math_gen_{random.randint(1000, 9999)}"
        
        system_message = f"""You are an expert early childhood education specialist creating fun, engaging math activities for preschool children aged 4-5.

Create activities that are:
- Age-appropriate and fun
- Encouraging and positive
- Gradually increasing in difficulty
- Aligned with early math standards
- Engaging with relatable contexts (toys, animals, snacks)

Format your response as a JSON array of activities with this structure:
[
  {{
    "activity_type": "{activity_type}",
    "question_text": "Fun question text",
    "question_data": {{"numbers": [1, 2], "context": "apples"}},
    "correct_answer": "3",
    "difficulty_level": {difficulty_level},
    "age_group": "{age_group}",
    "hints": ["Helpful hint 1", "Helpful hint 2"]
  }}
]

Activity types:
- counting: Count objects (1-10)
- number_recognition: Identify numbers
- shapes: Identify basic shapes
- simple_addition: Add numbers 1-5
- patterns: Complete simple patterns"""

        performance_context = ""
        if child_performance:
            performance_context = f"\n\nChild's recent performance: {child_performance.get('success_rate', 50)}% success rate. Adjust difficulty accordingly."

        user_prompt = f"""Generate {count} engaging {activity_type} activities at difficulty level {difficulty_level} (1-5 scale) for {age_group} children.{performance_context}

Make them fun, colorful, and encouraging. Use contexts like animals, toys, fruits, or everyday objects that preschoolers love.

Return ONLY the JSON array, no other text."""

        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=session_id,
                system_message=system_message
            ).with_model("openai", "gpt-4o-mini")
            
            user_message = UserMessage(text=user_prompt)
            response = await chat.send_message(user_message)
            
            # Parse JSON response
            activities = json.loads(response.strip())
            return activities
            
        except Exception as e:
            print(f"AI generation error: {e}")
            # Fallback to template-based activities
            return self._generate_fallback_activities(activity_type, difficulty_level, age_group, count)
    
    def _generate_fallback_activities(self, activity_type: str, difficulty: int, age_group: str, count: int) -> List[Dict]:
        """Generate template-based activities as fallback."""
        activities = []
        
        if activity_type == "counting":
            contexts = ["apples", "stars", "balloons", "teddy bears", "cookies"]
            for i in range(count):
                num = min(difficulty * 2, 10)
                context = random.choice(contexts)
                activities.append({
                    "activity_type": "counting",
                    "question_text": f"Count the {context}! How many are there?",
                    "question_data": {"count": num, "context": context},
                    "correct_answer": str(num),
                    "difficulty_level": difficulty,
                    "age_group": age_group,
                    "hints": [
                        f"Try pointing to each {context} as you count!",
                        "Count slowly and carefully!"
                    ]
                })
        
        elif activity_type == "number_recognition":
            for i in range(count):
                num = random.randint(1, min(difficulty * 2, 10))
                activities.append({
                    "activity_type": "number_recognition",
                    "question_text": f"Which number is this?",
                    "question_data": {"number": num, "options": [num, num+1, num-1, num+2]},
                    "correct_answer": str(num),
                    "difficulty_level": difficulty,
                    "age_group": age_group,
                    "hints": ["Look at the number carefully!", "You can do it!"]
                })
        
        elif activity_type == "shapes":
            shapes = ["circle", "square", "triangle", "rectangle", "star"][:difficulty]
            for i in range(count):
                shape = random.choice(shapes)
                activities.append({
                    "activity_type": "shapes",
                    "question_text": f"Find the {shape}!",
                    "question_data": {"shape": shape, "options": random.sample(shapes, min(4, len(shapes)))},
                    "correct_answer": shape,
                    "difficulty_level": difficulty,
                    "age_group": age_group,
                    "hints": [f"A {shape} looks like...", "Look for the special shape!"]
                })
        
        return activities
    
    async def generate_encouragement(self, score: int, total: int, difficulty: int) -> str:
        """Generate personalized encouragement message."""
        
        percentage = (score / total * 100) if total > 0 else 0
        
        if percentage >= 90:
            messages = [
                "🌟 WOW! You're a SUPER HERO! Amazing work!",
                "🎉 Incredible! You're absolutely brilliant!",
                "⭐ Outstanding! You're a learning champion!",
                "🏆 Perfect! You're doing AMAZING!"
            ]
        elif percentage >= 70:
            messages = [
                "🎈 Great job! You're doing so well!",
                "😊 Wonderful! Keep up the great work!",
                "🌈 Fantastic! You're learning so fast!",
                "✨ Excellent! You're a star!"
            ]
        elif percentage >= 50:
            messages = [
                "💪 Good try! You're getting better!",
                "🌟 Nice effort! Keep practicing!",
                "🎯 You're doing well! Keep going!",
                "⭐ Good work! You're improving!"
            ]
        else:
            messages = [
                "🌈 Great effort! Let's try again!",
                "💫 You're learning! That's what matters!",
                "🌟 Keep trying! You're doing great!",
                "✨ Every try makes you stronger!"
            ]
        
        return random.choice(messages)
    
    async def adjust_difficulty(self, child_id: str, recent_performance: List[Dict]) -> int:
        """Adjust difficulty level based on recent performance."""
        
        if not recent_performance:
            return 1
        
        # Calculate average success rate from recent sessions
        total_correct = sum(s.get("correct_answers", 0) for s in recent_performance)
        total_questions = sum(s.get("total_questions", 1) for s in recent_performance)
        success_rate = total_correct / total_questions if total_questions > 0 else 0.5
        
        current_difficulty = recent_performance[-1].get("difficulty_level", 1)
        
        # Adjust difficulty based on performance
        if success_rate >= 0.85:
            # High success - increase difficulty
            return min(current_difficulty + 1, 5)
        elif success_rate <= 0.50:
            # Low success - decrease difficulty
            return max(current_difficulty - 1, 1)
        else:
            # Good balance - maintain difficulty
            return current_difficulty