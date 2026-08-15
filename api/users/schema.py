import strawberry

from .models import User


@strawberry.type
class UserType:
    id: strawberry.ID
    email: str
    name: str
    is_admin: bool

    @staticmethod
    def from_model(user: User) -> "UserType":
        return UserType(
            id=strawberry.ID(str(user.id)),
            email=user.email,
            name=user.name,
            is_admin=user.is_admin,
        )
