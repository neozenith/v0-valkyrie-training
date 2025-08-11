# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "click>=8.0.0",
# ]
# ///

import argparse
import json
import logging
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

log = logging.getLogger(__name__)

# Configuration
SCRIPT_DIR = Path(__file__).parent.resolve()
ROOT_DIR = SCRIPT_DIR.parent
DATA_DIR = ROOT_DIR / "data"
TMP_DIR = ROOT_DIR / "tmp"
CACHE_DIR = TMP_DIR / "claude_cache"
FREE_EXERCISE_DB_DIR = TMP_DIR / "free-exercise-db" / "exercises"

# Cache paths and timeouts
MIGRATION_PLAN_PATH = CACHE_DIR / "process_exercise_migration_plan" / "migration-plan.json"
MAPPING_TABLES_PATH = CACHE_DIR / "process_exercise_migration_plan" / "mapping-tables.json"
CACHE_TIMEOUT = 300  # 5 minutes

# Data paths
CATALOG_PATH = DATA_DIR / "exercises-catalog.json"
RELATIONSHIPS_PATH = DATA_DIR / "exercise-relationships.json"

# Output paths
OUTPUT_CACHE_DIR = CACHE_DIR / "migrate_exercise_catalog_data"
MIGRATION_REPORT_PATH = OUTPUT_CACHE_DIR / "migration-report.json"


