#!/usr/bin/env python3
"""
Generate missing exercise definitions based on exercise names and patterns.
"""

import json
from pathlib import Path
import re

def infer_equipment(exercise_name):
    """Infer equipment based on exercise name patterns."""
    name_lower = exercise_name.lower()
    
    if any(word in name_lower for word in ['barbell', 'deadlift', 'squat', 'press', 'row', 'jerk']):
        if 'dumbbell' not in name_lower and 'kettlebell' not in name_lower:
            return ['barbell']
    
    if 'dumbbell' in name_lower:
        return ['dumbbells']
    
    if 'kettlebell' in name_lower:
        return ['kettlebells']
    
    if any(word in name_lower for word in ['pull-up', 'chin-up', 'hanging', 'muscle-up']):
        return ['pull-up-bar']
    
    if 'ring' in name_lower:
        return ['rings']
    
    if 'parallette' in name_lower:
        return ['parallettes']
    
    if any(word in name_lower for word in ['landmine']):
        return ['barbell', 'landmine']
    
    if any(word in name_lower for word in ['band', 'pull-apart']):
        return ['resistance-bands']
    
    if any(word in name_lower for word in ['bench', 'incline', 'decline']) and 'push' not in name_lower:
        return ['bench']
    
    if 'wall' in name_lower:
        return ['wall']
    
    if 'box' in name_lower or 'step' in name_lower:
        return ['bench']
    
    # Default to bodyweight
    return ['bodyweight']

def infer_target_muscles(exercise_name):
    """Infer target muscles based on exercise name patterns."""
    name_lower = exercise_name.lower()
    muscles = []
    
    # Upper body patterns
    if any(word in name_lower for word in ['push-up', 'press', 'dip']):
        muscles.extend(['chest', 'shoulders', 'triceps'])
    elif any(word in name_lower for word in ['pull-up', 'chin-up', 'row', 'lever']):
        muscles.extend(['back', 'biceps'])
    elif 'curl' in name_lower:
        muscles.extend(['biceps', 'forearms'])
    elif any(word in name_lower for word in ['shoulder', 'overhead']):
        muscles.extend(['shoulders', 'triceps'])
    
    # Lower body patterns
    if any(word in name_lower for word in ['squat', 'lunge', 'pistol']):
        muscles.extend(['quadriceps', 'glutes', 'hamstrings'])
    elif any(word in name_lower for word in ['deadlift', 'hip']):
        muscles.extend(['hamstrings', 'glutes', 'back'])
    elif 'calf' in name_lower:
        muscles.extend(['calves'])
    
    # Core patterns
    if any(word in name_lower for word in ['plank', 'hollow', 'flag', 'l-sit', 'v-sit', 'dead-bug', 'bird-dog']):
        muscles.extend(['core', 'abs'])
    elif any(word in name_lower for word in ['twist', 'russian', 'oblique']):
        muscles.extend(['core', 'obliques'])
    elif 'mountain-climber' in name_lower:
        muscles.extend(['core', 'cardio', 'shoulders'])
    
    # Full body patterns
    if any(word in name_lower for word in ['burpee', 'turkish', 'get-up', 'thruster']):
        muscles.extend(['full-body', 'core'])
    elif 'muscle-up' in name_lower:
        muscles.extend(['back', 'biceps', 'chest', 'triceps'])
    
    # Back specific
    if 'lat' in name_lower:
        muscles.extend(['lats', 'back'])
    
    # Default if nothing matches
    if not muscles:
        if any(word in name_lower for word in ['push', 'press']):
            muscles.extend(['chest', 'shoulders', 'triceps'])
        elif any(word in name_lower for word in ['pull', 'row']):
            muscles.extend(['back', 'biceps'])
        else:
            muscles.extend(['full-body'])
    
    return list(set(muscles))  # Remove duplicates

