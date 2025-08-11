# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "pathlib",
# ]
# ///

import argparse
import json
import logging
import time
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
import re

# Configuration
SCRIPT_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = SCRIPT_DIR.parent
DATA_DIR = PROJECT_ROOT / "data"
CACHE_DIR = PROJECT_ROOT / "tmp/claude_cache"
FREE_EXERCISE_DB_DIR = PROJECT_ROOT / "tmp/free-exercise-db/exercises"
OUTPUT_DIR = CACHE_DIR / "verify_exercise_migration_results"

# Cache files and timeout (5 minutes)
VERIFICATION_CACHE_TIMEOUT = 300

# Initialize logger
log = logging.getLogger(__name__)


@dataclass
class ExerciseValidationResult:
    """Results for a single exercise validation"""

    source_name: str
    target_id: Optional[str] = None
    found_in_catalog: bool = False
    name_match_type: Optional[str] = None  # exact, normalized, fuzzy, none
    field_validation_errors: List[str] = field(default_factory=list)
    equipment_mapping_valid: bool = True
    muscle_mapping_valid: bool = True
    cues_conversion_valid: bool = True
    difficulty_mapping_valid: bool = True
    data_quality_score: float = 0.0


@dataclass
class MigrationVerificationResults:
    """Complete verification results"""

    timestamp: str
    total_source_exercises: int
    total_catalog_exercises: int
    verification_results: List[ExerciseValidationResult] = field(default_factory=list)
    successfully_migrated: int = 0
    missing_exercises: int = 0
    field_validation_errors: int = 0
    equipment_mapping_issues: int = 0
    muscle_mapping_issues: int = 0
    cues_conversion_issues: int = 0
    difficulty_mapping_issues: int = 0
    overall_success_rate: float = 0.0
    data_quality_metrics: Dict[str, Any] = field(default_factory=dict)