class ExerciseMigrator:
    """Handles migration of exercises from free-exercise-db to our catalog format."""
    
    def __init__(self):
        self.migration_plan: Dict[str, Any] = {}
        self.mapping_tables: Dict[str, Any] = {}
        self.existing_catalog: Dict[str, Any] = {}
        self.existing_relationships: Dict[str, Any] = {}
        self.existing_ids: Set[str] = set()
        self.migration_stats = {
            "total_processed": 0,
            "new_exercises_added": 0,
            "skipped_duplicates": 0,
            "data_quality_issues": [],
            "failed_migrations": []
        }

    def load_data(self) -> None:
        """Load all required data files."""
        log.info("Loading migration plan and mapping tables")
        
        if not MIGRATION_PLAN_PATH.exists():
            raise FileNotFoundError(f"Migration plan not found at {MIGRATION_PLAN_PATH}")
        
        if not MAPPING_TABLES_PATH.exists():
            raise FileNotFoundError(f"Mapping tables not found at {MAPPING_TABLES_PATH}")
            
        self.migration_plan = json.loads(MIGRATION_PLAN_PATH.read_text(encoding="utf-8"))
        self.mapping_tables = json.loads(MAPPING_TABLES_PATH.read_text(encoding="utf-8"))
        
        log.info("Loading existing catalog and relationships")
        if CATALOG_PATH.exists():
            self.existing_catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
            self.existing_ids = set(self.existing_catalog.get("exercises", {}).keys())
        else:
            self.existing_catalog = {"exercises": {}}
            
        if RELATIONSHIPS_PATH.exists():
            self.existing_relationships = json.loads(RELATIONSHIPS_PATH.read_text(encoding="utf-8"))
        else:
            self.existing_relationships = {"relationships": []}

    def slugify_name(self, name: str) -> str:
        """Convert exercise name to slug format."""
        # Convert to lowercase and replace spaces/special chars with hyphens
        slug = re.sub(r'[^\w\s-]', '', name.lower())
        slug = re.sub(r'[-\s]+', '-', slug)
        return slug.strip('-')

    def generate_unique_id(self, name: str) -> str:
        """Generate unique ID with conflict resolution."""
        base_slug = self.slugify_name(name)
        
        if base_slug not in self.existing_ids:
            return base_slug
            
        # Add numeric suffix for conflicts
        counter = 2
        while f"{base_slug}-{counter}" in self.existing_ids:
            counter += 1
            
        return f"{base_slug}-{counter}"

    def map_equipment(self, equipment: Optional[str]) -> List[str]:
        """Map equipment using mapping table."""
        if equipment is None:
            equipment = "null"
            
        equipment_mapping = self.mapping_tables["equipment_mapping"]["mappings"]
        return equipment_mapping.get(equipment, ["bodyweight"])

    def map_muscles(self, primary_muscles: List[str], secondary_muscles: List[str]) -> List[str]:
        """Combine and map muscle groups."""
        muscle_mapping = self.mapping_tables["muscle_mapping"]["mappings"]
        all_muscles = set()
        
        # Process primary muscles
        for muscle in primary_muscles:
            mapped_muscles = muscle_mapping.get(muscle, [muscle])
            all_muscles.update(mapped_muscles)
            
        # Process secondary muscles
        for muscle in secondary_muscles:
            mapped_muscles = muscle_mapping.get(muscle, [muscle])
            all_muscles.update(mapped_muscles)
            
        return sorted(list(all_muscles))

    def map_difficulty(self, level: str) -> float:
        """Map level to difficulty score."""
        level_mapping = self.mapping_tables["level_to_difficulty"]["mappings"]
        return level_mapping.get(level, 5.0)  # Default to intermediate

    def convert_instructions_to_cues(self, instructions: List[str]) -> List[str]:
        """Convert detailed instructions to concise cues (max 4-5 cues)."""
        if not instructions:
            return []
            
        # Take first instruction and split into sentences
        first_instruction = instructions[0] if instructions else ""
        
        # Split by periods and clean up
        sentences = [s.strip() for s in first_instruction.split('.') if s.strip()]
        
        # Take up to 4 sentences as cues, prioritize shorter ones
        cues = []
        for sentence in sentences[:4]:
            if len(sentence) > 100:  # Too long, try to split further
                # Split by commas or semicolons
                sub_parts = [p.strip() for p in re.split(r'[,;]', sentence) if p.strip()]
                cues.extend(sub_parts[:2])  # Take first 2 parts
            else:
                cues.append(sentence)
                
            if len(cues) >= 4:
                break
                
        # Ensure sentences end with periods
        cues = [cue if cue.endswith('.') else f"{cue}." for cue in cues]
        
        return cues[:4]  # Limit to 4 cues max

    def migrate_exercise(self, source_exercise: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Convert a single exercise from source to target format."""
        try:
            name = source_exercise.get("name", "").strip()
            if not name:
                self.migration_stats["data_quality_issues"].append("Exercise missing name")
                return None
                
            # Generate unique ID
            exercise_id = self.generate_unique_id(name)
            
            # Check if already exists by name similarity (to avoid near-duplicates)
            for existing_id, existing_exercise in self.existing_catalog.get("exercises", {}).items():
                existing_name = existing_exercise.get("name", "").lower()
                if existing_name == name.lower():
                    self.migration_stats["skipped_duplicates"] += 1
                    log.info(f"Skipping duplicate exercise: '{name}' matches existing '{existing_exercise.get('name', '')}'")
                    return None
            
            # Map fields according to migration plan
            equipment = self.map_equipment(source_exercise.get("equipment"))
            
            primary_muscles = source_exercise.get("primaryMuscles", [])
            secondary_muscles = source_exercise.get("secondaryMuscles", [])
            target_muscles = self.map_muscles(primary_muscles, secondary_muscles)
            
            instructions = source_exercise.get("instructions", [])
            cues = self.convert_instructions_to_cues(instructions)
            
            level = source_exercise.get("level", "intermediate")
            difficulty = self.map_difficulty(level)
            
            # Build target exercise
            target_exercise = {
                "name": name,
                "equipment": equipment,
                "targetMuscles": target_muscles,
                "cues": cues,
                "difficulty": difficulty,
                "progressions": [],
                "regressions": [],
                "warmup": []
            }
            
            # Add to existing IDs to prevent conflicts
            self.existing_ids.add(exercise_id)
            
            return target_exercise
            
        except Exception as e:
            error_msg = f"Failed to migrate exercise '{source_exercise.get('name', 'unknown')}': {str(e)}"
            self.migration_stats["failed_migrations"].append(error_msg)
            log.error(error_msg)
            return None

    def load_source_exercises(self) -> List[Dict[str, Any]]:
        """Load all exercises from free-exercise-db."""
        if not FREE_EXERCISE_DB_DIR.exists():
            raise FileNotFoundError(f"Free exercise database not found at {FREE_EXERCISE_DB_DIR}")
            
        exercises = []
        exercise_files = list(FREE_EXERCISE_DB_DIR.glob("*.json"))
        
        log.info(f"Loading {len(exercise_files)} exercise files")
        
        for file_path in exercise_files:
            try:
                exercise_data = json.loads(file_path.read_text(encoding="utf-8"))
                exercises.append(exercise_data)
            except Exception as e:
                error_msg = f"Failed to load exercise file {file_path.name}: {str(e)}"
                self.migration_stats["data_quality_issues"].append(error_msg)
                log.warning(error_msg)
                
        return exercises

    def migrate_exercises(self) -> None:
        """Process and migrate all exercises."""
        log.info("Starting exercise migration")
        
        source_exercises = self.load_source_exercises()
        self.migration_stats["total_processed"] = len(source_exercises)
        
        migrated_exercises = {}
        
        for source_exercise in source_exercises:
            target_exercise = self.migrate_exercise(source_exercise)
            if target_exercise:
                exercise_id = self.generate_unique_id(source_exercise["name"])
                migrated_exercises[exercise_id] = target_exercise
                self.migration_stats["new_exercises_added"] += 1
                
        # Merge with existing catalog
        if "exercises" not in self.existing_catalog:
            self.existing_catalog["exercises"] = {}
            
        self.existing_catalog["exercises"].update(migrated_exercises)
        
        log.info(f"Migration completed: {self.migration_stats['new_exercises_added']} new exercises added")

    def save_catalog(self) -> None:
        """Save updated catalog to file."""
        log.info("Saving updated exercise catalog")
        
        # Ensure data directory exists
        DATA_DIR.mkdir(exist_ok=True)
        
        # Write catalog
        CATALOG_PATH.write_text(
            json.dumps(self.existing_catalog, indent=2, ensure_ascii=False),
            encoding="utf-8"
        )
        
        log.info(f"Catalog saved to {CATALOG_PATH}")

    def generate_migration_report(self) -> Dict[str, Any]:
        """Generate comprehensive migration report."""
        report = {
            "migration_timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "source_data": {
                "migration_plan_file": str(MIGRATION_PLAN_PATH),
                "mapping_tables_file": str(MAPPING_TABLES_PATH),
                "source_exercises_dir": str(FREE_EXERCISE_DB_DIR)
            },
            "statistics": self.migration_stats,
            "data_quality": {
                "total_issues": len(self.migration_stats["data_quality_issues"]),
                "failed_migrations": len(self.migration_stats["failed_migrations"]),
                "success_rate": (
                    (self.migration_stats["new_exercises_added"] / 
                     max(1, self.migration_stats["total_processed"])) * 100
                ),
            },
            "output_files": {
                "catalog_file": str(CATALOG_PATH),
                "relationships_file": str(RELATIONSHIPS_PATH)
            }
        }
        
        return report

    def save_migration_report(self, report: Dict[str, Any]) -> None:
        """Save migration report to cache directory."""
        OUTPUT_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        
        MIGRATION_REPORT_PATH.write_text(
            json.dumps(report, indent=2, ensure_ascii=False),
            encoding="utf-8"
        )
        
        log.info(f"Migration report saved to {MIGRATION_REPORT_PATH}")

    def print_migration_summary(self, report: Dict[str, Any]) -> None:
        """Print summary of migration results."""
        stats = self.migration_stats
        
        print(f"\n{'='*60}")
        print("EXERCISE CATALOG MIGRATION SUMMARY")
        print(f"{'='*60}")
        print(f"Total exercises processed: {stats['total_processed']}")
        print(f"New exercises added: {stats['new_exercises_added']}")
        print(f"Skipped duplicates: {stats['skipped_duplicates']}")
        print(f"Failed migrations: {len(stats['failed_migrations'])}")
        print(f"Data quality issues: {len(stats['data_quality_issues'])}")
        print(f"Success rate: {report['data_quality']['success_rate']:.1f}%")
        print(f"\nCatalog saved to: {CATALOG_PATH}")
        print(f"Migration report: {MIGRATION_REPORT_PATH}")
        
        if stats['data_quality_issues']:
            print(f"\nData Quality Issues ({len(stats['data_quality_issues'])}):")
            for issue in stats['data_quality_issues'][:5]:  # Show first 5
                print(f"  - {issue}")
            if len(stats['data_quality_issues']) > 5:
                print(f"  ... and {len(stats['data_quality_issues']) - 5} more")
                
        if stats['failed_migrations']:
            print(f"\nFailed Migrations ({len(stats['failed_migrations'])}):")
            for failure in stats['failed_migrations'][:3]:  # Show first 3
                print(f"  - {failure}")
            if len(stats['failed_migrations']) > 3:
                print(f"  ... and {len(stats['failed_migrations']) - 3} more")

    def run(self) -> None:
        """Execute the complete migration process."""
        try:
            self.load_data()
            self.migrate_exercises()
            self.save_catalog()
            
            report = self.generate_migration_report()
            self.save_migration_report(report)
            self.print_migration_summary(report)
            
        except Exception as e:
            log.error(f"Migration failed: {str(e)}")
            raise


def main():
    """Main entry point."""
    migrator = ExerciseMigrator()
    migrator.run()


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s|%(name)s|%(levelname)s|%(filename)s:%(lineno)d - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    parser = argparse.ArgumentParser(
        description="Migrate exercises from free-exercise-db to our catalog format. "
        "Loads migration plan and mapping tables, processes all source exercises, "
        "converts fields according to mappings, generates unique IDs, merges with "
        "existing catalog, and creates detailed migration report."
    )
    args = parser.parse_args()
    
    main()