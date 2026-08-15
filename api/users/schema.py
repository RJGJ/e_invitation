import strawberry

from .models import User


@strawberry.type
class UserType:
    id: strawberry.ID
    email: str
    name: str
    groups: list[str]

    @staticmethod
    def from_model(user: User) -> "UserType":
        return UserType(
            id=strawberry.ID(str(user.id)),
            email=user.email,
            name=user.name,
            groups=list(user.groups.values_list("name", flat=True)),
        )
