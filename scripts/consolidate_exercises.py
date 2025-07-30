#!/usr/bin/env python3
"""
Consolidate all unique exercises from multiple data files into a single catalog.
"""

import json
from pathlib import Path

def main():
    # Set up paths
    data_path = Path(__file__).parent.parent / "data"
    exercises_file = data_path / "exercises.json"
    catalog_file = data_path / "exercises-catalog.json"
    relationships_file = data_path / "exercise-relationships.json"
    
    # Load all data files
    with open(exercises_file, 'r') as f:
        exercises_old = json.load(f)
    with open(catalog_file, 'r') as f:
        catalog = json.load(f)
    with open(relationships_file, 'r') as f:
        relationships = json.load(f)
    
    print("=== ANALYSIS ===")
    print(f"Exercises in old format: {len(exercises_old['exercises'])}")
    print(f"Exercises in catalog: {len(catalog['exercises'])}")
    print(f"Exercises in relationships: {len(relationships['relationships'])}")
    
    # Extract all unique exercise IDs
    all_exercise_ids = set()
    
    # From old exercises (array format)
    old_ids = set()
    for ex in exercises_old['exercises']:
        all_exercise_ids.add(ex['id'])
        old_ids.add(ex['id'])
    
    # From catalog (dict format) 
    catalog_ids = set(catalog['exercises'].keys())
    all_exercise_ids.update(catalog_ids)
    
    # From relationships
    relationship_ids = set(relationships['relationships'].keys())
    all_exercise_ids.update(relationship_ids)
    
    # From relationship targets
    relationship_target_ids = set()
    for exercise_id, relations in relationships['relationships'].items():
        if 'regressions' in relations:
            for reg in relations['regressions']:
                all_exercise_ids.add(reg['exerciseId'])
                relationship_target_ids.add(reg['exerciseId'])
        if 'progressions' in relations:
            for prog in relations['progressions']:
                all_exercise_ids.add(prog['exerciseId'])
                relationship_target_ids.add(prog['exerciseId'])
    
    print(f"\nTotal unique exercise IDs found: {len(all_exercise_ids)}")
    
    # Analyze overlaps
    old_catalog_overlap = old_ids.intersection(catalog_ids)
    print(f"Overlap between old and catalog: {len(old_catalog_overlap)}")
    print(f"Only in old format: {len(old_ids - catalog_ids)}")
    print(f"Only in catalog: {len(catalog_ids - old_ids)}")
    print(f"Only in relationships: {len(relationship_ids - old_ids - catalog_ids)}")
    print(f"Relationship targets not in any exercise file: {len(relationship_target_ids - old_ids - catalog_ids)}")
    
    # Build consolidated catalog
    consolidated_exercises = {}
    missing_exercises = []
    
    # Start with exercises from catalog (these have the cleanest format)
    for exercise_id, exercise_data in catalog['exercises'].items():
        consolidated_exercises[exercise_id] = exercise_data
    
    # Add exercises from old format that aren't in catalog
    for ex in exercises_old['exercises']:
        if ex['id'] not in consolidated_exercises:
            # Convert from old format to catalog format
            consolidated_exercises[ex['id']] = {
                "name": ex['name'],
                "equipment": ex['equipment'],
                "targetMuscles": ex['targetMuscles'],
                "cues": ex['cues']
            }
    
    # Check for missing exercises referenced in relationships
    for exercise_id in all_exercise_ids:
        if exercise_id not in consolidated_exercises:
            missing_exercises.append(exercise_id)
    
    if missing_exercises:
        print(f"\n=== MISSING EXERCISES ===")
        print(f"Found {len(missing_exercises)} exercises referenced in relationships but not defined:")
        for ex_id in sorted(missing_exercises):
            print(f"  - {ex_id}")
    
    # Create consolidated catalog
    consolidated_catalog = {
        "exercises": consolidated_exercises
    }
    
    print(f"\n=== CONSOLIDATION RESULTS ===")
    print(f"Total exercises in consolidated catalog: {len(consolidated_exercises)}")
    print(f"Missing exercises that need to be added: {len(missing_exercises)}")
    
    # Save consolidated catalog
    output_file = data_path / "exercises-catalog-consolidated.json"
    with open(output_file, 'w') as f:
        json.dump(consolidated_catalog, f, indent=2)
    
    print(f"\nConsolidated catalog saved to: {output_file}")
    
    # Validate relationships
    print(f"\n=== RELATIONSHIP VALIDATION ===")
    invalid_relationships = []
    for exercise_id, relations in relationships['relationships'].items():
        if exercise_id not in consolidated_exercises:
            invalid_relationships.append(f"Source: {exercise_id}")
        
        if 'regressions' in relations:
            for reg in relations['regressions']:
                if reg['exerciseId'] not in consolidated_exercises:
                    invalid_relationships.append(f"Regression target: {reg['exerciseId']}")
        
        if 'progressions' in relations:
            for prog in relations['progressions']:
                if prog['exerciseId'] not in consolidated_exercises:
                    invalid_relationships.append(f"Progression target: {prog['exerciseId']}")
    
    if invalid_relationships:
        print(f"Found {len(invalid_relationships)} invalid relationship references:")
        for invalid in sorted(set(invalid_relationships)):
            print(f"  - {invalid}")
    else:
        print("All relationship references are valid!")

if __name__ == "__main__":
    main()