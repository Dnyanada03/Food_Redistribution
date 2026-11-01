from datetime import datetime, timedelta, timezone
from abc import ABC, abstractmethod
from typing import Tuple, List, Optional


class BaseFoodSafetyValidator(ABC):
    """
    Abstract interface for jurisdiction-specific food safety regulations.
    Allows injecting FDA (USA), FSSAI (India), or EFSA (EU) rules.
    """

    @abstractmethod
    def validate_safety_window(
        self,
        category: str,
        mfd: datetime,
        exp: datetime
    ) -> Tuple[bool, Optional[str]]:
        """Validates manufacturing and expiry dates."""
        pass

    @abstractmethod
    def get_allergen_warnings(
        self,
        allergen_text: Optional[str]
    ) -> List[str]:
        """Flags high-risk food allergens."""
        pass


class StandardFoodSafetyValidator(BaseFoodSafetyValidator):
    """
    Standard food safety checks:
    - Prepared meals: maximum 48 hours shelf life
    - Fresh bakery: maximum 5 days shelf life
    - Expiry must be in the future
    - Expiry must follow the manufacturing/preparation date
    """

    HIGH_RISK_ALLERGENS = [
        "peanut", "tree nut", "shellfish", "egg", "milk",
        "dairy", "soy", "wheat", "gluten", "fish"
    ]

    def validate_safety_window(
        self,
        category: str,
        mfd: datetime,
        exp: datetime
    ) -> Tuple[bool, Optional[str]]:

        # Interpret naive datetimes as UTC.
        # Prefer making the frontend/backend agree on timezone handling.
        if mfd.tzinfo is None:
            mfd = mfd.replace(tzinfo=timezone.utc)

        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)

        now = datetime.now(timezone.utc)

        if exp <= now:
            return False, "Expiry datetime must be strictly in the future."

        if exp <= mfd:
            return False, (
                "Expiry datetime must be after "
                "preparation/manufacturing datetime."
            )

        delta = exp - mfd

        if category == "prepared_meal" and delta > timedelta(hours=48):
            return False, (
                "Food safety limit: Prepared cooked meals cannot have "
                "an expiry exceeding 48 hours from preparation."
            )

        if category == "bakery" and delta > timedelta(days=5):
            return False, (
                "Food safety limit: Fresh bakery surplus cannot have "
                "an expiry exceeding 5 days."
            )

        return True, None

    def get_allergen_warnings(
        self,
        allergen_text: Optional[str]
    ) -> List[str]:
        if not allergen_text:
            return []

        lower = allergen_text.lower()

        return [
            allergen
            for allergen in self.HIGH_RISK_ALLERGENS
            if allergen in lower
        ]


# Active safety validator
safety_validator: BaseFoodSafetyValidator = StandardFoodSafetyValidator()