def generate_cues(exercise_name, equipment, target_muscles):
    """Generate basic cues based on exercise characteristics."""
    name_lower = exercise_name.lower()
    
    # Format exercise name for display
    display_name = exercise_name.replace('-', ' ').title()
    
    cues = []
    
    # Position and setup cues
    if 'push-up' in name_lower:
        cues.append("Start in a plank position with hands placed appropriately.")
        cues.append("Keep your body in a straight line from head to heels.")
        if 'diamond' in name_lower or 'close' in name_lower:
            cues.append("Place hands close together in a diamond shape.")
        elif 'wide' in name_lower:
            cues.append("Place hands wider than shoulder-width apart.")
        elif 'archer' in name_lower:
            cues.append("Shift weight to one arm while extending the other.")
        cues.append("Lower your chest toward the floor with control.")
        cues.append("Press back up to the starting position.")
    
    elif 'pull-up' in name_lower or 'chin-up' in name_lower:
        cues.append("Hang from the bar with arms fully extended.")
        if 'wide' in name_lower:
            cues.append("Use a wide overhand grip, wider than shoulders.")
        elif 'neutral' in name_lower:
            cues.append("Use a neutral grip with palms facing each other.")
        elif 'chin' in name_lower:
            cues.append("Use an underhand grip with palms facing you.")
        else:
            cues.append("Use an overhand grip slightly wider than shoulders.")
        cues.append("Pull your body up until your chin is over the bar.")
        cues.append("Lower yourself with control to full arm extension.")
    
    elif 'squat' in name_lower:
        cues.append("Stand with feet shoulder-width apart.")
        if 'cossack' in name_lower:
            cues.append("Shift weight to one leg while extending the other leg straight.")
        elif 'pistol' in name_lower:
            cues.append("Balance on one leg with the other leg extended forward.")
        cues.append("Keep your chest up and core engaged.")
        cues.append("Lower yourself by bending at the hips and knees.")
        cues.append("Drive through your heels to return to standing.")
    
    elif 'plank' in name_lower:
        if 'side' in name_lower:
            cues.append("Lie on your side, supporting yourself on your forearm.")
            cues.append("Keep your body in a straight line from head to feet.")
        else:
            cues.append("Position yourself on forearms and toes.")
            cues.append("Maintain a straight line from head to heels.")
        cues.append("Engage your core and breathe steadily.")
        cues.append("Hold the position without letting your hips sag or pike.")
    
    elif 'dead' in name_lower and 'bug' in name_lower:
        cues.append("Lie on your back with arms extended toward the ceiling.")
        cues.append("Lift your legs to 90 degrees at hips and knees.")
        cues.append("Slowly extend opposite arm and leg while keeping your back flat.")
        cues.append("Return to starting position and repeat on the other side.")
    
    elif 'bird' in name_lower and 'dog' in name_lower:
        cues.append("Start on hands and knees in a tabletop position.")
        cues.append("Keep your spine neutral and core engaged.")
        cues.append("Extend opposite arm and leg simultaneously.")
        cues.append("Hold briefly, then return to start and switch sides.")
    
    elif 'muscle-up' in name_lower:
        cues.append("Start from a dead hang on the bar or rings.")
        cues.append("Pull explosively to get your chest above the bar.")
        cues.append("Transition by pressing your body up and over.")
        cues.append("Lower yourself with control back to the starting position.")
    
    elif 'handstand' in name_lower:
        if 'wall' in name_lower:
            cues.append("Place hands on the floor close to a wall.")
            cues.append("Walk your feet up the wall into a handstand position.")
        cues.append("Keep your arms straight and shoulders active.")
        cues.append("Maintain a straight body line throughout the movement.")
        cues.append("Lower yourself with control.")
    
    elif 'lunge' in name_lower:
        cues.append("Step forward or backward into a lunge position.")
        cues.append("Keep your front knee over your ankle.")
        cues.append("Lower until both knees are at 90 degrees.")
        cues.append("Push through your front heel to return to start.")
    
    # Generic cues if none of the above patterns match
    if not cues:
        cues.append(f"Set up in the proper starting position for {display_name}.")
        cues.append("Maintain good form throughout the movement.")
        cues.append("Control the movement in both directions.")
        cues.append("Focus on the target muscles throughout the exercise.")
    
    return cues

def main():
    # Load the consolidated catalog to see what's missing
    data_path = Path(__file__).parent.parent / "data"
    consolidated_file = data_path / "exercises-catalog-consolidated.json"
    relationships_file = data_path / "exercise-relationships.json"
    
    with open(consolidated_file, 'r') as f:
        consolidated = json.load(f)
    
    with open(relationships_file, 'r') as f:
        relationships = json.load(f)
    
    # Get all referenced exercise IDs
    all_referenced_ids = set()
    
    # From relationships keys
    all_referenced_ids.update(relationships['relationships'].keys())
    
    # From relationship targets
    for exercise_id, relations in relationships['relationships'].items():
        if 'regressions' in relations:
            for reg in relations['regressions']:
                all_referenced_ids.add(reg['exerciseId'])
        if 'progressions' in relations:
            for prog in relations['progressions']:
                all_referenced_ids.add(prog['exerciseId'])
    
    # Find missing exercises
    existing_ids = set(consolidated['exercises'].keys())
    missing_ids = all_referenced_ids - existing_ids
    
    print(f"Found {len(missing_ids)} missing exercise definitions")
    
    # Generate missing exercises
    generated_exercises = {}
    for exercise_id in sorted(missing_ids):
        equipment = infer_equipment(exercise_id)
        target_muscles = infer_target_muscles(exercise_id)
        cues = generate_cues(exercise_id, equipment, target_muscles)
        
        # Create display name
        display_name = exercise_id.replace('-', ' ').title()
        
        generated_exercises[exercise_id] = {
            "name": display_name,
            "equipment": equipment,
            "targetMuscles": target_muscles,
            "cues": cues
        }
    
    # Merge with existing exercises
    final_catalog = {
        "exercises": {**consolidated['exercises'], **generated_exercises}
    }
    
    print(f"Final catalog will have {len(final_catalog['exercises'])} exercises")
    
    # Save the final consolidated catalog
    final_file = data_path / "exercises-catalog.json"
    with open(final_file, 'w') as f:
        json.dump(final_catalog, f, indent=2)
    
    print(f"Saved complete catalog to: {final_file}")
    
    # Show some examples of generated exercises
    print(f"\nSample generated exercises:")
    for i, (exercise_id, exercise_data) in enumerate(list(generated_exercises.items())[:5]):
        print(f"\n{i+1}. {exercise_id}:")
        print(f"   Name: {exercise_data['name']}")
        print(f"   Equipment: {exercise_data['equipment']}")
        print(f"   Muscles: {exercise_data['targetMuscles']}")
        print(f"   Cues: {len(exercise_data['cues'])} cues")

if __name__ == "__main__":
    main()