class ExerciseMigrationVerifier:
    """Verifies the migration from free-exercise-db to our catalog"""

    def __init__(self):
        self.catalog_data = None
        self.relationships_data = None
        self.mapping_tables = None
        self.migration_plan = None
        self.source_exercises = {}
        self.verification_results = None

    def load_data(self) -> bool:
        """Load all necessary data files"""
        try:
            # Load current exercise catalog
            catalog_file = DATA_DIR / "exercises-catalog.json"
            if not catalog_file.exists():
                log.error(f"Exercise catalog not found: {catalog_file}")
                return False

            self.catalog_data = json.loads(catalog_file.read_text(encoding="utf-8"))
            log.info(f"Loaded catalog with {len(self.catalog_data.get('exercises', {}))} exercises")

            # Load exercise relationships
            relationships_file = DATA_DIR / "exercise-relationships.json"
            if relationships_file.exists():
                self.relationships_data = json.loads(relationships_file.read_text(encoding="utf-8"))
                log.info("Loaded relationships data")

            # Load mapping tables
            mapping_file = CACHE_DIR / "process_exercise_migration_plan/mapping-tables.json"
            if mapping_file.exists():
                self.mapping_tables = json.loads(mapping_file.read_text(encoding="utf-8"))
                log.info("Loaded mapping tables")
            else:
                log.warning("Mapping tables not found - will skip mapping validation")

            # Load migration plan
            plan_file = CACHE_DIR / "process_exercise_migration_plan/migration-plan.json"
            if plan_file.exists():
                self.migration_plan = json.loads(plan_file.read_text(encoding="utf-8"))
                log.info("Loaded migration plan")

            return True

        except Exception as e:
            log.error(f"Error loading data: {e}")
            return False

    def load_source_exercises(self) -> bool:
        """Load all exercises from free-exercise-db"""
        try:
            if not FREE_EXERCISE_DB_DIR.exists():
                log.error(f"Source exercise directory not found: {FREE_EXERCISE_DB_DIR}")
                return False

            exercise_files = list(FREE_EXERCISE_DB_DIR.glob("*.json"))
            log.info(f"Found {len(exercise_files)} source exercise files")

            for exercise_file in exercise_files:
                try:
                    exercise_data = json.loads(exercise_file.read_text(encoding="utf-8"))
                    if "name" in exercise_data:
                        self.source_exercises[exercise_data["name"]] = exercise_data
                except Exception as e:
                    log.warning(f"Failed to load exercise file {exercise_file}: {e}")

            log.info(f"Loaded {len(self.source_exercises)} source exercises")
            return True

        except Exception as e:
            log.error(f"Error loading source exercises: {e}")
            return False

    def normalize_name(self, name: str) -> str:
        """Normalize exercise name for comparison"""
        # Convert to lowercase, remove special characters, normalize whitespace
        normalized = re.sub(r"[^\w\s-]", "", name.lower())
        normalized = re.sub(r"[-_\s]+", "-", normalized.strip())
        return normalized

    def find_exercise_in_catalog(self, source_name: str) -> Tuple[Optional[str], str]:
        """Find exercise in catalog, return (exercise_id, match_type)"""
        catalog_exercises = self.catalog_data.get("exercises", {})

        # Try exact name match (case-insensitive)
        for exercise_id, exercise_data in catalog_exercises.items():
            if exercise_data.get("name", "").lower() == source_name.lower():
                return exercise_id, "exact"

        # Try normalized name match
        normalized_source = self.normalize_name(source_name)
        for exercise_id, exercise_data in catalog_exercises.items():
            normalized_catalog = self.normalize_name(exercise_data.get("name", ""))
            if normalized_catalog == normalized_source:
                return exercise_id, "normalized"

        # Try fuzzy match (contains or similar)
        for exercise_id, exercise_data in catalog_exercises.items():
            catalog_name = exercise_data.get("name", "").lower()
            source_lower = source_name.lower()

            # Check if one name contains the other (with word boundaries)
            if (len(source_lower) > 5 and source_lower in catalog_name) or (
                len(catalog_name) > 5 and catalog_name in source_lower
            ):
                return exercise_id, "fuzzy"

        return None, "none"

    def validate_equipment_mapping(self, source_equipment: str, target_equipment: List[str]) -> Tuple[bool, List[str]]:
        """Validate equipment mapping is correct"""
        errors = []

        if not self.mapping_tables:
            return True, []

        equipment_mapping = self.mapping_tables.get("equipment_mapping", {}).get("mappings", {})

        # Handle null/empty equipment
        if not source_equipment or source_equipment.lower() == "null":
            expected_equipment = equipment_mapping.get("null", ["bodyweight"])
        else:
            expected_equipment = equipment_mapping.get(source_equipment.lower(), None)

        if expected_equipment is None:
            errors.append(f"No mapping found for equipment: {source_equipment}")
            return False, errors

        # Check if mapped equipment matches expected
        if set(target_equipment) != set(expected_equipment):
            errors.append(f"Equipment mapping mismatch: expected {expected_equipment}, got {target_equipment}")
            return False, errors

        return True, []

    def validate_muscle_mapping(
        self, primary_muscles: List[str], secondary_muscles: List[str], target_muscles: List[str]
    ) -> Tuple[bool, List[str]]:
        """Validate muscle mapping is correct"""
        errors = []

        if not self.mapping_tables:
            return True, []

        muscle_mapping = self.mapping_tables.get("muscle_mapping", {}).get("mappings", {})

        # Combine source muscles
        all_source_muscles = (primary_muscles or []) + (secondary_muscles or [])

        # Map each source muscle to target
        expected_muscles = set()
        for muscle in all_source_muscles:
            mapped_muscles = muscle_mapping.get(muscle.lower())
            if mapped_muscles:
                # mapped_muscles is a list, add all items
                expected_muscles.update(mapped_muscles)
            else:
                errors.append(f"No mapping found for muscle: {muscle}")

        # Check if target muscles match expected
        if set(target_muscles) != expected_muscles:
            errors.append(f"Muscle mapping mismatch: expected {sorted(expected_muscles)}, got {sorted(target_muscles)}")
            return False, errors

        return True, []

    def validate_cues_conversion(
        self, source_instructions: List[str], target_cues: List[str]
    ) -> Tuple[bool, List[str]]:
        """Validate cues conversion from instructions"""
        errors = []

        if not source_instructions and not target_cues:
            return True, []

        if not source_instructions and target_cues:
            errors.append("Target has cues but source has no instructions")
            return False, errors

        if source_instructions and not target_cues:
            errors.append("Source has instructions but target has no cues")
            return False, errors

        # Check reasonable cue count (should be 2-6 cues typically)
        if len(target_cues) < 2 or len(target_cues) > 6:
            errors.append(f"Unusual cue count: {len(target_cues)} (expected 2-6)")

        # Check that cues are reasonably concise (under 200 chars each)
        for i, cue in enumerate(target_cues):
            if len(cue) > 200:
                errors.append(f"Cue {i+1} too long: {len(cue)} chars")

        return len(errors) == 0, errors

    def validate_difficulty_mapping(
        self, source_level: str, target_difficulty: Optional[float]
    ) -> Tuple[bool, List[str]]:
        """Validate difficulty mapping is correct"""
        errors = []

        if not source_level:
            if target_difficulty is not None:
                errors.append("Source has no level but target has difficulty")
                return False, errors
            return True, []

        # Expected mappings based on migration plan
        level_mappings = {"beginner": 2.0, "intermediate": 5.0, "expert": 8.0}

        expected_difficulty = level_mappings.get(source_level.lower())

        if expected_difficulty is None:
            errors.append(f"Unknown source level: {source_level}")
            return False, errors

        if target_difficulty != expected_difficulty:
            errors.append(f"Difficulty mapping mismatch: expected {expected_difficulty}, got {target_difficulty}")
            return False, errors

        return True, []

    def validate_single_exercise(self, source_name: str, source_data: Dict[str, Any]) -> ExerciseValidationResult:
        """Validate a single exercise migration"""
        result = ExerciseValidationResult(source_name=source_name)

        # Find exercise in catalog
        exercise_id, match_type = self.find_exercise_in_catalog(source_name)
        result.target_id = exercise_id
        result.name_match_type = match_type
        result.found_in_catalog = exercise_id is not None

        if not result.found_in_catalog:
            result.data_quality_score = 0.0
            return result

        # Get target exercise data
        target_data = self.catalog_data["exercises"][exercise_id]

        # Validate equipment mapping
        source_equipment = source_data.get("equipment", "")
        target_equipment = target_data.get("equipment", [])
        result.equipment_mapping_valid, equipment_errors = self.validate_equipment_mapping(
            source_equipment, target_equipment
        )
        result.field_validation_errors.extend(equipment_errors)

        # Validate muscle mapping
        primary_muscles = source_data.get("primaryMuscles", [])
        secondary_muscles = source_data.get("secondaryMuscles", [])
        target_muscles = target_data.get("targetMuscles", [])
        result.muscle_mapping_valid, muscle_errors = self.validate_muscle_mapping(
            primary_muscles, secondary_muscles, target_muscles
        )
        result.field_validation_errors.extend(muscle_errors)

        # Validate cues conversion
        source_instructions = source_data.get("instructions", [])
        target_cues = target_data.get("cues", [])
        result.cues_conversion_valid, cues_errors = self.validate_cues_conversion(source_instructions, target_cues)
        result.field_validation_errors.extend(cues_errors)

        # Validate difficulty mapping
        source_level = source_data.get("level", "")
        target_difficulty = target_data.get("difficulty")
        result.difficulty_mapping_valid, difficulty_errors = self.validate_difficulty_mapping(
            source_level, target_difficulty
        )
        result.field_validation_errors.extend(difficulty_errors)

        # Calculate data quality score
        quality_factors = [
            result.equipment_mapping_valid,
            result.muscle_mapping_valid,
            result.cues_conversion_valid,
            result.difficulty_mapping_valid,
            len(result.field_validation_errors) == 0,
        ]
        result.data_quality_score = sum(quality_factors) / len(quality_factors)

        return result

    def run_verification(self) -> MigrationVerificationResults:
        """Run complete migration verification"""
        log.info("Starting migration verification...")

        results = MigrationVerificationResults(
            timestamp=time.strftime("%Y-%m-%d %H:%M:%S"),
            total_source_exercises=len(self.source_exercises),
            total_catalog_exercises=len(self.catalog_data.get("exercises", {})),
        )

        # Verify each source exercise
        for source_name, source_data in self.source_exercises.items():
            validation_result = self.validate_single_exercise(source_name, source_data)
            results.verification_results.append(validation_result)

            # Update counters
            if validation_result.found_in_catalog:
                results.successfully_migrated += 1
            else:
                results.missing_exercises += 1

            if validation_result.field_validation_errors:
                results.field_validation_errors += 1

            if not validation_result.equipment_mapping_valid:
                results.equipment_mapping_issues += 1

            if not validation_result.muscle_mapping_valid:
                results.muscle_mapping_issues += 1

            if not validation_result.cues_conversion_valid:
                results.cues_conversion_issues += 1

            if not validation_result.difficulty_mapping_valid:
                results.difficulty_mapping_issues += 1

        # Calculate overall success rate
        if results.total_source_exercises > 0:
            results.overall_success_rate = results.successfully_migrated / results.total_source_exercises

        # Generate data quality metrics
        quality_scores = [r.data_quality_score for r in results.verification_results if r.found_in_catalog]
        if quality_scores:
            results.data_quality_metrics = {
                "average_quality_score": sum(quality_scores) / len(quality_scores),
                "min_quality_score": min(quality_scores),
                "max_quality_score": max(quality_scores),
                "exercises_with_perfect_quality": sum(1 for s in quality_scores if s >= 1.0),
                "exercises_with_good_quality": sum(1 for s in quality_scores if s >= 0.8),
                "exercises_with_poor_quality": sum(1 for s in quality_scores if s < 0.5),
            }

        log.info(
            f"Verification complete: {results.successfully_migrated}/{results.total_source_exercises} exercises found"
        )
        return results

    def generate_audit_report(self, results: MigrationVerificationResults) -> Dict[str, Any]:
        """Generate detailed audit report"""
        migrated_exercises = []
        missing_exercises = []
        exercises_with_issues = []

        for result in results.verification_results:
            if result.found_in_catalog:
                migrated_exercises.append(
                    {
                        "source_name": result.source_name,
                        "target_id": result.target_id,
                        "match_type": result.name_match_type,
                        "data_quality_score": result.data_quality_score,
                        "has_issues": len(result.field_validation_errors) > 0,
                    }
                )

                if result.field_validation_errors:
                    exercises_with_issues.append(
                        {
                            "source_name": result.source_name,
                            "target_id": result.target_id,
                            "issues": result.field_validation_errors,
                            "equipment_valid": result.equipment_mapping_valid,
                            "muscle_valid": result.muscle_mapping_valid,
                            "cues_valid": result.cues_conversion_valid,
                            "difficulty_valid": result.difficulty_mapping_valid,
                        }
                    )
            else:
                missing_exercises.append({"source_name": result.source_name, "match_attempted": result.name_match_type})

        return {
            "audit_timestamp": results.timestamp,
            "summary": {
                "total_source_exercises": results.total_source_exercises,
                "successfully_migrated": results.successfully_migrated,
                "missing_exercises": results.missing_exercises,
                "exercises_with_validation_issues": len(exercises_with_issues),
            },
            "migrated_exercises": migrated_exercises,
            "missing_exercises": missing_exercises,
            "exercises_with_issues": exercises_with_issues,
            "validation_statistics": {
                "equipment_mapping_issues": results.equipment_mapping_issues,
                "muscle_mapping_issues": results.muscle_mapping_issues,
                "cues_conversion_issues": results.cues_conversion_issues,
                "difficulty_mapping_issues": results.difficulty_mapping_issues,
            },
            "data_quality_assessment": results.data_quality_metrics,
        }

    def save_results(self, results: MigrationVerificationResults, audit_report: Dict[str, Any]) -> None:
        """Save verification results and audit report"""
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

        # Save verification results
        verification_file = OUTPUT_DIR / "verification-report.json"
        verification_data = {
            "metadata": {
                "timestamp": results.timestamp,
                "total_source_exercises": results.total_source_exercises,
                "total_catalog_exercises": results.total_catalog_exercises,
                "verification_summary": {
                    "successfully_migrated": results.successfully_migrated,
                    "missing_exercises": results.missing_exercises,
                    "field_validation_errors": results.field_validation_errors,
                    "overall_success_rate": results.overall_success_rate,
                },
            },
            "validation_issues": {
                "equipment_mapping_issues": results.equipment_mapping_issues,
                "muscle_mapping_issues": results.muscle_mapping_issues,
                "cues_conversion_issues": results.cues_conversion_issues,
                "difficulty_mapping_issues": results.difficulty_mapping_issues,
            },
            "data_quality_metrics": results.data_quality_metrics,
            "detailed_results": [
                {
                    "source_name": r.source_name,
                    "target_id": r.target_id,
                    "found_in_catalog": r.found_in_catalog,
                    "name_match_type": r.name_match_type,
                    "data_quality_score": r.data_quality_score,
                    "validation_errors": r.field_validation_errors,
                    "equipment_mapping_valid": r.equipment_mapping_valid,
                    "muscle_mapping_valid": r.muscle_mapping_valid,
                    "cues_conversion_valid": r.cues_conversion_valid,
                    "difficulty_mapping_valid": r.difficulty_mapping_valid,
                }
                for r in results.verification_results
            ],
        }

        verification_file.write_text(json.dumps(verification_data, indent=2), encoding="utf-8")
        log.info(f"Saved verification results to: {verification_file}")

        # Save audit report
        audit_file = OUTPUT_DIR / "audit-report.json"
        audit_file.write_text(json.dumps(audit_report, indent=2), encoding="utf-8")
        log.info(f"Saved audit report to: {audit_file}")

    def print_summary(self, results: MigrationVerificationResults) -> None:
        """Print comprehensive verification summary"""
        print("\n" + "=" * 80)
        print("EXERCISE MIGRATION VERIFICATION RESULTS")
        print("=" * 80)

        print("\nMIGRATION OVERVIEW:")
        print(f"  Source exercises (free-exercise-db): {results.total_source_exercises:,}")
        print(f"  Current catalog exercises: {results.total_catalog_exercises:,}")
        print(f"  Successfully migrated: {results.successfully_migrated:,}")
        print(f"  Missing from catalog: {results.missing_exercises:,}")
        print(f"  Migration success rate: {results.overall_success_rate:.1%}")

        print("\nVALIDATION RESULTS:")
        print(f"  Exercises with validation errors: {results.field_validation_errors:,}")
        print(f"  Equipment mapping issues: {results.equipment_mapping_issues:,}")
        print(f"  Muscle mapping issues: {results.muscle_mapping_issues:,}")
        print(f"  Cues conversion issues: {results.cues_conversion_issues:,}")
        print(f"  Difficulty mapping issues: {results.difficulty_mapping_issues:,}")

        if results.data_quality_metrics:
            metrics = results.data_quality_metrics
            print("\nDATA QUALITY METRICS:")
            print(f"  Average quality score: {metrics.get('average_quality_score', 0):.2f}/1.0")
            print(f"  Exercises with perfect quality: {metrics.get('exercises_with_perfect_quality', 0):,}")
            print(f"  Exercises with good quality (≥80%): {metrics.get('exercises_with_good_quality', 0):,}")
            print(f"  Exercises with poor quality (<50%): {metrics.get('exercises_with_poor_quality', 0):,}")

        # Show some examples of missing exercises
        missing_examples = [r for r in results.verification_results if not r.found_in_catalog]
        if missing_examples:
            print("\nSAMPLE MISSING EXERCISES (first 10):")
            for i, result in enumerate(missing_examples[:10]):
                print(f"  {i+1}. {result.source_name}")

        # Show some examples of exercises with issues
        issue_examples = [r for r in results.verification_results if r.field_validation_errors]
        if issue_examples:
            print("\nSAMPLE EXERCISES WITH VALIDATION ISSUES (first 5):")
            for i, result in enumerate(issue_examples[:5]):
                print(f"  {i+1}. {result.source_name} -> {result.target_id}")
                for error in result.field_validation_errors[:2]:  # Show first 2 errors
                    print(f"     - {error}")

        print("\nRECOMMendations:")
        if results.missing_exercises > 0:
            print(f"  - Review {results.missing_exercises} missing exercises for potential manual addition")
        if results.field_validation_errors > 0:
            print(f"  - Fix {results.field_validation_errors} exercises with validation errors")
        if results.overall_success_rate < 0.8:
            print(
                f"  - Consider improving name matching algorithm (current success: {results.overall_success_rate:.1%})"
            )
        if results.data_quality_metrics.get("exercises_with_poor_quality", 0) > 0:
            print(
                f"  - Review {results.data_quality_metrics['exercises_with_poor_quality']} exercises with poor data quality"
            )

        if results.overall_success_rate >= 0.95 and results.field_validation_errors == 0:
            print("  - ✅ Migration appears highly successful with excellent data quality!")
        elif (
            results.overall_success_rate >= 0.8
            and results.field_validation_errors < results.total_source_exercises * 0.1
        ):
            print("  - ✅ Migration appears successful with good data quality.")
        else:
            print("  - ⚠️  Migration may need review due to success rate or data quality issues.")

        print("\n" + "=" * 80)


def main():
    """Main execution function"""
    verifier = ExerciseMigrationVerifier()

    # Load all data
    if not verifier.load_data():
        log.error("Failed to load catalog data")
        return 1

    if not verifier.load_source_exercises():
        log.error("Failed to load source exercises")
        return 1

    # Run verification
    results = verifier.run_verification()

    # Generate audit report
    audit_report = verifier.generate_audit_report(results)

    # Save results
    verifier.save_results(results, audit_report)

    # Print summary
    verifier.print_summary(results)

    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Verifies the migration from free-exercise-db was successful by validating field mappings, data quality, and completeness"
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s|%(name)s|%(levelname)s|%(filename)s:%(lineno)d - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    exit(main())
